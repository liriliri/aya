import { dialog, OpenDialogOptions, SaveDialogOptions, shell } from 'electron'
import contextMenu from './contextMenu'
import { handleEvent } from './util'
import log from '../../common/log'

const logger = log('ipc')

export function init() {
  logger.info('init')

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
}
