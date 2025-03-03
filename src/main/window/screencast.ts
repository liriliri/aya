import { BrowserWindow } from 'electron'
import * as window from 'share/main/lib/window'
import { getScreencastStore } from '../lib/store'
import once from 'licia/once'
import { handleEvent } from 'share/main/lib/util'

const store = getScreencastStore()

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  initIpc()

  win = window.create({
    name: 'screencast',
    minWidth: 430,
    minHeight: 640,
    ...store.get('bounds'),
    onSavePos: () => window.savePos(win, store),
  })

  win.on('close', () => {
    win?.destroy()
    win = null
    const mainWin = window.getWin('main')
    if (mainWin) {
      mainWin.show()
    }
  })

  window.loadPage(win, { page: 'screencast' })
}

export function closeWin() {
  if (win) {
    win.close()
  }
}

const initIpc = once(() => {
  handleEvent('setScreencastStore', (name, val) => store.set(name, val))
  handleEvent('getScreencastStore', (name) => store.get(name))
  handleEvent('setScreencastAlwaysOnTop', (alwaysOnTop) => {
    if (win) {
      win.setAlwaysOnTop(alwaysOnTop)
    }
  })
})
