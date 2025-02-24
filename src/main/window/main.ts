import { app, BrowserWindow, session } from 'electron'
import { getMainStore, getSettingsStore } from '../lib/store'
import { handleEvent } from '../lib/util'
import * as window from '../lib/window'
import log from '../../common/log'
import once from 'licia/once'

const logger = log('mainWin')

const store = getMainStore()
const settingsStore = getSettingsStore()

let win: BrowserWindow | null = null

export function showWin() {
  logger.info('show')

  if (win) {
    win.focus()
    return
  }

  initIpc()

  win = window.create({
    name: 'main',
    minWidth: 960,
    minHeight: 640,
    ...store.get('bounds'),
    maximized: store.get('maximized'),
    onSavePos: () => window.savePos(win, store, true),
    menu: true,
  })

  win.on('close', (e) => {
    const screencastWin = window.getWin('screencast')
    if (screencastWin && screencastWin.isVisible()) {
      e.preventDefault()
      win?.hide()
    } else {
      app.quit()
    }
  })

  window.loadPage(win)
}

export function init() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ['ws://*/*'],
    },
    (details, callback) => {
      delete details.requestHeaders['Origin']
      callback({ requestHeaders: details.requestHeaders })
    }
  )
}

const initIpc = once(() => {
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
})
