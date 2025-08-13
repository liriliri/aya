import memoize from 'licia/memoize'
import FileStore from 'licia/FileStore'
import { getUserDataPath } from 'share/main/lib/util'

export const getMainStore = memoize(function () {
  return new FileStore(getUserDataPath('data/main.json'), {})
})

export const getScreencastStore = memoize(function () {
  return new FileStore(getUserDataPath('data/screencast.json'), {
    settings: {},
    alwaysOnTop: false,
  })
})

export const getDevicesStore = memoize(function () {
  return new FileStore(getUserDataPath('data/devices.json'), {
    remoteDevices: [],
  })
})

export const getSettingsStore = memoize(function () {
  return new FileStore(getUserDataPath('data/settings.json'), {
    language: 'system',
    theme: 'system',
    useNativeTitlebar: false,
    adbPath: '',
    killAdbWhenExit: true,
  })
})
