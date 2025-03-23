import {
  IpcDumpWindowHierarchy,
  IpcForward,
  IpcGetDevices,
  IpcGetFps,
  IpcGetLogs,
  IpcListForwards,
  IpcListReverses,
  IpcReverse,
  IpcSetScreencastAlwaysOnTop,
} from '../common/types'
import { ipcRenderer } from 'electron'
import { IpcGetStore, IpcSetStore } from 'share/common/types'
import mainObj from 'share/preload/main'
import { invoke } from 'share/preload/util'

export default Object.assign(mainObj, {
  getDevices: invoke<IpcGetDevices>('getDevices'),
  getMainStore: invoke<IpcGetStore>('getMainStore'),
  setMainStore: invoke<IpcSetStore>('setMainStore'),
  getScreencastStore: invoke<IpcGetStore>('getScreencastStore'),
  setScreencastStore: invoke<IpcSetStore>('setScreencastStore'),
  setScreencastAlwaysOnTop: invoke<IpcSetScreencastAlwaysOnTop>(
    'setScreencastAlwaysOnTop'
  ),
  getSettingsStore: invoke<IpcGetStore>('getSettingsStore'),
  setSettingsStore: invoke<IpcSetStore>('setSettingsStore'),
  showScreencast: invoke('showScreencast'),
  closeScreencast: invoke('closeScreencast'),
  restartScreencast: invoke('restartScreencast'),
  showDevices: invoke('showDevices'),
  getOverview: invoke('getOverview'),
  setFontScale: invoke('setFontScale'),
  getPerformance: invoke('getPerformance'),
  getUptime: invoke('getUptime'),
  getFps: invoke<IpcGetFps>('getFps'),
  createShell: invoke('createShell'),
  writeShell: invoke('writeShell'),
  resizeShell: invoke('resizeShell'),
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
  getLogs: invoke<IpcGetLogs>('getLogs'),
  clearLogs: invoke('clearLogs'),
  listForwards: invoke<IpcListForwards>('listForwards'),
  listReverses: invoke<IpcListReverses>('listReverses'),
  forward: invoke<IpcForward>('forward'),
  reverse: invoke<IpcReverse>('reverse'),
  openAdbCli: invoke('openAdbCli'),
  dumpWindowHierarchy: invoke<IpcDumpWindowHierarchy>('dumpWindowHierarchy'),
  root: invoke('root'),
})
