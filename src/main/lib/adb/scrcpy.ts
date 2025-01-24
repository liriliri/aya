import { Client } from '@devicefarmer/adbkit'
import { handleEvent, resolveUnpack } from '../util'
import { getDeviceStore, setDeviceStore } from './base'
import toStr from 'licia/toStr'
import log from '../../../common/log'

const logger = log('scrcpy')

let client: Client

class ScrcpyClient {
  private deviceId = ''
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async start(options: string[]) {
    logger.info('start', options)

    await this.push()

    const device = client.getDevice(this.deviceId)
    const args = options.join(' ')
    await device.shell(
      `CLASSPATH=/data/local/tmp/aya/scrcpy.jar app_process /system/bin com.genymobile.scrcpy.Server 3.1 ${args}`
    )
  }
  async push() {
    logger.info('push')

    const device = client.getDevice(this.deviceId)
    await device.push(
      resolveUnpack('server/scrcpy.jar'),
      '/data/local/tmp/aya/scrcpy.jar'
    )
  }
}

async function getScrcpyClient(deviceId: string): Promise<ScrcpyClient> {
  let scrcpyClient = getDeviceStore(deviceId, 'scrcpyClient')
  if (!scrcpyClient) {
    scrcpyClient = new ScrcpyClient(deviceId)
    setDeviceStore(deviceId, 'scrcpyClient', scrcpyClient)
  }
  return scrcpyClient
}

async function startScrcpy(deviceId: string, scid: number) {
  const client = await getScrcpyClient(deviceId)
  const { ScrcpyOptions3_1 } = await import('@yume-chan/scrcpy')
  const options = new ScrcpyOptions3_1({
    scid: toStr(scid),
    clipboardAutosync: false,
  })
  await client.start(options.serialize())
}

export async function init(c: Client) {
  client = c

  handleEvent('startScrcpy', startScrcpy)
}
