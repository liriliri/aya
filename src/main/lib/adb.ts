import Adb, { Client, Device } from '@devicefarmer/adbkit'
import { ipcMain } from 'electron'
import map from 'licia/map'

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

export function init() {
  client = Adb.createClient()

  ipcMain.handle('getDevices', getDevices)
}
