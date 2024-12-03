import Adb, { Client, Device } from '@devicefarmer/adbkit'
import androidDeviceList from 'android-device-list'
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
import toNum from 'licia/toNum'
import now from 'licia/now'
import contain from 'licia/contain'
import * as window from './window'
import fs from 'fs-extra'
import { getSettingsStore } from './store'
import isWindows from 'licia/isWindows'
import isEmpty from 'licia/isEmpty'
import axios from 'axios'
import * as base from './adb/base'
import { shell, getPidNames, getProcesses } from './adb/base'
import * as logcat from './adb/logcat'
import {
  openLogcat,
  closeLogcat,
  resumeLogcat,
  pauseLogcat,
} from './adb/logcat'

const settingsStore = getSettingsStore()

let client: Client

async function getDevices() {
  let devices = await client.listDevices()
  devices = filter(devices, (device: Device) => device.type !== 'offline')

  return Promise.all(
    map(devices, async (device: Device) => {
      const properties = await client.getDevice(device.id).getProperties()

      let name = `${properties['ro.product.manufacturer']} ${properties['ro.product.model']}`
      const marketName = getMarketName(properties)
      if (marketName) {
        name = marketName
      }

      return {
        id: device.id,
        name,
      }
    })
  ).catch(() => [])
}

async function getOverview(deviceId: string) {
  const device = await client.getDevice(deviceId)
  const properties = await device.getProperties()
  const cpus = await getCpus(deviceId)

  return {
    name: getMarketName(properties) || properties['ro.product.name'],
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

function getMarketName(properties: types.PlainObj<string>) {
  const keys = ['ro.oppo.market.name', 'ro.config.marketing_name']
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    if (properties[key]) {
      return properties[key]
    }
  }

  const device = properties['ro.product.device']
  const model = properties['ro.product.model']

  let marketName = ''

  const devices: any[] = androidDeviceList.getDevicesByDeviceId(device)
  if (!isEmpty(devices)) {
    const deviceFilter = filter(devices, (device) => device.model === model)
    if (!isEmpty(deviceFilter)) {
      marketName = deviceFilter[0].name
    } else {
      marketName = devices[0].name
    }
  }

  return marketName
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

const getPackages = singleton(async (deviceId: string) => {
  const result: string = await shell(deviceId, 'pm list packages')

  return map(trim(result).split('\n'), (line) => line.slice(8))
})

const getWebviews = singleton(async (deviceId: string, pid: number) => {
  const webviews: any[] = []

  const result: string = await shell(deviceId, `cat /proc/net/unix`)

  const lines = result.split('\n')
  let line = ''
  for (let i = 0, len = lines.length; i < len; i++) {
    line = trim(lines[i])
    if (contain(line, `webview_devtools_remote_${pid}`)) {
      break
    }
  }

  if (!line) {
    return {
      port: 0,
      webviews,
    }
  }

  const socketNameMatch = line.match(/[^@]+@(.*?webview_devtools_remote_?.*)/)
  if (!socketNameMatch) {
    return {
      port: 0,
      webviews,
    }
  }

  const socketName = socketNameMatch[1]
  const remote = `localabstract:${socketName}`
  const port = await base.forwardTcp(deviceId, remote)
  const { data } = await axios.get(`http://127.0.0.1:${port}/json`)
  each(data, (item: any) => webviews.push(item))

  return {
    port,
    webviews,
  }
})

async function getTopActivity(deviceId: string) {
  const topActivity: string = await shell(deviceId, 'dumpsys activity')
  const lines = topActivity.split('\n')
  let line = ''
  for (let i = 0, len = lines.length; i < len; i++) {
    line = trim(lines[i])
    if (contain(line, 'top-activity')) {
      break
    }
  }

  if (!line) {
    return {
      name: '',
      pid: 0,
    }
  }

  const parts = line.split(/\s+/)
  const pid = parseInt(parts[parts.length - 2], 10)
  const pidNames = await getPidNames(deviceId)
  const name = pidNames[pid] || `pid-${pid}`

  return {
    name,
    pid,
  }
}

async function stopPackage(deviceId: string, pid: number) {
  await shell(deviceId, `am force-stop ${pid}`)
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

  base.setClient(client)
  logcat.setClient(client)

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
  handleEvent('getWebviews', getWebviews)
  handleEvent('getTopActivity', getTopActivity)
  handleEvent('getPerformance', getPerformance)
}
