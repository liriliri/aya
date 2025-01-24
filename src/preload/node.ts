import net from 'node:net'

export default {
  createServer: function (listener: (socket: net.Socket) => void) {
    const tcpServer = net.createServer((socket) => {
      listener({
        on(event: string, listener: (...args: any[]) => void) {
          socket.on(event, listener)
        },
      } as any)
    })

    return {
      listern(port: number) {
        tcpServer.listen(port)
      },
    }
  },
}
