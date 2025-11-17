import { Client, Forward, Reverse } from '@devicefarmer/adbkit'
import {
  IpcForward,
  IpcListForwards,
  IpcListReverses,
  IpcReverse,
} from 'common/types'
import map from 'licia/map'
import { handleEvent } from 'share/main/lib/util'

let client: Client

const listForwards: IpcListForwards = async function (deviceId) {
  const device = await client.getDevice(deviceId)
  const forwards = await device.listForwards()
  return map(forwards, (forward: Forward) => {
    return {
      local: forward.local,
      remote: forward.remote,
    }
  })
}

const forward: IpcForward = async function (deviceId, local, remote) {
  const device = await client.getDevice(deviceId)
  await device.forward(local, remote)
}

const listReverses: IpcListReverses = async function (deviceId) {
  const device = await client.getDevice(deviceId)
  const reverses = await device.listReverses()
  return map(reverses, (reverse: Reverse) => {
    return {
      local: reverse.local,
      remote: reverse.remote,
    }
  })
}

const reverse: IpcReverse = async function (deviceId, remote, local) {
  const device = await client.getDevice(deviceId)
  await device.reverse(remote, local)
}

export function init(c: Client) {
  client = c

  handleEvent('listForwards', listForwards)
  handleEvent('listReverses', listReverses)
  handleEvent('forward', forward)
  handleEvent('reverse', reverse)
}
