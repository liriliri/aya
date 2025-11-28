import types from 'licia/types'
import uuid from 'licia/uuid'
import { Client } from '@devicefarmer/adbkit'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import singleton from 'licia/singleton'
import wire from '../wire'
import waitUntil from 'licia/waitUntil'
import { forwardTcp, getDeviceStore, setDeviceStore, shell } from './base'
import contain from 'licia/contain'
import log from 'share/common/log'
import { IPackageInfo, IpcGetFileUrl, IpcGetPackageInfos } from 'common/types'
import isEmpty from 'licia/isEmpty'
import isUndef from 'licia/isUndef'
import each from 'licia/each'
import startWith from 'licia/startWith'
import extend from 'licia/extend'
import toNum from 'licia/toNum'

const logger = log('server')

let client: Client

class AyaClient {
  private deviceId = ''
  private socket: any = null
  private resolves: Map<string, (value?: any) => void> = new Map()
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async sendMessage(
    method: string,
    params: types.PlainObj<any> = {}
  ): Promise<any> {
    if (!this.socket) {
      await this.connect()
    }

    const id = uuid()

    this.socket.write(
      wire.io.liriliri.aya.Request.encodeDelimited({
        id,
        method,
        params: JSON.stringify(params),
      }).finish()
    )

    return new Promise((resolve) => {
      this.resolves.set(id, resolve)
    })
  }
  private async connect(tryStart = true) {
    logger.info('connect')
    try {
      const device = client.getDevice(this.deviceId)
      const socket = await device.openLocal('localabstract:aya')
      let buf = Buffer.alloc(0)
      socket.on('readable', () => {
        const newBuf = socket.read()
        if (!newBuf) {
          return
        }
        buf = Buffer.concat([buf, newBuf])
        try {
          const message = wire.io.liriliri.aya.Response.decodeDelimited(buf)
          buf = Buffer.alloc(0)
          const { id, result } = message
          const resolve = this.resolves.get(id)
          if (resolve) {
            resolve(JSON.parse(result))
          }
        } catch {
          // ignore
        }
      })
      socket.on('end', () => (this.socket = null))
      this.socket = socket
    } catch {
      if (tryStart) {
        await this.push()
        await this.start()
        await waitUntil(this.isRunning, 10000, 100)
        await this.connect(false)
      }
    }
  }
  private isRunning = singleton(async () => {
    const result: string = await shell(this.deviceId, `cat /proc/net/unix`)
    return contain(result, '@aya')
  })
  private async push() {
    logger.info('push')
    const device = client.getDevice(this.deviceId)
    await device.push(
      resolveResources('aya.dex'),
      '/data/local/tmp/aya/aya.dex'
    )
  }
  private async start() {
    logger.info('start')
    const device = client.getDevice(this.deviceId)
    await device.shell(
      'CLASSPATH=/data/local/tmp/aya/aya.dex app_process /system/bin io.liriliri.aya.Server'
    )
  }
}

async function getAyaClient(deviceId: string): Promise<AyaClient> {
  let ayaClient = getDeviceStore(deviceId, 'ayaClient')
  if (!ayaClient) {
    ayaClient = new AyaClient(deviceId)
    setDeviceStore(deviceId, 'ayaClient', ayaClient)
  }
  return ayaClient
}

const getPackageInfos: IpcGetPackageInfos = singleton(async function (
  deviceId,
  packageNames
) {
  const client = await getAyaClient(deviceId)
  const result = await client.sendMessage('getPackageInfos', {
    packageNames,
  })
  const { packageInfos } = result
  const serverPort = await getFileServerPort(deviceId)
  if (!isEmpty(packageInfos)) {
    for (let i = 0, len = packageInfos.length; i < len; i++) {
      const info: IPackageInfo = packageInfos[i]
      if (info.icon) {
        info.icon = await getFileUrl(deviceId, info.icon, serverPort)
      }
    }
    if (isUndef(packageInfos[0].appSize)) {
      const packageDiskStats = await getPackageDiskStats(deviceId)
      for (let i = 0, len = packageInfos.length; i < len; i++) {
        const info: IPackageInfo = packageInfos[i]
        if (info.packageName && packageDiskStats[info.packageName]) {
          extend(info, packageDiskStats[info.packageName])
        } else {
          info.appSize = 0
          info.dataSize = 0
          info.cacheSize = 0
        }
      }
    }
  }
  return packageInfos
})

const getPackageDiskStats = async function (deviceId: string) {
  const diskStats = await shell(deviceId, 'dumpsys diskstats')
  const packageDiskStats: types.PlainObj<{
    appSize: number
    dataSize: number
    cacheSize: number
  }> = {}

  const packageNames: string[] = []
  const appSizes: string[] = []
  const dataSizes: string[] = []
  const cacheSizes: string[] = []

  function parseLine(line: string, prefix: string, arr: string[]) {
    if (!startWith(line, prefix)) {
      return
    }
    line = line.slice(prefix.length)
    arr.push(...JSON.parse(line))
  }
  each(diskStats.split('\n'), (line) => {
    parseLine(line, 'Package Names:', packageNames)
    parseLine(line, 'App Sizes:', appSizes)
    parseLine(line, 'App Data Sizes:', dataSizes)
    parseLine(line, 'Cache Sizes:', cacheSizes)
  })
  for (let i = 0, len = packageNames.length; i < len; i++) {
    const name = packageNames[i]
    packageDiskStats[name] = {
      appSize: toNum(appSizes[i]),
      dataSize: toNum(dataSizes[i]),
      cacheSize: toNum(cacheSizes[i]),
    }
  }

  return packageDiskStats
}

const getFileServerPort = singleton(async function (deviceId): Promise<number> {
  const client = await getAyaClient(deviceId)
  let port = getDeviceStore(deviceId, 'fileServerPort')
  if (port) {
    const { running } = await client.sendMessage('isFileServerRunning')
    if (running) {
      return port
    }
  }
  const result = await client.sendMessage('startFileServer')
  port = await forwardTcp(deviceId, `tcp:${result.port}`)
  setDeviceStore(deviceId, 'fileServerPort', port)
  return port
})

const getFileUrl: IpcGetFileUrl = async function (deviceId, path, port) {
  if (!port) {
    port = await getFileServerPort(deviceId)
  }

  return `http://127.0.0.1:${port}${encodeURI(path)}`
}

export async function init(c: Client) {
  client = c

  handleEvent('getPackageInfos', getPackageInfos)
  handleEvent('getFileUrl', getFileUrl)
}
