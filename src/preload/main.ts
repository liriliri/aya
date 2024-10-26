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
  getOverview: (deviceId: string) => {
    return ipcRenderer.invoke('getOverview', deviceId)
  },
  createShell: (deviceId: string) => {
    return ipcRenderer.invoke('createShell', deviceId)
  },
  writeShell: (sessionId: string, data: string) => {
    return ipcRenderer.invoke('writeShell', sessionId, data)
  },
  resizeShell: (sessionId: string, cols: number, rows: number) => {
    return ipcRenderer.invoke('resizeShell', sessionId, cols, rows)
  },
  killShell: (sessionId: string) => ipcRenderer.invoke('killShell', sessionId),
  screencap: (deviceId: string) => ipcRenderer.invoke('screencap', deviceId),
  on: (event: string, cb: types.AnyFn) => ipcRenderer.on(event, cb),
  off: (event: string, cb: types.AnyFn) => ipcRenderer.off(event, cb),
}
