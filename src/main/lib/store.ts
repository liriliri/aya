import memoize from 'licia/memoize'
import FileStore from 'licia/FileStore'
import { getUserDataPath } from 'share/main/lib/util'

export const getMainStore = memoize(function () {
  return new FileStore(getUserDataPath('data/main.json'), {
    bounds: {
      width: 960,
      height: 640,
    },
  })
})

export const getScreencastStore = memoize(function () {
  return new FileStore(getUserDataPath('data/screencast.json'), {
    bounds: {
      width: 430,
      height: 640,
    },
    settings: {},
    alwaysOnTop: false,
  })
})

export const getDevicesStore = memoize(function () {
  return new FileStore(getUserDataPath('data/devices.json'), {
    bounds: {
      width: 960,
      height: 640,
    },
    remoteDevices: [],
  })
})

export const getAvdStore = memoize(function () {
  return new FileStore(getUserDataPath('data/avd.json'), {
    bounds: {
      width: 720,
      height: 480,
    },
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
