import { dialog, OpenDialogOptions, SaveDialogOptions, shell } from 'electron'
import contextMenu from './contextMenu'
import { handleEvent } from './util'

export function init() {
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
