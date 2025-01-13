import { Client } from '@devicefarmer/adbkit'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { handleEvent } from '../util'
import { shell } from 'electron'

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

async function openFile(deviceId: string, p: string) {
  const dest = path.join(os.tmpdir(), path.basename(p))
  await pullFile(deviceId, p, dest)
  shell.openPath(dest)
}

async function pushFile(deviceId: string, src: string, dest: string) {
  const device = await client.getDevice(deviceId)
  const transfer = await device.push(src, dest)

  return new Promise((resolve, reject) => {
    transfer.on('end', () => resolve(null))
    transfer.on('error', reject)
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
  handleEvent('pushFile', pushFile)
  handleEvent('readDir', readDir)
  handleEvent('openFile', openFile)
}
