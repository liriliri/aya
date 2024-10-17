import { ipcMain, nativeTheme } from 'electron'
import { getSettingsStore } from './store'
import { getTheme } from './util'
import * as window from './window'

type Theme = 'system' | 'light' | 'dark'

const store = getSettingsStore()

export function get() {
  return getTheme()
}

function set(theme: Theme) {
  nativeTheme.themeSource = theme
}

export function init() {
  set(store.get('theme'))
  ipcMain.handle('getTheme', () => get())
  nativeTheme.on('updated', () => {
    if (nativeTheme.themeSource === 'system') {
      window.sendAll('updateTheme')
    }
  })
  store.on('change', (name, val) => {
    if (name === 'theme') {
      set(val)
      window.sendAll('updateTheme')
    }
  })
}
