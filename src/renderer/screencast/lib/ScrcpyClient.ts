import strHash from 'licia/strHash'
import toStr from 'licia/toStr'
import type net from 'node:net'
import lpad from 'licia/lpad'
import Emitter from 'licia/Emitter'
import log from '../../../common/log'
import singleton from 'licia/singleton'

const logger = log('ScrcpyClient')

export default class ScrcpyClient extends Emitter {
  private deviceId: string
  private server?: net.Server
  private video: any
  private audio: any
  private started = false
  constructor(deviceId: string) {
    super()

    this.deviceId = deviceId
  }
  async getVideo() {
    await this.start()
    return this.video
  }
  private start = singleton(async () => {
    if (this.started) {
      return
    }
    const { deviceId } = this

    const { ScrcpyOptions3_1, ScrcpyVideoCodecId, ScrcpyAudioCodec } =
      await import('@yume-chan/scrcpy')
    const { ReadableStream, InspectStream, WritableStream, TransformStream } =
      await import('@yume-chan/stream-extra')
    const { WebCodecsVideoDecoder, InsertableStreamVideoFrameRenderer } =
      await import('@yume-chan/scrcpy-decoder-webcodecs')
    const { Float32PcmPlayer } = await import('@yume-chan/pcm-player')

    const scid = strHash(deviceId) % 999999
    const port = await main.reverseTcp(
      this.deviceId,
      `localabstract:scrcpy_${lpad(toStr(scid), 8, '0')}`
    )
    const options = new ScrcpyOptions3_1({
      scid: toStr(scid),
      audio: true,
      clipboardAutosync: false,
    })

    return new Promise((resolve) => {
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
        } else if (!this.audio) {
          logger.info('audio stream connected')
          this.audio = {}

          const metadata = await options.parseAudioStreamMetadata(
            readableStream
          )

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
              let controller: any
              const decoder = new AudioDecoder({
                error(error) {
                  logger.error('audio decoder error', error)
                  if (controller) {
                    controller.error(error)
                  }
                },
                output(output) {
                  const options: AudioDataCopyToOptions = {
                    format: 'f32',
                    planeIndex: 0,
                  }
                  const buffer = new Float32Array(
                    output.allocationSize(options) /
                      Float32Array.BYTES_PER_ELEMENT
                  )
                  output.copyTo(buffer, options)
                  if (controller) {
                    controller.enqueue(buffer)
                  }
                },
              })
              playbackStream
                .pipeThrough(
                  new TransformStream({
                    start(c) {
                      controller = c
                      decoder.configure({
                        codec: metadata.codec.webCodecId,
                        numberOfChannels: 2,
                        sampleRate: 48000,
                      })
                    },
                    transform(chunk: any) {
                      switch (chunk.type) {
                        case 'data':
                          if (chunk.data.length === 0) {
                            break
                          }
                          decoder.decode(
                            new EncodedAudioChunk({
                              type: 'key',
                              timestamp: 0,
                              data: chunk.data,
                            })
                          )
                      }
                    },
                    async flush() {
                      await decoder.flush()
                    },
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
        }

        if (this.video && this.video.decoder && this.audio && this.audio.type) {
          this.started = true
          resolve(null)
        }
      })
      server.listen(port)

      main.startScrcpy(deviceId, options.serialize())
    })
  })
  destroy() {
    if (this.server) {
      this.server.close()
    }
  }
}
