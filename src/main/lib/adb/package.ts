import { Client } from '@devicefarmer/adbkit'
import { getPidNames, shell } from './base'
import singleton from 'licia/singleton'
import map from 'licia/map'
import trim from 'licia/trim'
import contain from 'licia/contain'
import { handleEvent } from '../util'

let client: Client

const getPackages = singleton(async (deviceId: string, system = true) => {
  const result: string = await shell(
    deviceId,
    `pm list packages${system ? '' : ' -3'}`
  )

  return map(trim(result).split('\n'), (line) => line.slice(8))
})

async function stopPackage(deviceId: string, pkg: string) {
  await shell(deviceId, `am force-stop ${pkg}`)
}

async function clearPackage(deviceId: string, pkg: string) {
  const device = await client.getDevice(deviceId)
  await device.clear(pkg)
}

async function startPackage(deviceId: string, pkg: string) {
  const component = await getMainComponent(deviceId, pkg)
  const device = await client.getDevice(deviceId)
  await device.startActivity({
    component,
  })
}

async function installPackage(deviceId: string, apkPath: string) {
  const device = await client.getDevice(deviceId)
  await device.install(apkPath)
}

async function uninstallPackage(deviceId: string, pkg: string) {
  const device = await client.getDevice(deviceId)
  await device.uninstall(pkg)
}

async function getMainComponent(deviceId: string, pkg: string) {
  const result = await shell(
    deviceId,
    `dumpsys package ${pkg} | grep -A 1 MAIN`
  )
  const lines = result.split('\n')
  for (let i = 0, len = lines.length; i < len; i++) {
    const line = trim(lines[i])
    if (contain(line, `${pkg}/`)) {
      return line.substring(line.indexOf(`${pkg}/`), line.indexOf(' filter'))
    }
  }

  throw new Error('Failed to get main activity')
}

async function getTopPackage(deviceId: string) {
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

export async function init(c: Client) {
  client = c

  handleEvent('getPackages', getPackages)
  handleEvent('stopPackage', stopPackage)
  handleEvent('startPackage', startPackage)
  handleEvent('installPackage', installPackage)
  handleEvent('uninstallPackage', uninstallPackage)
  handleEvent('getTopPackage', getTopPackage)
  handleEvent('clearPackage', clearPackage)
}
