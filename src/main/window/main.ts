import { app, BrowserWindow } from 'electron'
import { getMainStore, getSettingsStore } from '../lib/store'
import { handleEvent } from '../lib/util'
import * as window from '../lib/window'
import log from '../../common/log'

const logger = log('mainWin')

const store = getMainStore()
const settingsStore = getSettingsStore()

let win: BrowserWindow | null = null

let isIpcInit = false

export function showWin() {
  logger.info('show')

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
  handleEvent('setMainStore', (name, val) => store.set(name, val))
  handleEvent('getMainStore', (name) => store.get(name))
  store.on('change', (name, val) => {
    window.sendAll('changeMainStore', name, val)
  })
  handleEvent('setSettingsStore', (name, val) => {
    settingsStore.set(name, val)
  })
  handleEvent('getSettingsStore', (name) => settingsStore.get(name))
  handleEvent('relaunch', () => {
    app.relaunch()
    app.exit()
  })
}
