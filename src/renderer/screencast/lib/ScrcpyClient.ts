import strHash from 'licia/strHash'
import toStr from 'licia/toStr'
import type net from 'node:net'
import lpad from 'licia/lpad'
import Emitter from 'licia/Emitter'
import log from '../../../common/log'
import singleton from 'licia/singleton'
import {
  ScrcpyOptions3_1,
  ScrcpyVideoCodecId,
  ScrcpyAudioCodec,
} from '@yume-chan/scrcpy'
import {
  ReadableStream,
  InspectStream,
  WritableStream,
} from '@yume-chan/stream-extra'
import {
  WebCodecsVideoDecoder,
  InsertableStreamVideoFrameRenderer,
} from '@yume-chan/scrcpy-decoder-webcodecs'
import { Float32PcmPlayer } from '@yume-chan/pcm-player'
import Readiness from 'licia/Readiness'
import { OpusStream } from './AudioStream'

const logger = log('ScrcpyClient')

export default class ScrcpyClient extends Emitter {
  private deviceId: string
  private server?: net.Server
  private video: any
  private audio: any
  private started = false
  private options: ScrcpyOptions3_1
  private readiness = new Readiness()
  constructor(deviceId: string, options: ScrcpyOptions3_1) {
    super()

    this.options = options
    options.value.scid = toStr(strHash(deviceId) % 999999)
    this.deviceId = deviceId
  }
  async getVideo() {
    await this.start()
    return this.video
  }
  destroy() {
    if (this.server) {
      this.server.close()
    }
  }
  private start = singleton(async () => {
    if (this.started) {
      return
    }
    const { deviceId, options } = this

    const port = await main.reverseTcp(
      this.deviceId,
      `localabstract:scrcpy_${lpad(options.value.scid as string, 8, '0')}`
    )

    const server = node.createServer(async (socket) => {
      const readableStream = new ReadableStream<Uint8Array>({
        start(controller) {
          socket.on('data', (data) => {
            controller.enqueue(data)
          })
          socket.on('end', () => {
            logger.info('stream end')
            controller.close()
          })
          socket.on('error', (e) => {
            logger.error('stream error', e)
            controller.error(e)
          })
        },
        cancel() {
          socket.destroy()
        },
      })

      if (!this.video) {
        logger.info('video stream connected')
        this.video = {}
        await this.createVideo(readableStream)
      } else if (!this.audio) {
        logger.info('audio stream connected')
        this.audio = {}
        await this.createAudio(readableStream)
      }
    })
    server.listen(port)

    main.startScrcpy(deviceId, options.serialize())

    return this.readiness
      .ready(['video', 'audio'])
      .then(() => (this.started = true))
  })
  private async createVideo(readableStream: ReadableStream<Uint8Array>) {
    const { options } = this

    const { stream, metadata } = await options.parseVideoStreamMetadata(
      readableStream
    )

    logger.info('video metadata', metadata)

    let codec: any = 0
    switch (metadata.codec) {
      case ScrcpyVideoCodecId.H264:
        codec = ScrcpyVideoCodecId.H264
        break
    }
    const decoder = new WebCodecsVideoDecoder({
      codec,
      renderer: new InsertableStreamVideoFrameRenderer(),
    })

    this.video = {
      stream: stream
        .pipeThrough(options.createMediaStreamTransformer())
        .pipeThrough(
          new InspectStream((packet) => {
            if (packet.type === 'configuration') {
              logger.info('video configuration', packet.data)
            }
          })
        ),
      metadata,
      decoder,
    }

    this.readiness.signal('video')
  }
  private async createAudio(readableStream: ReadableStream<Uint8Array>) {
    const { options } = this

    const metadata = await options.parseAudioStreamMetadata(readableStream)

    logger.info('audio metadata', metadata)

    if (metadata.type !== 'success') {
      this.audio = metadata
    } else {
      this.audio = {
        ...metadata,
        stream: metadata.stream.pipeThrough(
          options.createMediaStreamTransformer()
        ),
      }

      // eslint-disable-next-line
      const [recordStream, playbackStream] = this.audio.stream.tee()

      let player: any
      if (metadata.codec === ScrcpyAudioCodec.Raw) {
        logger.info('audio codec raw')
      } else if (metadata.codec === ScrcpyAudioCodec.Opus) {
        logger.info('audio codec opus')
        player = new Float32PcmPlayer(48000, 2)
        playbackStream
          .pipeThrough(
            new OpusStream({
              codec: metadata.codec.webCodecId,
              numberOfChannels: 2,
              sampleRate: 48000,
            })
          )
          .pipeTo(
            new WritableStream({
              write: (chunk) => {
                player.feed(chunk)
              },
            })
          )

        player.start()
      }
    }

    this.readiness.signal('audio')
  }
}
