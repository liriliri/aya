import { dialog, OpenDialogOptions, SaveDialogOptions, shell } from 'electron'
import contextMenu from './contextMenu'
import { handleEvent } from './util'
import log from '../../common/log'
import * as screencast from '../window/screencast'
import * as devices from '../window/devices'
import * as window from './window'
import { getMemStore } from './store'

const memStore = getMemStore()

const logger = log('ipc')

export function init() {
  logger.info('init')

  handleEvent('showScreencast', () => screencast.showWin())
  handleEvent('closeScreencast', () => screencast.closeWin())
  handleEvent('showDevices', () => devices.showWin())
  handleEvent('restartScreencast', () => {
    screencast.closeWin()
    screencast.showWin()
  })
  handleEvent('showContextMenu', contextMenu)
  handleEvent('showOpenDialog', (options: OpenDialogOptions = {}) =>
    dialog.showOpenDialog(options)
  )
  handleEvent('showSaveDialog', (options: SaveDialogOptions = {}) =>
    dialog.showSaveDialog(options)
  )
  handleEvent('openExternal', (url: string) => {
    shell.openExternal(url)
  })
  handleEvent('toggleDevTools', () => {
    const win = window.getFocusedWin()
    if (win) {
      win.webContents.toggleDevTools()
    }
  })
  handleEvent(
    'sendToWindow',
    (name: string, channel: string, ...args: any[]) => {
      window.sendTo(name, channel, ...args)
    }
  )

  handleEvent('setMemStore', (name, val) => memStore.set(name, val))
  handleEvent('getMemStore', (name) => memStore.get(name))
  memStore.on('change', (name, val) => {
    window.sendAll('changeMemStore', name, val)
  })
}
