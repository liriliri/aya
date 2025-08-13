import { BrowserWindow } from 'electron'
import { getDevicesStore, getSettingsStore } from '../lib/store'
import * as window from 'share/main/lib/window'
import once from 'licia/once'
import { handleEvent } from 'share/main/lib/util'
import { IpcGetStore, IpcSetStore } from 'share/common/types'

const store = getDevicesStore()
const settingsStore = getSettingsStore()

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  initIpc()

  win = window.create({
    name: 'devices',
    minWidth: 960,
    minHeight: 640,
    width: 960,
    height: 640,
    customTitlebar: !settingsStore.get('useNativeTitlebar'),
  })

  win.on('close', () => {
    win?.destroy()
    win = null
  })

  window.loadPage(win, { page: 'devices' })
}

const initIpc = once(() => {
  handleEvent('setDevicesStore', <IpcSetStore>(
    ((name, val) => store.set(name, val))
  ))
  handleEvent('getDevicesStore', <IpcGetStore>((name) => store.get(name)))
})
