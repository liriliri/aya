import Adb, { Client, Device } from '@devicefarmer/adbkit'
import { resolveUnpack, handleEvent } from './util'
import map from 'licia/map'
import types from 'licia/types'
import filter from 'licia/filter'
import Emitter from 'licia/Emitter'
import isStrBlank from 'licia/isStrBlank'
import uniqId from 'licia/uniqId'
import each from 'licia/each'
import singleton from 'licia/singleton'
import trim from 'licia/trim'
import startWith from 'licia/startWith'
import * as window from './window'
import fs from 'fs-extra'
import { getSettingsStore } from './store'
import isWindows from 'licia/isWindows'

const settingsStore = getSettingsStore()

let client: Client

async function getDevices() {
  let devices = await client.listDevices()
  devices = filter(devices, (device: Device) => device.type !== 'offline')

  return Promise.all(
    map(devices, async (device: Device) => {
      const properties = await client.getDevice(device.id).getProperties()

      return {
        id: device.id,
        brand: properties['ro.product.brand'],
        model: properties['ro.product.model'],
      }
    })
  ).catch(() => [])
}

async function getOverview(deviceId: string) {
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
    serialNumber: properties['ro.serialno'] || '',
    ...(await getStorage(deviceId)),
    ...(await getMemory(deviceId)),
    ...(await getScreen(deviceId)),
  }
}

async function screencap(deviceId: string) {
  const device = await client.getDevice(deviceId)
  const data = await device.screencap()
  const buf = await Adb.util.readAll(data)

  return buf.toString('base64')
}

async function getScreen(deviceId: string) {
  const resolution = await shell(deviceId, 'wm size')
  const density = await shell(deviceId, 'wm density')

  return {
    resolution: trim(resolution.split(':')[1]),
    density: trim(density.split(':')[1]),
  }
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

async function getStorage(deviceId: string) {
  const storageInfo = await shell(deviceId, 'dumpsys diskstats')
  let storageTotal = 0
  let storageFree = 0

  const match = storageInfo.match(new RegExp('Data-Free: (\\d+)K / (\\d+)K'))
  if (match) {
    storageFree = parseInt(match[1], 10) * 1024
    storageTotal = parseInt(match[2], 10) * 1024
  }

  return {
    storageTotal,
    storageUsed: storageTotal - storageFree,
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

async function createShell(deviceId: string) {
  const device = await client.getDevice(deviceId)

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

class Logcat extends Emitter {
  private reader: any
  private paused = false
  private pidNames: types.PlainObj<string> = {}
  constructor(reader: any) {
    super()

    this.reader = reader
  }
  async init(deviceId: string) {
    const { reader } = this

    reader.on('entry', async (entry) => {
      if (this.paused) {
        return
      }
      if (!this.pidNames[entry.pid]) {
        await this.getPidNames(deviceId)
      }
      entry.package = this.pidNames[entry.pid] || `pid-${entry.pid}`
      this.emit('entry', entry)
    })
  }
  close() {
    this.reader.end()
  }
  pause() {
    this.paused = true
  }
  resume() {
    this.paused = false
  }
  private async getPidNames(deviceId: string) {
    const processes = await getProcesses(deviceId)
    const pidNames = {}
    each(processes, (process) => {
      pidNames[process.pid] = process.name
    })
    this.pidNames = pidNames
  }
}

const getPackages = singleton(async (deviceId: string) => {
  const result: string = await shell(deviceId, 'pm list packages')

  return map(trim(result).split('\n'), (line) => line.slice(8))
})

const getProcesses = singleton(async (deviceId: string) => {
  const columns = ['pid', '%cpu', 'time+', 'res', 'user', 'name', 'args']
  let command = 'top -b -n 1'
  each(columns, (column) => {
    command += ` -o ${column}`
  })

  const result: string = await shell(deviceId, command)
  let lines = result.split('\n')
  let start = 0
  for (let i = 0, len = lines.length; i < len; i++) {
    if (startWith(trim(lines[i]), 'PID')) {
      start = i + 1
      break
    }
  }
  lines = lines.slice(start)
  const processes: any[] = []
  each(lines, (line) => {
    line = trim(line)
    if (!line) {
      return
    }
    const parts = line.split(/\s+/)
    const process: any = {}
    each(columns, (column, index) => {
      if (column === 'args') {
        process[column] = parts.slice(index).join(' ')
      } else {
        process[column] = parts[index] || ''
      }
    })
    if (process.args === command) {
      return
    }
    processes.push(process)
  })

  return processes
})

async function stopPackage(deviceId: string, pid: number) {
  await shell(deviceId, `am force-stop ${pid}`)
}

const logcats: types.PlainObj<Logcat> = {}

async function openLogcat(deviceId: string) {
  const device = await client.getDevice(deviceId)
  const reader = await device.openLogcat({
    clear: true,
  })
  const logcat = new Logcat(reader)
  await logcat.init(deviceId)
  const logcatId = uniqId('logcat')
  logcat.on('entry', (entry) => {
    window.sendTo('main', 'logcatEntry', logcatId, entry)
  })
  logcats[logcatId] = logcat

  return logcatId
}

async function pauseLogcat(logcatId: string) {
  logcats[logcatId].pause()
}

async function resumeLogcat(logcatId: string) {
  logcats[logcatId].resume()
}

async function closeLogcat(logcatId: string) {
  logcats[logcatId].close()
  delete logcats[logcatId]
}

export async function init() {
  let bin = isWindows ? resolveUnpack('adb/adb.exe') : resolveUnpack('adb/adb')
  const adbPath = settingsStore.get('adbPath')
  if (adbPath === 'adb' || (!isStrBlank(adbPath) && fs.existsSync(adbPath))) {
    bin = adbPath
  }
  client = Adb.createClient({
    bin,
  })

  client.trackDevices().then((tracker) => {
    tracker.on('add', onDeviceChange)
    tracker.on('remove', onDeviceChange)
  })
  function onDeviceChange() {
    setTimeout(() => window.sendTo('main', 'changeDevice'), 2000)
  }

  handleEvent('createShell', createShell)
  handleEvent('writeShell', writeShell)
  handleEvent('resizeShell', resizeShell)
  handleEvent('killShell', killShell)

  handleEvent('openLogcat', openLogcat)
  handleEvent('closeLogcat', closeLogcat)
  handleEvent('pauseLogcat', pauseLogcat)
  handleEvent('resumeLogcat', resumeLogcat)

  handleEvent('getPackages', getPackages)
  handleEvent('stopPackage', stopPackage)

  handleEvent('getDevices', getDevices)
  handleEvent('getOverview', getOverview)
  handleEvent('screencap', screencap)
  handleEvent('getMemory', getMemory)
  handleEvent('getProcesses', getProcesses)
}
