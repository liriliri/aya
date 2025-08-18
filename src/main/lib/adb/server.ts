import types from 'licia/types'
import uuid from 'licia/uuid'
import { Client } from '@devicefarmer/adbkit'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import singleton from 'licia/singleton'
import wire from '../wire'
import waitUntil from 'licia/waitUntil'
import { getDeviceStore, setDeviceStore, shell } from './base'
import contain from 'licia/contain'
import log from 'share/common/log'
import { IpcGetPackageInfos } from '../../../common/types'

const logger = log('server')

let client: Client

class AyaClient {
  private deviceId = ''
  private socket: any = null
  private resolves: Map<string, (value?: any) => void> = new Map()
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async sendMessage(method: string, params: types.PlainObj<any> = {}) {
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
  const result: any = await client.sendMessage('getPackageInfos', {
    packageNames,
  })
  return result.packageInfos
})

export async function init(c: Client) {
  client = c

  handleEvent('getPackageInfos', getPackageInfos)
}
