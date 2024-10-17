import { BrowserWindow } from 'electron'
import { getMainStore } from '../lib/store'
import * as window from '../lib/window'

const store = getMainStore()

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  win = window.create({
    name: 'main',
    minWidth: 1280,
    minHeight: 850,
    ...store.get('bounds'),
    maximized: store.get('maximized'),
    onSavePos: () => window.savePos(win, store, true),
    menu: true,
  })

  window.loadPage(win)
}
