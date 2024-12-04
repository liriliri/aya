import { dialog, OpenDialogOptions, shell } from 'electron'
import contextMenu from './contextMenu'
import { handleEvent } from './util'

export function init() {
  handleEvent('showContextMenu', contextMenu)
  handleEvent('showOpenDialog', (options: OpenDialogOptions = {}) =>
    dialog.showOpenDialog(options)
  )
  handleEvent('openExternal', (url: string) => {
    shell.openExternal(url)
  })
}
