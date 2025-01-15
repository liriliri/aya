import path from 'path'
import contain from 'licia/contain'
import types from 'licia/types'
import { app, ipcMain, nativeTheme } from 'electron'
import { isDev } from '../../common/util'
import { fileURLToPath } from 'url'
import log from '../../common/log'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function resolve(p) {
  if (isDev()) {
    return path.resolve(__dirname, '../../', p)
  } else {
    return path.resolve(__dirname, '../', p)
  }
}

export function resolveUnpack(p) {
  const path = resolve(p)

  if (!isDev() && contain(path, 'app.asar')) {
    return path.replace('app.asar', 'app.asar.unpacked')
  }

  return path
}

export function getUserDataPath(p: string) {
  return path.resolve(app.getPath('appData'), 'aya', p)
}

export function getTheme() {
  if (nativeTheme.themeSource === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }

  return nativeTheme.themeSource
}

const logger = log('handleEvent')
export function handleEvent(channel: string, listener: types.AnyFn) {
  ipcMain.handle(channel, (event: any, ...args) => {
    logger.debug(channel, ...args)
    return listener(...args)
  })
}
