import { app } from 'electron'
import Adb, { Client, Device } from '@devicefarmer/adbkit'
import androidDeviceList from 'android-device-list'
import { resolveUnpack, handleEvent } from 'share/main/lib/util'
import map from 'licia/map'
import types from 'licia/types'
import filter from 'licia/filter'
import isStrBlank from 'licia/isStrBlank'
import trim from 'licia/trim'
import startWith from 'licia/startWith'
import toNum from 'licia/toNum'
import contain from 'licia/contain'
import * as window from 'share/main/lib/window'
import fs from 'fs-extra'
import { getSettingsStore } from './store'
import isWindows from 'licia/isWindows'
import isEmpty from 'licia/isEmpty'
import * as base from './adb/base'
import { shell, getProcesses } from './adb/base'
import * as logcat from './adb/logcat'
import * as shellAdb from './adb/shell'
import * as server from './adb/server'
import * as scrcpy from './adb/scrcpy'
import * as packageAdb from './adb/package'
import * as file from './adb/file'
import * as fps from './adb/fps'
import * as webview from './adb/webview'
import * as port from './adb/port'
import { getCpuLoads, getCpus } from './adb/cpu'
import log from 'share/common/log'
import { IpcGetDevices } from '../../common/types'

const logger = log('adb')

const settingsStore = getSettingsStore()

let client: Client

const getDevices: IpcGetDevices = async function () {
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
        androidVersion: properties['ro.build.version.release'],
        sdkVersion: properties['ro.build.version.sdk'],
      }
    })
  ).catch(() => [])
}

async function getOverview(deviceId: string) {
  const device = await client.getDevice(deviceId)
  const properties = await device.getProperties()
  const cpus = await getCpus(deviceId)
  const [kernelVersion, fontScale, wifi] = await shell(deviceId, [
    'uname -r',
    'settings get system font_scale',
    'dumpsys wifi',
  ])

  let ssidMatch = wifi.match(/mWifiInfo\s+SSID: "?(.+?)"?,/)
  if (ssidMatch && ssidMatch[1] === '<unknown ssid>') {
    ssidMatch = null
  }
  let ip = ''
  let mac = ''
  const wlan0 = await shell(deviceId, 'ip addr show wlan0')
  const ipMatch = wlan0.match(/inet (\d+\.\d+\.\d+\.\d+)/)
  if (ipMatch) {
    ip = ipMatch[1]
  }
  const macMatch = wlan0.match(
    /link\/ether (([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))/
  )
  if (macMatch) {
    mac = macMatch[1]
  }

  return {
    name: getMarketName(properties) || properties['ro.product.name'],
    processor: properties['ro.product.board'] || '',
    abi: properties['ro.product.cpu.abi'],
    brand: properties['ro.product.brand'],
    model: properties['ro.product.model'],
    serialNum: properties['ro.serialno'] || '',
    cpuNum: cpus.length,
    kernelVersion,
    fontScale: fontScale === 'null' ? 0 : toNum(fontScale),
    wifi: ssidMatch ? ssidMatch[1] : '',
    ip,
    mac,
    ...(await getStorage(deviceId)),
    ...(await getMemory(deviceId)),
    ...(await getScreen(deviceId)),
  }
}

async function setFontScale(deviceId: string, scale: number) {
  await shell(deviceId, `settings put system font_scale ${scale}`)
}

function getMarketName(properties: types.PlainObj<string>) {
  const keys = [
    // Oppo
    'ro.oppo.market.name',
    // Huawei, Honor
    'ro.config.marketing_name',
    // OnePlus, Realme
    'ro.vendor.oplus.market.enname',
    // Vivo
    'ro.vivo.market.name',
    // Xiaomi, Redmi
    'ro.product.marketname',
    // Asus
    'ro.asus.product.mkt_name',
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

async function connectDevice(host: string, port?: number) {
  await client.connect(host, port)
}

async function disconnectDevice(host: string, port?: number) {
  await client.disconnect(host, port)
}

async function inputKey(deviceId: string, keyCode: number) {
  await base.shell(deviceId, `input keyevent ${keyCode}`)
}

export async function init() {
  logger.info('init')

  let bin = isWindows ? resolveUnpack('adb/adb.exe') : resolveUnpack('adb/adb')
  const adbPath = settingsStore.get('adbPath')
  if (adbPath === 'adb' || (!isStrBlank(adbPath) && fs.existsSync(adbPath))) {
    bin = adbPath
  }

  app.on('will-quit', async () => {
    if (settingsStore.get('killAdbWhenExit')) {
      logger.info('kill adb')
      await client.kill()
    }
  })

  client = Adb.createClient({
    bin,
  })
  client.trackDevices().then((tracker) => {
    tracker.on('add', onDeviceChange)
    tracker.on('remove', onDeviceChange)
    tracker.on('end', () => logger.info('tracker end'))
  })
  function onDeviceChange() {
    logger.info('device change')
    setTimeout(() => window.sendTo('main', 'changeDevice'), 2000)
  }

  base.init(client)
  logcat.init(client)
  shellAdb.init(client)
  server.init(client)
  scrcpy.init(client)
  packageAdb.init(client)
  file.init(client)
  fps.init()
  webview.init()
  port.init(client)

  handleEvent('getDevices', getDevices)
  handleEvent('getOverview', getOverview)
  handleEvent('setFontScale', setFontScale)
  handleEvent('screencap', screencap)
  handleEvent('getMemory', getMemory)
  handleEvent('getProcesses', getProcesses)
  handleEvent('getPerformance', getPerformance)
  handleEvent('getUptime', getUptime)
  handleEvent('connectDevice', connectDevice)
  handleEvent('disconnectDevice', disconnectDevice)
  handleEvent('inputKey', inputKey)
}
