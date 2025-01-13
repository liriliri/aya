import { Client } from '@devicefarmer/adbkit'
import fs from 'node:fs'
import { handleEvent } from '../util'
import map from 'licia/map'

let client: Client

async function pullFile(deviceId: string, path: string, dest: string) {
  const device = await client.getDevice(deviceId)
  const transfer = await device.pull(path)

  return new Promise((resolve, reject) => {
    try {
      const writable = fs.createWriteStream(dest)
      writable.on('finish', () => resolve(null))
      transfer.on('error', reject)
      transfer.pipe(writable)
    } catch (err) {
      reject(err)
    }
  })
}

async function readDir(deviceId: string, path: string) {
  const device = await client.getDevice(deviceId)
  const files: any[] = await device.readdir(path)

  return map(files, (file) => {
    return {
      name: file.name,
      directory: file.isDirectory(),
    }
  })
}

export async function init(c: Client) {
  client = c

  handleEvent('pullFile', pullFile)
  handleEvent('readDir', readDir)
}
