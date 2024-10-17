import { ipcRenderer } from 'electron'
import types from 'licia/types'

export default {
  getTheme: () => ipcRenderer.invoke('getTheme'),
  on: (event: string, cb: types.AnyFn) => ipcRenderer.on(event, cb),
  off: (event: string, cb: types.AnyFn) => ipcRenderer.off(event, cb),
}
