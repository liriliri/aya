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
import sleep from 'licia/sleep'
import lowerCase from 'licia/lowerCase'
import toNum from 'licia/toNum'
import now from 'licia/now'
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
  const cpus = await getCpus(deviceId)

  let name = properties['ro.product.name']
  if (properties['ro.oppo.market.name']) {
    name = properties['ro.oppo.market.name']
  }

  return {
    name,
    processor: properties['ro.product.board'] || '',
    abi: properties['ro.product.cpu.abi'],
    brand: properties['ro.product.brand'],
    model: properties['ro.product.model'],
    androidVersion: properties['ro.build.version.release'],
    sdkVersion: properties['ro.build.version.sdk'],
    serialNum: properties['ro.serialno'] || '',
    cpuNum: cpus.length,
    ...(await getStorage(deviceId)),
    ...(await getMemory(deviceId)),
    ...(await getScreen(deviceId)),
  }
}

async function getPerformance(deviceId: string) {
  const cpus = await getCpus(deviceId)

  return {
    uptime: await getUptime(deviceId),
    cpus,
    cpuLoads: await getCpuLoads(deviceId, cpus),
    ...(await getMemory(deviceId)),
    ...(await getBattery(deviceId)),
    ...(await getFrames(deviceId)),
  }
}

async function getFrames(deviceId: string) {
  const result: string = await shell(deviceId, 'dumpsys SurfaceFlinger')
  let frames = 0
  const frameTime = now()
  const match = result.match(/flips=(\d+)/)
  if (match) {
    frames = toNum(match[1])
  }

  return {
    frames,
    frameTime,
  }
}

const DEFAULT_PERIOD = 50

async function getCpuLoads(deviceId: string, allCpus: any[], period = 0) {
  const cpuLoads: number[] = []
  if (!period) {
    period = DEFAULT_PERIOD
  }

  return new Promise(function (resolve) {
    sleep(period).then(async () => {
      const newAllCpus = await getCpus(deviceId, false)
      each(allCpus, (cpu, idx) => {
        cpuLoads[idx] = calculateCpuLoad(cpu, newAllCpus[idx])
      })
      resolve(cpuLoads)
    })
  })
}

function calculateCpuLoad(lastCpu, cpu) {
  const lastTimes = lastCpu.times
  const times = cpu.times
  const lastLoad =
    lastTimes.user +
    lastTimes.sys +
    lastTimes.nice +
    lastTimes.irq +
    lastTimes.iowait +
    lastTimes.softirq
  const lastTick = lastLoad + lastTimes.idle
  const load =
    times.user +
    times.sys +
    times.nice +
    times.irq +
    times.iowait +
    times.softirq
  const tick = load + times.idle

  return (load - lastLoad) / (tick - lastTick)
}

async function getCpus(deviceId: string, speed = true) {
  const result: string = await shell(deviceId, 'cat /proc/stat')
  const lines = result.split('\n')
  const cpus: any[] = []

  each(lines, (line) => {
    line = trim(line)
    if (!startWith(line, 'cpu')) {
      return
    }

    const parts = line.split(/\s+/)
    if (parts[0] === 'cpu') {
      return
    }

    const cpu: any = {}
    cpu.times = {
      user: toNum(parts[1]),
      nice: toNum(parts[2]),
      sys: toNum(parts[3]),
      idle: toNum(parts[4]),
      iowait: toNum(parts[5]),
      irq: toNum(parts[6]),
      softirq: toNum(parts[7]),
    }

    cpus.push(cpu)
  })

  if (speed) {
    const freqCmd = map(cpus, (cpu, idx) => {
      return `cat /sys/devices/system/cpu/cpu${idx}/cpufreq/scaling_cur_freq`
    }).join('\n')
    const freq: string = await shell(deviceId, freqCmd)
    const speeds: number[] = []
    each(freq.split('\n'), (line) => {
      line = trim(line)
      if (!line) {
        return
      }
      speeds.push(Math.floor(toNum(line) / 1000))
    })

    each(cpus, (cpu, idx) => {
      cpu.speed = speeds[idx]
    })
  }

  return cpus
}

async function getUptime(deviceId: string) {
  const result = await shell(deviceId, 'cat /proc/uptime')
  const [uptime] = result.split(' ')
  return Math.round(toNum(uptime) * 1000)
}

async function getBattery(deviceId: string) {
  const result = await shell(deviceId, 'dumpsys battery')

  return {
    batteryLevel: toNum(getPropValue('level', result)),
    batteryTemperature: toNum(getPropValue('temperature', result)),
    batteryVoltage: toNum(getPropValue('voltage', result)),
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

  const totalMatch = getPropValue('MemTotal', memInfo)
  let freeMatch = getPropValue('MemAvailable', memInfo)
  if (!freeMatch) {
    freeMatch = getPropValue('MemFree', memInfo)
  }
  if (totalMatch && freeMatch) {
    memTotal = parseInt(totalMatch, 10) * 1024
    memFree = parseInt(freeMatch, 10) * 1024
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
      if (!this.pidNames[entry.pid] && entry.pid !== 0) {
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
  let columns = ['pid', '%cpu', 'time+', 'res', 'user', 'name', 'args']
  let command = 'top -b -n 1'
  each(columns, (column) => {
    command += ` -o ${column}`
  })

  const result: string = await shell(deviceId, command)
  let lines = result.split('\n')
  let start = -1
  for (let i = 0, len = lines.length; i < len; i++) {
    if (startWith(trim(lines[i]), 'PID')) {
      start = i + 1
      break
    }
  }

  // older version of top command
  if (start < 0) {
    const result: string = await shell(deviceId, 'top -n 1')
    lines = result.split('\n')
    for (let i = 0, len = lines.length; i < len; i++) {
      const line = trim(lines[i])
      if (startWith(line, 'PID')) {
        columns = line.split(/\s+/)
        columns = map(columns, (column) => {
          column = lowerCase(column)
          if (column === 'cpu%') {
            column = '%cpu'
          } else if (column === 'uid') {
            column = 'user'
          } else if (column === 'rss') {
            column = 'res'
          }
          return column
        })
        start = i + 1
        break
      }
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

function getPropValue(key: string, str: string) {
  const lines = str.split('\n')
  for (let i = 0, len = lines.length; i < len; i++) {
    const line = trim(lines[i])
    if (startWith(line, key)) {
      return trim(line.replace(/.*:/, ''))
    }
  }

  return ''
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
  handleEvent('getPerformance', getPerformance)
}
