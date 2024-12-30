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
}

export async function shell(deviceId: string, cmd: string): Promise<string>
export async function shell(deviceId: string, cmd: string[]): Promise<string[]>
export async function shell(
  deviceId: string,
  cmd: string | string[]
): Promise<string | string[]> {
  const device = await client.getDevice(deviceId)
  const cmds: string[] = isStr(cmd) ? [cmd] : cmd

  const socket = await device.shell(cmds.join('\necho "aya_separator"\n'))
  const output: string = (await Adb.util.readAll(socket)).toString()

  if (cmds.length === 1) {
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
