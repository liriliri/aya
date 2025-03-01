import fs from 'fs-extra'
import memoize from 'licia/memoize'
import FileStore from 'licia/FileStore'
import Store from 'licia/Store'
import { getUserDataPath } from './util'

fs.exists(getUserDataPath('data'), function (exists) {
  if (!exists) {
    fs.mkdirp(getUserDataPath('data'))
  }
})

export const getMainStore = memoize(function () {
  return new FileStore(getUserDataPath('data/main.json'), {
    bounds: {
      width: 960,
      height: 640,
    },
  })
})

export const getTerminalStore = memoize(function () {
  return new FileStore(getUserDataPath('data/terminal.json'), {
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
  })
})

export const getDevicesStore = memoize(function () {
  return new FileStore(getUserDataPath('data/devices.json'), {
    bounds: {
      width: 960,
      height: 640,
    },
  })
})

export const getSettingsStore = memoize(function () {
  return new FileStore(getUserDataPath('data/settings.json'), {
    language: 'system',
    theme: 'system',
    adbPath: '',
  })
})

export const getMemStore = memoize(function () {
  return new Store({})
})
