import { BrowserWindow } from 'electron'
import { getDevicesStore } from '../lib/store'
import * as window from 'share/main/lib/window'

const store = getDevicesStore()

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  win = window.create({
    name: 'devices',
    minWidth: 960,
    minHeight: 640,
    ...store.get('bounds'),
    onSavePos: () => window.savePos(win, store),
  })

  win.on('close', () => {
    win?.destroy()
    win = null
  })

  window.loadPage(win, { page: 'devices' })
}
