import { ipcMain } from 'electron'
import contextMenu from './contextMenu'

export function init() {
  ipcMain.handle(
    'showContextMenu',
    (_, x: number, y: number, template: any) => {
      contextMenu(x, y, template)
    }
  )
}
