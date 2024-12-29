import Adb, { Client, Device } from '@devicefarmer/adbkit'
import androidDeviceList from 'android-device-list'
import { resolveUnpack, handleEvent } from './util'
import map from 'licia/map'
import types from 'licia/types'
import filter from 'licia/filter'
import isStrBlank from 'licia/isStrBlank'
import each from 'licia/each'
import singleton from 'licia/singleton'
import trim from 'licia/trim'
import startWith from 'licia/startWith'
import toNum from 'licia/toNum'
import contain from 'licia/contain'
import * as window from './window'
import fs from 'fs-extra'
import { getSettingsStore } from './store'
import isWindows from 'licia/isWindows'
import isEmpty from 'licia/isEmpty'
import axios from 'axios'
import * as base from './adb/base'
import { shell, getProcesses } from './adb/base'
import * as logcat from './adb/logcat'
import * as shellAdb from './adb/shell'
import * as server from './adb/server'
import * as packageAdb from './adb/package'
import * as file from './adb/file'
import * as fps from './adb/fps'
import { getCpuLoads, getCpus } from './adb/cpu'

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
  const [kernelVersion, fontScale] = await shell(deviceId, [
    'uname -r',
    'settings get system font_scale',
  ])

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
    kernelVersion,
    fontScale: toNum(fontScale),
    ...(await getStorage(deviceId)),
    ...(await getMemory(deviceId)),
    ...(await getScreen(deviceId)),
  }
}

function getMarketName(properties: types.PlainObj<string>) {
  const keys = [
    'ro.oppo.market.name',
    'ro.config.marketing_name',
    'ro.vendor.oplus.market.enname',
  ]
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
    cpus,
    cpuLoads: await getCpuLoads(deviceId, cpus),
    ...(await getMemory(deviceId)),
    ...(await getBattery(deviceId)),
  }
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
  const [wmSize, wmDensity] = await shell(deviceId, ['wm size', 'wm density'])

  const physicalResolution = getPropValue('Physical size', wmSize)
  const physicalDensity = getPropValue('Physical density', wmDensity)

  const hasOverrideResolution = contain(wmSize, 'Override')
  const hasOverrideDensity = contain(wmDensity, 'Override')
  const resolution = hasOverrideResolution
    ? getPropValue('Override size', wmSize)
    : physicalResolution
  const density = hasOverrideDensity
    ? getPropValue('Override density', wmDensity)
    : physicalDensity

  return {
    resolution,
    physicalResolution,
    density,
    physicalDensity,
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
    return webviews
  }

  const socketNameMatch = line.match(/[^@]+@(.*?webview_devtools_remote_?.*)/)
  if (!socketNameMatch) {
    return webviews
  }

  const socketName = socketNameMatch[1]
  const remote = `localabstract:${socketName}`
  const port = await base.forwardTcp(deviceId, remote)
  const { data } = await axios.get(`http://127.0.0.1:${port}/json`)
  each(data, (item: any) => webviews.push(item))

  return webviews
})

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

  base.init(client)
  logcat.init(client)
  shellAdb.init(client)
  server.init(client)
  packageAdb.init(client)
  file.init(client)
  fps.init()

  function onDeviceChange() {
    setTimeout(() => window.sendTo('main', 'changeDevice'), 2000)
  }

  handleEvent('getDevices', getDevices)
  handleEvent('getOverview', getOverview)
  handleEvent('screencap', screencap)
  handleEvent('getMemory', getMemory)
  handleEvent('getProcesses', getProcesses)
  handleEvent('getWebviews', getWebviews)
  handleEvent('getPerformance', getPerformance)
  handleEvent('getUptime', getUptime)
}
