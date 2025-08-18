import { Client } from '@devicefarmer/adbkit'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import { getDeviceStore, setDeviceStore } from './base'
import log from 'share/common/log'

const logger = log('scrcpy')

let client: Client

class ScrcpyClient {
  private deviceId = ''
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async start(args: string[]) {
    await this.push()

    logger.info('start', args)

    const device = client.getDevice(this.deviceId)
    const socket = await device.shell(
      `CLASSPATH=/data/local/tmp/aya/scrcpy.jar app_process /system/bin com.genymobile.scrcpy.Server 3.1 ${args.join(
        ' '
      )}`
    )
    socket.on('readable', () => {
      const data = socket.read()
      if (data) {
        logger.info(data.toString())
      }
    })
  }
  async push() {
    logger.info('push')

    const device = client.getDevice(this.deviceId)
    await device.push(
      resolveResources('scrcpy.jar'),
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

async function startScrcpy(deviceId: string, args: string[]) {
  const client = await getScrcpyClient(deviceId)
  await client.start(args)
}

export async function init(c: Client) {
  client = c

  handleEvent('startScrcpy', startScrcpy)
}
