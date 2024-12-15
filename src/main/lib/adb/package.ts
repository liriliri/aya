import { Client } from '@devicefarmer/adbkit'
import { shell } from './base'
import singleton from 'licia/singleton'
import map from 'licia/map'
import trim from 'licia/trim'
import contain from 'licia/contain'
import { handleEvent } from '../util'

let client: Client

export const getPackages = singleton(
  async (deviceId: string, system = true) => {
    const result: string = await shell(
      deviceId,
      `pm list packages${system ? '' : ' -3'}`
    )

    return map(trim(result).split('\n'), (line) => line.slice(8))
  }
)

export async function stopPackage(deviceId: string, pkg: string) {
  await shell(deviceId, `am force-stop ${pkg}`)
}

export async function startPackage(deviceId: string, pkg: string) {
  const component = await getMainComponent(deviceId, pkg)
  const device = await client.getDevice(deviceId)
  await device.startActivity({
    component,
  })
}

export async function installPackage(deviceId: string, apkPath: string) {
  const device = await client.getDevice(deviceId)
  await device.install(apkPath)
}

export async function uninstallPackage(deviceId: string, pkg: string) {
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

export async function init(c: Client) {
  client = c

  handleEvent('getPackages', getPackages)
  handleEvent('stopPackage', stopPackage)
  handleEvent('startPackage', startPackage)
  handleEvent('installPackage', installPackage)
  handleEvent('uninstallPackage', uninstallPackage)
}
