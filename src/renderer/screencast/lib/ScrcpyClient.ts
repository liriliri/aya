import strHash from 'licia/strHash'
import toStr from 'licia/toStr'

export default class ScrcpyClient {
  private deviceId: string
  private server: any = null
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async start() {
    const { deviceId } = this

    const scid = strHash(deviceId) % 999999
    const port = await main.reverseTcp(
      this.deviceId,
      `localabstract:scrcpy_${toStr(scid).padStart(8, '0')}`
    )
    const server = node.createServer(function (socket) {
      socket.on('data', (data) => {
        console.log('Received:', data)
      })
    })
    server.listen(port)

    await main.startScrcpy(deviceId, scid)
  }
  destroy() {
    if (this.server) {
      this.server.close()
    }
  }
}
