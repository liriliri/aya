import path from 'path'
import { app, nativeTheme } from 'electron'

export function getUserDataPath(p: string) {
  return path.resolve(app.getPath('appData'), 'vivy', p)
}

export function getTheme() {
  if (nativeTheme.themeSource === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }

  return nativeTheme.themeSource
}
