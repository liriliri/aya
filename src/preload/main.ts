import { ipcRenderer } from 'electron'
import types from 'licia/types'

export default {
  getLanguage: () => ipcRenderer.invoke('getLanguage'),
  getTheme: () => ipcRenderer.invoke('getTheme'),
  getDevices: () => ipcRenderer.invoke('getDevices'),
  getMainStore: (name) => ipcRenderer.invoke('getMainStore', name),
  setMainStore: (name, val) => ipcRenderer.invoke('setMainStore', name, val),
  getSettingsStore: (name) => ipcRenderer.invoke('getSettingsStore', name),
  setSettingsStore: (name, val) => {
    return ipcRenderer.invoke('setSettingsStore', name, val)
  },
  createShell: (deviceId: string) =>
    ipcRenderer.invoke('createShell', deviceId),
  writeShell: (sessionId: string, data: string) =>
    ipcRenderer.invoke('writeShell', sessionId, data),
  resizeShell: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('resizeShell', sessionId, cols, rows),
  killShell: (sessionId: string) => ipcRenderer.invoke('killShell', sessionId),
  on: (event: string, cb: types.AnyFn) => ipcRenderer.on(event, cb),
  off: (event: string, cb: types.AnyFn) => ipcRenderer.off(event, cb),
}
