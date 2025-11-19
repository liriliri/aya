import { Client } from '@devicefarmer/adbkit'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { handleEvent } from 'share/main/lib/util'
import { shell as electronShell } from 'electron'
import { isRooted, shell } from './base'
import map from 'licia/map'
import filter from 'licia/filter'
import startWith from 'licia/startWith'
import contain from 'licia/contain'
import trim from 'licia/trim'
import each from 'licia/each'
import uuid from 'licia/uuid'
import { getPackages } from './package'
import {
  IpcCreateDir,
  IpcDeleteDir,
  IpcDeleteFile,
  IpcMoveFile,
  IpcOpenFile,
  IpcPullFile,
  IpcPushFile,
  IpcReadDir,
  IpcStatFile,
  TransferType,
} from 'common/types'
import * as window from 'share/main/lib/window'
import throttle from 'licia/throttle'

let client: Client

const pullFile: IpcPullFile = async function (deviceId, path, dest) {
  let tmpFilePath = ''
  if (startWith(path, '/data/data/')) {
    if (!(await isRooted(deviceId))) {
      tmpFilePath = '/data/local/tmp/' + uuid()
      await shell(deviceId, `touch "${tmpFilePath}"`)
      await fileShell(deviceId, 'cp', path, tmpFilePath)
      path = tmpFilePath
    }
  }

  const device = await client.getDevice(deviceId)
  const transfer = await device.pull(path)

  const id = uuid()
  const stat = await statFile(deviceId, path)
  window.sendTo(
    'main',
    'startTransfer',
    id,
    TransferType.Download,
    path,
    dest,
    stat.size
  )

  return new Promise((resolve, reject) => {
    try {
      const writable = fs.createWriteStream(dest)
      writable.on('finish', () => {
        if (tmpFilePath) {
          deleteFile(deviceId, tmpFilePath)
        }
        window.sendTo('main', 'finishTransfer', id)
        resolve()
      })
      transfer.on(
        'progress',
        throttle(({ bytesTransferred }) => {
          window.sendTo('main', 'updateTransfer', id, bytesTransferred)
        }, 500)
      )
      transfer.on('error', reject)
      transfer.pipe(writable)
    } catch (err) {
      reject(err)
    }
  })
}

export async function pullFileData(
  deviceId: string,
  path: string
): Promise<Buffer> {
  const device = await client.getDevice(deviceId)
  const transfer = await device.pull(path)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    transfer.on('data', (chunk) => {
      chunks.push(chunk)
    })
    transfer.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    transfer.on('error', reject)
  })
}

const openFile: IpcOpenFile = async function (deviceId, p) {
  const dest = path.join(os.tmpdir(), path.basename(p))
  await pullFile(deviceId, p, dest)
  electronShell.openPath(dest)
}

const deleteFile: IpcDeleteFile = async function (deviceId, path) {
  await fileShell(deviceId, 'rm', path)
}

const deleteDir: IpcDeleteDir = async function (deviceId, path) {
  await fileShell(deviceId, 'rm -rf', path)
}

const createDir: IpcCreateDir = async function (deviceId, path) {
  await fileShell(deviceId, 'mkdir -p', path)
}

const pushFile: IpcPushFile = async function (
  deviceId: string,
  src: string,
  dest: string
) {
  let tmpFilePath = ''
  if (startWith(dest, '/data/data/')) {
    if (!(await isRooted(deviceId))) {
      tmpFilePath = '/data/local/tmp/' + uuid()
    }
  }

  const device = await client.getDevice(deviceId)
  const transfer = await device.push(src, tmpFilePath || dest)

  const id = uuid()
  const stat = await fs.stat(src)
  window.sendTo(
    'main',
    'startTransfer',
    id,
    TransferType.Upload,
    src,
    dest,
    stat.size
  )

  return new Promise((resolve, reject) => {
    transfer.on('end', async () => {
      if (tmpFilePath) {
        await fileShell(deviceId, 'cp', tmpFilePath, dest)
        deleteFile(deviceId, tmpFilePath)
      }
      window.sendTo('main', 'finishTransfer', id)
      resolve()
    })
    transfer.on(
      'progress',
      throttle(({ bytesTransferred }) => {
        window.sendTo('main', 'updateTransfer', id, bytesTransferred)
      }, 500)
    )
    transfer.on('error', reject)
  })
}

const moveFile: IpcMoveFile = async function (deviceId, src, dest) {
  await fileShell(deviceId, 'mv', src, dest)
}

const readDir: IpcReadDir = async function (deviceId, path) {
  if (startWith(path, '/data/') && !startWith(path, '/data/local/tmp/')) {
    if (!(await isRooted(deviceId))) {
      return readDataDir(deviceId, path)
    }
  }

  const device = await client.getDevice(deviceId)
  const files: any[] = await device.readdir(path)

  const ret: any[] = []
  for (let i = 0, len = files.length; i < len; i++) {
    const file = files[i]
    const item: any = {
      name: file.name,
      directory: !file.isFile(),
      mtime: new Date(file.mtimeMs),
      mode: file.mode,
    }

    if (!item.directory) {
      item.size = file.size
    }

    ret.push(item)
  }

  return ret
}

async function readDataDir(deviceId: string, path: string) {
  if (startWith(path, '/data/app/')) {
    return readDataAppDir(deviceId, path)
  } else if (startWith(path, '/data/data/')) {
    return readDataDataDir(deviceId, path)
  }

  const stat = await statFile(deviceId, '/data')

  if (path === '/data/local/') {
    return [
      {
        name: 'tmp',
        directory: true,
        mtime: stat.mtime,
        mode: stat.mode,
        size: stat.size,
      },
    ]
  }

  return map(['data', 'app', 'local'], (name) => {
    return {
      name,
      directory: true,
      mtime: stat.mtime,
      mode: stat.mode,
      size: stat.size,
    }
  })
}

async function readDataAppDir(deviceId: string, path: string) {
  const packages = await shell(deviceId, 'pm list packages -f')
  const prefix = `package:${path}`
  const lines = filter(
    packages.split('\n'),
    (line) => trim(line) !== '' && contain(line, prefix)
  )
  const paths = map(lines, (line) => line.slice(prefix.length).split('/'))
  const stat = await statFile(deviceId, '/data')
  const ret: any[] = []
  for (let i = 0, len = paths.length; i < len; i++) {
    const segments = paths[i]
    if (segments.length > 1) {
      ret.push({
        name: segments[0],
        directory: true,
        mtime: stat.mtime,
        mode: stat.mode,
        size: stat.size,
      })
    } else {
      if (contain(segments[0], '.apk')) {
        const name = segments[0].split('.apk')[0] + '.apk'
        const stat = await statFile(deviceId, path + name)
        ret.push({
          name,
          directory: false,
          mtime: stat.mtime,
          mode: stat.mode,
          size: stat.size,
        })
      }
    }
  }

  return ret
}

async function readDataDataDir(deviceId: string, path: string) {
  const stat = await statFile(deviceId, '/data')
  if (path === '/data/data/') {
    const packages = await getPackages(deviceId)
    return map(packages, (pkg) => {
      return {
        name: pkg,
        directory: true,
        mtime: stat.mtime,
        mode: stat.mode,
        size: stat.size,
      }
    })
  }

  const ls = await fileShell(deviceId, `ls -al`, path)
  if (!contain(ls, 'not debuggable')) {
    const ret: any[] = []
    each(ls.split('\n'), (line) => {
      const item = parseLsLine(line)
      if (item) {
        ret.push(item)
      }
    })
    return ret
  }

  return []
}

const regLsLine =
  /^([drwxs-]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/
function parseLsLine(line: string) {
  line = trim(line)
  const match = line.match(regLsLine)
  if (!match) {
    return null
  }
  const name = match[8]
  if (name === '.' || name === '..') {
    return
  }
  return {
    name,
    directory: match[1][0] === 'd',
    mtime: new Date(`${match[6]} ${match[7]}`),
    mode: match[1],
    size: parseInt(match[5], 10),
  }
}

async function fileShell(
  deviceId: string,
  cmd: string,
  path: string,
  dest?: string
) {
  if (
    startWith(path, '/data/data/') ||
    (dest && startWith(dest, '/data/data/'))
  ) {
    if (!(await isRooted(deviceId))) {
      let segments: string[] = []
      if (dest && startWith(dest, '/data/data/')) {
        segments = dest.replace('/data/data/', '').split('/')
      } else {
        segments = path.replace('/data/data/', '').split('/')
      }
      const pkg = segments[0]
      return shell(
        deviceId,
        `run-as ${pkg} ${cmd} "${path}"${dest ? ` "${dest}"` : ''}`
      )
    }
  }

  return shell(deviceId, `${cmd} "${path}"`)
}

const statFile: IpcStatFile = async function (deviceId, path) {
  if (startWith(path, '/data/data/')) {
    if (!(await isRooted(deviceId))) {
      const ls = await fileShell(deviceId, 'ls -ld', path)
      const item = parseLsLine(trim(ls))
      if (!item) {
        throw new Error(`Failed to stat file: ${path}`)
      }
      return {
        size: item.size,
        mtime: item.mtime,
        directory: item.directory,
        mode: item.mode,
      }
    }
  }

  const device = await client.getDevice(deviceId)
  const stat = await device.stat(path)

  return {
    size: stat.size,
    mtime: new Date(stat.mtimeMs),
    directory: !stat.isFile(),
    mode: stat.mode,
  }
}

export async function init(c: Client) {
  client = c

  handleEvent('pullFile', pullFile)
  handleEvent('pushFile', pushFile)
  handleEvent('readDir', readDir)
  handleEvent('openFile', openFile)
  handleEvent('deleteFile', deleteFile)
  handleEvent('deleteDir', deleteDir)
  handleEvent('createDir', createDir)
  handleEvent('moveFile', moveFile)
  handleEvent('statFile', statFile)
}
