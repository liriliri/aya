import isIp from 'licia/isIp'
import contain from 'licia/contain'

export function isRemoteDevice(deviceId: string) {
  if (!contain(deviceId, ':')) {
    return false
  }

  return isIp.v4(deviceId.split(':')[0])
}
