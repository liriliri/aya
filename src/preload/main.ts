import { ipcRenderer, OpenDialogOptions } from 'electron'
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
  openLogcat: (deviceId: string) => ipcRenderer.invoke('openLogcat', deviceId),
  closeLogcat: (logcatId: string) => {
    return ipcRenderer.invoke('closeLogcat', logcatId)
  },
  pauseLogcat: (logcatId: string) => {
    return ipcRenderer.invoke('pauseLogcat', logcatId)
  },
  resumeLogcat: (logcatId: string) => {
    return ipcRenderer.invoke('resumeLogcat', logcatId)
  },
  getProcesses: (deviceId: string) => {
    return ipcRenderer.invoke('getProcesses', deviceId)
  },
  stopPackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('stopPackage', deviceId, pkg)
  },
  getPackages: (deviceId: string) => {
    return ipcRenderer.invoke('getPackages', deviceId)
  },
  showContextMenu: (x: number, y: number, template: any) => {
    ipcRenderer.invoke(
      'showContextMenu',
      Math.round(x),
      Math.round(y),
      template
    )
  },
  showOpenDialog: (options: OpenDialogOptions = {}) => {
    return ipcRenderer.invoke('showOpenDialog', options)
  },
  relaunch: () => ipcRenderer.invoke('relaunch'),
  on: (event: string, cb: types.AnyFn) => {
    const listener = (e, ...args) => cb(...args)
    ipcRenderer.on(event, listener)
    return () => ipcRenderer.off(event, listener)
  },
}
