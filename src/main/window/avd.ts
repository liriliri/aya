import { BrowserWindow } from 'electron'
import { getAvdStore, getSettingsStore } from '../lib/store'
import * as window from 'share/main/lib/window'
import once from 'licia/once'
import { IpcGetAvds, IpcStartAvd } from 'common/types'
import types from 'licia/types'
import map from 'licia/map'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'
import { IAvd } from '../../common/types'
import { handleEvent } from 'share/main/lib/util'
import filter from 'licia/filter'
import endWith from 'licia/endWith'
import ini from 'licia/ini'
import toNum from 'licia/toNum'
import childProcess from 'node:child_process'

const store = getAvdStore()
const settingsStore = getSettingsStore()

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  initIpc()

  win = window.create({
    name: 'avd',
    minWidth: 720,
    minHeight: 480,
    menu: false,
    customTitlebar: !settingsStore.get('useNativeTitlebar'),
    ...store.get('bounds'),
    onSavePos: () => window.savePos(win, store),
  })

  win.on('close', () => {
    win?.destroy()
    win = null
  })

  window.loadPage(win, { page: 'avd' })
}

let avds: types.PlainObj<IAvd> = {}
const avdFolder = path.resolve(os.homedir(), '.android', 'avd')

async function reloadAvds() {
  avds = {}

  if (!(await fs.pathExists(avdFolder))) {
    return
  }

  const files = await fs.readdir(avdFolder)
  const iniFiles = filter(files, (file) => endWith(file, '.ini'))
  for (let i = 0, len = iniFiles.length; i < len; i++) {
    try {
      const avdInfo = await parseAvdInfo(iniFiles[i])
      avds[avdInfo.id] = avdInfo
    } catch {
      // ignore
    }
  }
}

async function parseAvdInfo(file: string): Promise<IAvd> {
  const p = path.resolve(avdFolder, file)
  const content = await fs.readFile(p, 'utf-8')
  const metadata = ini.parse(content)
  const folder = metadata['path']
  const configPath = path.resolve(folder, 'config.ini')
  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  const config = await fs.readFile(configPath, 'utf-8')
  const properties = ini.parse(config)

  return {
    id: properties['AvdId'],
    name: properties['avd.ini.displayname'],
    abi: properties['abi.type'],
    sdkVersion: metadata['target'].replace('android-', ''),
    memory: toNum(properties['hw.ramSize']),
    internalStorage: properties['disk.dataPartition.size'],
    resolution: `${properties['hw.lcd.width']}x${properties['hw.lcd.height']}`,
    folder,
  }
}

const getAvds: IpcGetAvds = async (forceRefresh) => {
  if (forceRefresh) {
    await reloadAvds()
  }

  return map(avds, (avd) => avd)
}

function getEmulatorPath() {
  if (process.env.ANDROID_HOME) {
    return path.resolve(process.env.ANDROID_HOME, 'emulator/emulator')
  }
  return 'emulator'
}

const startAvd: IpcStartAvd = async (avdId) => {
  const cp = childProcess.spawn(getEmulatorPath(), [`@${avdId}`], {
    detached: true,
    stdio: 'ignore',
  })
  cp.unref()
}

const initIpc = once(() => {
  reloadAvds()

  handleEvent('getAvds', getAvds)
  handleEvent('startAvd', startAvd)
})
