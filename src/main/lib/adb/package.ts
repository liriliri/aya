import { Client } from '@devicefarmer/adbkit'
import { shell } from './base'
import singleton from 'licia/singleton'
import map from 'licia/map'
import trim from 'licia/trim'
import contain from 'licia/contain'
import { handleEvent } from 'share/main/lib/util'
import {
  IpcClearPackage,
  IpcDisablePackage,
  IpcEnablePackage,
  IpcGetPackages,
  IpcGetTopPackage,
  IpcInstallPackage,
  IpcStartPackage,
  IpcStopPackage,
  IpcUninstallPackage,
} from 'common/types'

let client: Client

const getCurrentUser = singleton(async (deviceId: string) => {
  const result = await shell(deviceId, 'am get-current-user')
  return parseInt(result, 10)
})

export const getPackages = singleton(<IpcGetPackages>(async (
  deviceId,
  system = true
) => {
  const result: string = await shell(
    deviceId,
    `pm list packages${system ? '' : ' -3'} --user ${await getCurrentUser(
      deviceId
    )}`
  )

  return map(trim(result).split('\n'), (line) => line.slice(8))
}))

const stopPackage: IpcStopPackage = async function (deviceId, pkg) {
  await shell(deviceId, `am force-stop ${pkg}`)
}

const clearPackage: IpcClearPackage = async function (deviceId, pkg) {
  const device = await client.getDevice(deviceId)
  await device.clear(pkg)
}

const startPackage: IpcStartPackage = async function (deviceId, pkg) {
  const component = await getMainComponent(deviceId, pkg)
  const device = await client.getDevice(deviceId)
  await device.startActivity({
    component,
  })
}

const installPackage: IpcInstallPackage = async function (deviceId, apkPath) {
  const device = await client.getDevice(deviceId)
  await device.install(apkPath)
}

const uninstallPackage: IpcUninstallPackage = async function (deviceId, pkg) {
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

export const getTopPackage = singleton(<IpcGetTopPackage>(
  async function (deviceId) {
    const topActivity = await shell(deviceId, 'dumpsys activity')
    const lines = topActivity.split('\n')
    let line = ''
    for (let i = 0, len = lines.length; i < len; i++) {
      if (contain(lines[i], 'top-activity')) {
        line = trim(lines[i])
        break
      }
    }

    if (!line) {
      return {
        name: '',
        pid: 0,
      }
    }

    let parts = line.split(/\s+/)
    parts = parts[parts.length - 2].split(':')
    const pid = parseInt(parts[0], 10)
    let name = parts[1]
    if (contain(name, '/')) {
      name = name.split('/')[0]
    }

    return {
      name,
      pid,
    }
  }
))

const disablePackage: IpcDisablePackage = async function (deviceId, pkg) {
  await shell(deviceId, `pm disable-user ${pkg}`)
}

const enablePackage: IpcEnablePackage = async function (deviceId, pkg) {
  await shell(deviceId, `pm enable ${pkg}`)
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
  handleEvent('disablePackage', disablePackage)
  handleEvent('enablePackage', enablePackage)
}
