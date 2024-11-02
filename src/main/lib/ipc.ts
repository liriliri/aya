import { dialog, ipcMain, OpenDialogOptions } from 'electron'
import contextMenu from './contextMenu'

export function init() {
  ipcMain.handle(
    'showContextMenu',
    (_, x: number, y: number, template: any) => {
      contextMenu(x, y, template)
    }
  )
  ipcMain.handle('showOpenDialog', (_, options: OpenDialogOptions = {}) =>
    dialog.showOpenDialog(options)
  )
}
