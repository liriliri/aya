import strHash from 'licia/strHash'
import toStr from 'licia/toStr'
import type net from 'node:net'
import lpad from 'licia/lpad'
import Emitter from 'licia/Emitter'

export default class ScrcpyClient extends Emitter {
  private deviceId: string
  private server?: net.Server
  constructor(deviceId: string) {
    super()

    this.deviceId = deviceId
  }
  async start() {
    const { deviceId } = this

    const { ScrcpyOptions3_1 } = await import('@yume-chan/scrcpy')
    const { ReadableStream } = await import('@yume-chan/stream-extra')

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
      let videoStream: any

      const server = node.createServer(async function (socket) {
        if (!videoStream) {
          const { stream, metadata } = await options.parseVideoStreamMetadata(
            new ReadableStream({
              start(controller) {
                socket.on('data', (data) => {
                  controller.enqueue(data)
                })
                socket.on('end', () => {
                  controller.close()
                })
              },
            })
          )

          videoStream = {
            stream: stream.pipeThrough(options.createMediaStreamTransformer()),
            metadata,
          }
        }

        if (videoStream) {
          resolve({
            videoStream,
          })
        }
      })
      server.listen(port)

      main.startScrcpy(deviceId, options.serialize())
    })
  }
  destroy() {
    if (this.server) {
      this.server.close()
    }
  }
}
