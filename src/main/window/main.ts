import { BrowserWindow, ipcMain } from 'electron'
import { getMainStore, getSettingsStore } from '../lib/store'
import * as window from '../lib/window'

const store = getMainStore()
const settingsStore = getSettingsStore()

let win: BrowserWindow | null = null

let isIpcInit = false

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  if (!isIpcInit) {
    isIpcInit = true
    initIpc()
  }

  win = window.create({
    name: 'main',
    minWidth: 960,
    minHeight: 640,
    ...store.get('bounds'),
    maximized: store.get('maximized'),
    onSavePos: () => window.savePos(win, store, true),
    menu: true,
  })

  window.loadPage(win)
}

function initIpc() {
  ipcMain.handle('setSettingsStore', (_, name, val) => {
    settingsStore.set(name, val)
  })
  ipcMain.handle('getSettingsStore', (_, name) => settingsStore.get(name))
}
