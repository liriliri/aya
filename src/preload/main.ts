import { ipcRenderer, OpenDialogOptions, SaveDialogOptions } from 'electron'
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
  showScreencast: () => ipcRenderer.invoke('showScreencast'),
  closeScreencast: () => ipcRenderer.invoke('closeScreencast'),
  getOverview: (deviceId: string) => {
    return ipcRenderer.invoke('getOverview', deviceId)
  },
  setFontScale: (deviceId: string, scale: number) => {
    return ipcRenderer.invoke('setFontScale', deviceId, scale)
  },
  getPerformance: (deviceId: string) => {
    return ipcRenderer.invoke('getPerformance', deviceId)
  },
  getUptime: (deviceId: string) => ipcRenderer.invoke('getUptime', deviceId),
  getFps: (deviceId: string, pkg: string) =>
    ipcRenderer.invoke('getFps', deviceId, pkg),
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
  getWebviews: (deviceId: string, pid: number) => {
    return ipcRenderer.invoke('getWebviews', deviceId, pid)
  },
  getTopPackage: (deviceId: string) => {
    return ipcRenderer.invoke('getTopPackage', deviceId)
  },
  stopPackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('stopPackage', deviceId, pkg)
  },
  clearPackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('clearPackage', deviceId, pkg)
  },
  startPackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('startPackage', deviceId, pkg)
  },
  installPackage: (deviceId: string, apkPath: string) => {
    return ipcRenderer.invoke('installPackage', deviceId, apkPath)
  },
  uninstallPackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('uninstallPackage', deviceId, pkg)
  },
  getPackages: (deviceId: string, system?: boolean) => {
    return ipcRenderer.invoke('getPackages', deviceId, system)
  },
  getPackageInfos: (deviceId: string, packageNames: string[]) => {
    return ipcRenderer.invoke('getPackageInfos', deviceId, packageNames)
  },
  disablePackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('disablePackage', deviceId, pkg)
  },
  enablePackage: (deviceId: string, pkg: string) => {
    return ipcRenderer.invoke('enablePackage', deviceId, pkg)
  },
  pullFile: (deviceId: string, path: string, dest: string) => {
    return ipcRenderer.invoke('pullFile', deviceId, path, dest)
  },
  pushFile: (deviceId: string, src: string, dest: string) => {
    return ipcRenderer.invoke('pushFile', deviceId, src, dest)
  },
  openFile: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('openFile', deviceId, path)
  },
  deleteFile: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('deleteFile', deviceId, path)
  },
  deleteDir: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('deleteDir', deviceId, path)
  },
  createDir: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('createDir', deviceId, path)
  },
  readDir: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('readDir', deviceId, path)
  },
  statFile: (deviceId: string, path: string) => {
    return ipcRenderer.invoke('statFile', deviceId, path)
  },
  moveFile: (deviceId: string, src: string, dest: string) => {
    return ipcRenderer.invoke('moveFile', deviceId, src, dest)
  },
  connectDevice: (host: string, port?: number) => {
    return ipcRenderer.invoke('connectDevice', host, port)
  },
  disconnectDevice: (host: string, port?: number) => {
    return ipcRenderer.invoke('disconnectDevice', host, port)
  },
  startScrcpy: (deviceId: string, args: string[]) => {
    return ipcRenderer.invoke('startScrcpy', deviceId, args)
  },
  reverseTcp: (deviceId: string, remote: string) => {
    return ipcRenderer.invoke('reverseTcp', deviceId, remote)
  },
  inputKey: (deviceId: string, keyCode: number) => {
    return ipcRenderer.invoke('inputKey', deviceId, keyCode)
  },
  openExternal: (url: string) => ipcRenderer.invoke('openExternal', url),
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
  showSaveDialog: (options: SaveDialogOptions = {}) => {
    return ipcRenderer.invoke('showSaveDialog', options)
  },
  getLogs: () => ipcRenderer.invoke('getLogs'),
  clearLogs: () => ipcRenderer.invoke('clearLogs'),
  relaunch: () => ipcRenderer.invoke('relaunch'),
  on: (event: string, cb: types.AnyFn) => {
    const listener = (e, ...args) => cb(...args)
    ipcRenderer.on(event, listener)
    return () => ipcRenderer.off(event, listener)
  },
}
