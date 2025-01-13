import { Client } from '@devicefarmer/adbkit'
import fs from 'node:fs'
import { handleEvent } from '../util'

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

  const ret: any[] = []
  for (let i = 0, len = files.length; i < len; i++) {
    const file = files[i]
    const item: any = {
      name: file.name,
      directory: !file.isFile(),
      mtime: new Date(file.mtimeMs),
    }

    if (!item.directory) {
      item.size = file.size
    }

    ret.push(item)
  }

  return ret
}

export async function init(c: Client) {
  client = c

  handleEvent('pullFile', pullFile)
  handleEvent('readDir', readDir)
}
