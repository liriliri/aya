import types from 'licia/types'
import { Client } from '@devicefarmer/adbkit'

let client: Client

class AyaClient {
  private deviceId = ''
  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
  async connect() {}
  async sendMessage(method: string, params: types.PlainObj<any>) {}
}

const ayaClients: types.PlainObj<AyaClient> = {}

async function getAyaClient(deviceId: string) {
  if (!ayaClients[deviceId]) {
    const ayaClient = new AyaClient(deviceId)
    await ayaClient.connect()
    ayaClients[deviceId] = ayaClient
  }
  return ayaClients[deviceId]
}

export async function getPackageInfos(
  deviceId: string,
  packageNames: string[]
) {
  const client = await getAyaClient(deviceId)
  return await client.sendMessage('getPackageInfos', {
    packageNames,
  })
}

export async function setClient(c: Client) {
  client = c
}
