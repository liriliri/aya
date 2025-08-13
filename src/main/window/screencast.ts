import { BrowserWindow } from 'electron'
import * as window from 'share/main/lib/window'
import { getScreencastStore, getSettingsStore } from '../lib/store'
import once from 'licia/once'
import { handleEvent } from 'share/main/lib/util'
import { IpcGetStore, IpcSetStore } from 'share/common/types'
import { IpcSetScreencastAlwaysOnTop } from '../../common/types'

const store = getScreencastStore()
const settingsStore = getSettingsStore()

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
    width: 430,
    height: 640,
    customTitlebar: !settingsStore.get('useNativeTitlebar'),
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
  handleEvent('setScreencastStore', <IpcSetStore>(
    ((name, val) => store.set(name, val))
  ))
  handleEvent('getScreencastStore', <IpcGetStore>((name) => store.get(name)))
  handleEvent('setScreencastAlwaysOnTop', <IpcSetScreencastAlwaysOnTop>((
    alwaysOnTop
  ) => {
    if (win) {
      win.setAlwaysOnTop(alwaysOnTop)
    }
  }))
})
