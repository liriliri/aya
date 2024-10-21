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
  on: (event: string, cb: types.AnyFn) => ipcRenderer.on(event, cb),
  off: (event: string, cb: types.AnyFn) => ipcRenderer.off(event, cb),
}
