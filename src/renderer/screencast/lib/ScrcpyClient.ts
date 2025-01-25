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

    const { ScrcpyOptions3_1, ScrcpyVideoCodecId } = await import(
      '@yume-chan/scrcpy'
    )
    const { ReadableStream, InspectStream } = await import(
      '@yume-chan/stream-extra'
    )
    const { WebCodecsVideoDecoder, InsertableStreamVideoFrameRenderer } =
      await import('@yume-chan/scrcpy-decoder-webcodecs')

    const scid = strHash(deviceId) % 999999
    const port = await main.reverseTcp(
      this.deviceId,
      `localabstract:scrcpy_${lpad(toStr(scid), 8, '0')}`
    )
    const options = new ScrcpyOptions3_1({
      scid: toStr(scid),
      clipboardAutosync: false,
    })

    return new Promise((resolve) => {
      const server = node.createServer(async (socket) => {
        if (!this.video) {
          logger.info('video stream connected')
          this.video = {}

          const readableStream = new ReadableStream<Uint8Array>({
            start(controller) {
              socket.on('data', (data) => {
                controller.enqueue(data)
              })
              socket.on('end', () => {
                logger.info('video stream end')
                controller.close()
              })
              socket.on('error', (e) => {
                logger.error('video stream error', e)
                controller.error(e)
              })
            },
            cancel() {
              socket.destroy()
            },
          })

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
        }

        if (this.video && this.video.decoder) {
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
