import strHash from 'licia/strHash'
import toStr from 'licia/toStr'

export default class ScrcpyClient {
  private deviceId: string
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
    const tcpServer = node.createServer(function (socket) {
      socket.on('data', (data) => {
        console.log('Received:', data)
      })
    })
    tcpServer.listern(port)

    await main.startScrcpy(deviceId, scid)
  }
}
