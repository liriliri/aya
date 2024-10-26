import Adb, { Client, Device } from '@devicefarmer/adbkit'
import { ipcMain } from 'electron'
import map from 'licia/map'
import types from 'licia/types'
import Emitter from 'licia/Emitter'
import uniqId from 'licia/uniqId'
import * as window from './window'

let client: Client

async function getDevices() {
  const devices = await client.listDevices()

  return Promise.all(
    map(devices, async (device: Device) => {
      const properties = await client.getDevice(device.id).getProperties()

      return {
        id: device.id,
        brand: properties['ro.product.brand'],
        model: properties['ro.product.model'],
      }
    })
  )
}

async function getOverview(_, deviceId: string) {
  const device = await client.getDevice(deviceId)
  const properties = await device.getProperties()

  let name = properties['ro.product.name']
  if (properties['ro.oppo.market.name']) {
    name = properties['ro.oppo.market.name']
  }

  return {
    name,
    processor: properties['ro.product.board'],
    abi: properties['ro.product.cpu.abi'],
    brand: properties['ro.product.brand'],
    model: properties['ro.product.model'],
    androidVersion: properties['ro.build.version.release'],
    sdkVersion: properties['ro.build.version.sdk'],
    ...(await getMemory(deviceId)),
  }
}

async function screencap(_, deviceId: string) {
  const device = await client.getDevice(deviceId)
  const data = await device.screencap()
  const buf = await Adb.util.readAll(data)
  
  return buf.toString('base64')
}

async function getMemory(deviceId: string) {
  const memInfo = await shell(deviceId, 'cat /proc/meminfo')
  let memTotal = 0
  let memFree = 0

  const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/)
  const freeMatch = memInfo.match(/MemFree:\s+(\d+)/)
  if (totalMatch && freeMatch) {
    memTotal = parseInt(totalMatch[1], 10) * 1024
    memFree = parseInt(freeMatch[1], 10) * 1024
  }

  return {
    memTotal,
    memUsed: memTotal - memFree,
  }
}

async function shell(deviceId: string, cmd: string) {
  const device = await client.getDevice(deviceId)
  const socket = await device.shell(cmd)
  const output = await Adb.util.readAll(socket)
  return output.toString()
}

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
  constructor(connection: any) {
    super()

    this.connection = connection
  }
  async init() {
    const { connection } = this

    connection.write(Protocol.encodeData(Buffer.from('shell,v2,pty:')))
    const result = await connection.parser.readAscii(4)
    if (result !== Protocol.OKAY) {
      throw new Error('Failed to create shell')
    }

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
  }
  resize(cols: number, rows: number) {
    this.connection.socket.write(
      ShellProtocol.encodeData(
        ShellProtocol.WINDOW_SIZE_CHANGE,
        Buffer.from(`${rows}x${cols},0x0\0`)
      )
    )
  }
  write(data: string) {
    this.connection.socket.write(
      ShellProtocol.encodeData(ShellProtocol.STDIN, Buffer.from(data))
    )
  }
  kill() {
    this.connection.end()
  }
}

const ptys: types.PlainObj<AdbPty> = {}

async function createShell(_, id: string) {
  const device = await client.getDevice(id)

  const transport = await device.transport()
  const adbPty = new AdbPty(transport)
  await adbPty.init()
  const sessionId = uniqId('shell')
  adbPty.on('data', (data) => {
    window.sendTo('main', 'shellData', sessionId, data)
  })
  ptys[sessionId] = adbPty

  return sessionId
}

async function writeShell(_, sessionId: string, data: string) {
  ptys[sessionId].write(data)
}

async function resizeShell(_, sessionId: string, cols: number, rows: number) {
  ptys[sessionId].resize(cols, rows)
}

async function killShell(_, sessionId: string) {
  ptys[sessionId].kill()
  delete ptys[sessionId]
}

export function init() {
  client = Adb.createClient()

  ipcMain.handle('getDevices', getDevices)
  ipcMain.handle('getOverview', getOverview)
  ipcMain.handle('createShell', createShell)
  ipcMain.handle('writeShell', writeShell)
  ipcMain.handle('resizeShell', resizeShell)
  ipcMain.handle('killShell', killShell)
  ipcMain.handle('screencap', screencap)
}
