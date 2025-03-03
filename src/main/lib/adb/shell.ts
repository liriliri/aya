import types from 'licia/types'
import Emitter from 'licia/Emitter'
import uniqId from 'licia/uniqId'
import * as window from 'share/main/lib/window'
import { Client } from '@devicefarmer/adbkit'
import { handleEvent } from 'share/main/lib/util'

let client: Client

class ShellProtocol {
  static STDIN = 0
  static STDOUT = 1
  static STDERR = 2
  static EXIT = 3
  static CLOSE_STDIN = 4
  static WINDOW_SIZE_CHANGE = 5

  static encodeData(id, data) {
    data = Buffer.from(data, 'utf8')
    const buf = Buffer.alloc(5 + data.length)
    buf.writeUInt8(id, 0)
    buf.writeUInt32LE(data.length, 1)
    data.copy(buf, 5)

    return buf
  }

  static decodeData(buf) {
    const result: Array<{
      id: number
      data: Buffer
    }> = []

    for (let i = 0, len = buf.length; i < len; ) {
      const id = buf.readUInt8(i)
      const len = buf.readUInt32LE(i + 1)
      const data = buf.slice(i + 5, i + 5 + len)
      result.push({
        id,
        data,
      })
      i += 5 + len
    }

    return result
  }
}

class Protocol {
  static OKAY = 'OKAY'

  static encodeLength(length) {
    return length.toString(16).padStart(4, '0').toUpperCase()
  }

  static encodeData(data) {
    const len = Protocol.encodeLength(data.length)
    return Buffer.concat([Buffer.from(len), data])
  }
}

class AdbPty extends Emitter {
  private connection: any
  private useV2 = true
  constructor(connection: any) {
    super()

    this.connection = connection
  }
  async init(useV2 = true) {
    const { connection } = this

    this.useV2 = useV2
    const protocol = useV2 ? 'shell,v2:' : 'shell:'
    connection.write(Protocol.encodeData(Buffer.from(protocol)))
    const result = await connection.parser.readAscii(4)
    if (result !== Protocol.OKAY) {
      throw new Error('Failed to create shell')
    }

    if (useV2) {
      const { socket } = connection
      socket.on('readable', () => {
        const buf = socket.read()
        if (buf) {
          const packets = ShellProtocol.decodeData(buf)
          for (let i = 0, len = packets.length; i < len; i++) {
            const { id, data } = packets[i]
            if (id === ShellProtocol.STDOUT) {
              this.emit('data', data.toString('utf8'))
            }
          }
        }
      })
    } else {
      const { socket } = connection
      socket.on('readable', () => {
        const buf = socket.read()
        if (buf) {
          this.emit('data', buf.toString('utf8'))
        }
      })
    }
  }
  resize(cols: number, rows: number) {
    if (this.useV2) {
      this.connection.socket.write(
        ShellProtocol.encodeData(
          ShellProtocol.WINDOW_SIZE_CHANGE,
          Buffer.from(`${rows}x${cols},0x0\0`)
        )
      )
    }
  }
  write(data: string) {
    if (this.useV2) {
      this.connection.socket.write(
        ShellProtocol.encodeData(ShellProtocol.STDIN, Buffer.from(data))
      )
    } else {
      this.connection.socket.write(Buffer.from(data))
    }
  }
  kill() {
    this.connection.end()
  }
}

const ptys: types.PlainObj<AdbPty> = {}

async function createShell(deviceId: string) {
  const device = await client.getDevice(deviceId)

  const transport = await device.transport()
  let adbPty = new AdbPty(transport)
  try {
    await adbPty.init()
    /* eslint-disable @typescript-eslint/no-unused-vars */
  } catch (e) {
    adbPty.kill()
    const transport = await device.transport()
    adbPty = new AdbPty(transport)
    await adbPty.init(false)
  }
  const sessionId = uniqId('shell')
  adbPty.on('data', (data) => {
    window.sendTo('main', 'shellData', sessionId, data)
  })
  ptys[sessionId] = adbPty

  return sessionId
}

async function writeShell(sessionId: string, data: string) {
  ptys[sessionId].write(data)
}

async function resizeShell(sessionId: string, cols: number, rows: number) {
  ptys[sessionId].resize(cols, rows)
}

async function killShell(sessionId: string) {
  ptys[sessionId].kill()
  delete ptys[sessionId]
}

export function init(c: Client) {
  client = c

  handleEvent('createShell', createShell)
  handleEvent('writeShell', writeShell)
  handleEvent('resizeShell', resizeShell)
  handleEvent('killShell', killShell)
}
