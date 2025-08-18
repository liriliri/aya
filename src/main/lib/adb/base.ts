import singleton from 'licia/singleton'
import each from 'licia/each'
import trim from 'licia/trim'
import startWith from 'licia/startWith'
import map from 'licia/map'
import lowerCase from 'licia/lowerCase'
import Adb, { Client } from '@devicefarmer/adbkit'
import getPort from 'licia/getPort'
import toNum from 'licia/toNum'
import types from 'licia/types'
import isStr from 'licia/isStr'
import log from 'share/common/log'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import isWindows from 'licia/isWindows'
import isStrBlank from 'licia/isStrBlank'
import fs from 'fs-extra'
import { getSettingsStore } from '../store'
import childProcess from 'node:child_process'
import contain from 'licia/contain'

const logger = log('adbBase')

const settingsStore = getSettingsStore()

let client: Client

export const getPidNames = singleton(async (deviceId: string) => {
  const processes = await getProcesses(deviceId)
  const pidNames = {}
  each(processes, (process) => {
    pidNames[process.pid] = process.name
  })
  return pidNames
})

export const getProcesses = singleton(async (deviceId: string) => {
  let columns = ['pid', '%cpu', 'time+', 'res', 'user', 'name', 'args']
  let command = 'top -b -n 1'
  each(columns, (column) => {
    command += ` -o ${column}`
  })

  const result: string = await shell(deviceId, command)
  let lines = result.split('\n')
  let start = -1
  for (let i = 0, len = lines.length; i < len; i++) {
    if (startWith(trim(lines[i]), 'PID')) {
      start = i + 1
      break
    }
  }

  // older version of top command
  if (start < 0) {
    const result: string = await shell(deviceId, 'top -n 1')
    lines = result.split('\n')
    for (let i = 0, len = lines.length; i < len; i++) {
      const line = trim(lines[i])
      if (startWith(line, 'PID')) {
        columns = line.split(/\s+/)
        columns = map(columns, (column) => {
          column = lowerCase(column)
          if (column === 'cpu%') {
            column = '%cpu'
          } else if (column === 'uid') {
            column = 'user'
          } else if (column === 'rss') {
            column = 'res'
          }
          return column
        })
        start = i + 1
        break
      }
    }
  }

  lines = lines.slice(start)
  const processes: any[] = []
  each(lines, (line) => {
    line = trim(line)
    if (!line) {
      return
    }
    const parts = line.split(/\s+/)
    const process: any = {}
    each(columns, (column, index) => {
      if (column === 'args') {
        process[column] = parts.slice(index).join(' ')
      } else {
        process[column] = parts[index] || ''
      }
    })
    if (process.args === command) {
      return
    }
    processes.push(process)
  })

  return processes
})

export async function init(c: Client) {
  client = c

  handleEvent('reverseTcp', reverseTcp)
  handleEvent('getProcesses', getProcesses)
}

export async function shell(deviceId: string, cmd: string): Promise<string>
export async function shell(deviceId: string, cmd: string[]): Promise<string[]>
export async function shell(
  deviceId: string,
  cmd: string | string[]
): Promise<string | string[]> {
  logger.debug('shell', cmd)

  const device = await client.getDevice(deviceId)
  const cmds: string[] = isStr(cmd) ? [cmd] : cmd

  const socket = await device.shell(cmds.join('\necho "aya_separator"\n'))
  const output: string = (await Adb.util.readAll(socket)).toString()

  if (isStr(cmd)) {
    return trim(output)
  }

  return map(output.split('aya_separator'), (val) => trim(val))
}

export async function forwardTcp(deviceId: string, remote: string) {
  const device = await client.getDevice(deviceId)
  const forwards = await device.listForwards()

  for (let i = 0, len = forwards.length; i < len; i++) {
    const forward = forwards[i]
    if (forward.remote === remote && forward.serial === deviceId) {
      return toNum(forward.local.replace('tcp:', ''))
    }
  }

  const port = await getPort()
  const local = `tcp:${port}`
  await device.forward(local, remote)

  return port
}

export async function reverseTcp(deviceId: string, remote: string) {
  const device = await client.getDevice(deviceId)
  const reverses = await device.listReverses()

  for (let i = 0, len = reverses.length; i < len; i++) {
    const reverse = reverses[i]
    if (reverse.remote === remote) {
      return toNum(reverse.local.replace('tcp:', ''))
    }
  }

  const port = await getPort()
  const local = `tcp:${port}`
  await device.reverse(remote, local)

  return port
}

const deviceStore: types.PlainObj<any> = {}

export function getDeviceStore(deviceId: string, key: string) {
  return deviceStore[deviceId] && deviceStore[deviceId][key]
}

export function setDeviceStore(deviceId: string, key: string, value: any) {
  if (!deviceStore[deviceId]) {
    deviceStore[deviceId] = {}
  }
  deviceStore[deviceId][key] = value
}

export function getAdbPath() {
  let bin = isWindows
    ? resolveResources('adb/adb.exe')
    : resolveResources('adb/adb')
  const adbPath = settingsStore.get('adbPath')
  if (adbPath === 'adb' || (!isStrBlank(adbPath) && fs.existsSync(adbPath))) {
    bin = adbPath
  }
  return bin
}

export function spawnAdb(args: string[]): Promise<{
  stdout: string
  stderr: string
  code: number | null
}> {
  const bin = getAdbPath()

  return new Promise((resolve, reject) => {
    const cp = childProcess.spawn(bin, args, {
      env: { ...process.env },
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    cp.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    cp.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    cp.on('error', (err) => {
      reject(err)
    })

    cp.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
  })
}

export async function isRooted(deviceId: string): Promise<boolean> {
  const id = await shell(deviceId, 'id')
  return contain(id, 'uid=0')
}
