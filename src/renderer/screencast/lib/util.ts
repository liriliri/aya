import type net from 'node:net'
import {
  Consumable,
  ReadableStream,
  WritableStream,
} from '@yume-chan/stream-extra'

export function socketToReadableStream(socket: net.Socket) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      socket.on('data', (data) => {
        controller.enqueue(data)
      })
      socket.on('end', () => {
        controller.close()
      })
      socket.on('error', (e) => {
        controller.error(e)
      })
    },
    cancel() {
      socket.destroy()
    },
  })
}

export function socketToWritableStream(socket: net.Socket) {
  return new WritableStream<Consumable<Uint8Array>>({
    write(chunk) {
      return new Promise((resolve, reject) => {
        socket.write(chunk.value, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
    close() {
      socket.end()
    },
    abort() {
      socket.destroy()
    },
  })
}
