import { BrowserWindow } from 'electron'
import { getSettingsStore } from '../lib/store'
import * as window from 'share/main/lib/window'
import once from 'licia/once'
import { IpcGetAvds, IpcStartAvd, IpcStopAvd } from 'common/types'
import types from 'licia/types'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'
import { IAvd } from '../../common/types'
import { handleEvent } from 'share/main/lib/util'
import filter from 'licia/filter'
import endWith from 'licia/endWith'
import ini from 'licia/ini'
import toNum from 'licia/toNum'
import fileSize from 'licia/fileSize'
import childProcess from 'node:child_process'
import memoize from 'licia/memoize'
import isWindows from 'licia/isWindows'
import isMac from 'licia/isMac'
import keys from 'licia/keys'
import sleep from 'licia/sleep'
import log from 'share/common/log'

const logger = log('avd')

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
    width: 720,
    height: 480,
    customTitlebar: !settingsStore.get('useNativeTitlebar'),
  })

  win.on('close', () => {
    win?.destroy()
    win = null
  })

  window.loadPage(win, { page: 'avd' })
}

let avds: types.PlainObj<IAvd> = {}
let avdFolder = process.env.ANDROID_AVD_HOME || ''

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
    } catch (e) {
      logger.error(e)
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
    internalStorage: fileSize(properties['disk.dataPartition.size'] as string),
    resolution: `${properties['hw.lcd.width']}x${properties['hw.lcd.height']}`,
    folder,
    pid: 0,
  }
}

async function getAvdPid(folder: string) {
  let file = path.resolve(folder, 'hardware-qemu.ini.lock')
  if (!(await fs.pathExists(file))) {
    return 0
  }

  const stat = await fs.stat(file)
  if (!stat.isFile()) {
    file = path.resolve(file, 'pid')
  }
  const content = await fs.readFile(file, 'utf-8')
  return parseInt(content, 10)
}

const getAvds: IpcGetAvds = async (forceRefresh) => {
  if (forceRefresh) {
    await reloadAvds()
  }

  const ret: IAvd[] = []
  const _keys = keys(avds)
  for (let i = 0, len = _keys.length; i < len; i++) {
    const key = _keys[i]
    const avd = avds[key]
    avd.pid = await getAvdPid(avd.folder)
    ret.push(avd)
  }

  return ret
}

const getEmulatorPath = memoize(function () {
  let androidHome = process.env.ANDROID_HOME
  if (!androidHome) {
    if (isWindows) {
      androidHome = path.resolve(process.env.LOCALAPPDATA || '', 'Android/Sdk')
    } else if (isMac) {
      androidHome = path.resolve(os.homedir(), 'Library/Android/sdk')
    } else {
      androidHome = path.resolve(os.homedir(), 'Android/Sdk')
    }
  }

  if (androidHome && fs.existsSync(androidHome)) {
    return path.resolve(
      androidHome,
      `emulator/emulator${isWindows ? '.exe' : ''}`
    )
  }

  return 'emulator'
})

const startAvd: IpcStartAvd = async (avdId) => {
  const cp = childProcess.spawn(getEmulatorPath(), [`@${avdId}`], {
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    shell: isWindows,
  })
  cp.unref()
}

const stopAvd: IpcStopAvd = async (avdId) => {
  const avd = avds[avdId]
  if (!avd || !avd.pid) {
    return
  }
  process.kill(avd.pid)
  setTimeout(async () => {
    const pidPath = path.resolve(avd.folder, 'hardware-qemu.ini.lock')
    if (await fs.pathExists(pidPath)) {
      await fs.remove(pidPath)
    }
  }, 500)
}

const wipeAvdData = async (avdId: string) => {
  const avd = avds[avdId]
  if (!avd) {
    return
  }
  if (avd.pid) {
    await stopAvd(avdId)
    await sleep(1000)
  }
  const removed = [
    path.resolve(avd.folder, 'snapshots'),
    path.resolve(avd.folder, 'userdata-qemu.img'),
  ]
  for (const item of removed) {
    await fs.remove(item)
  }
}

const initIpc = once(() => {
  if (!fs.existsSync(avdFolder)) {
    avdFolder = path.resolve(os.homedir(), '.android', 'avd')
  }

  logger.info('AVD folder', avdFolder)

  reloadAvds()

  handleEvent('getAvds', getAvds)
  handleEvent('startAvd', startAvd)
  handleEvent('stopAvd', stopAvd)
  handleEvent('wipeAvdData', wipeAvdData)
})
