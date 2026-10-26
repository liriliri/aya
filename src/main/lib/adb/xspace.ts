import { shell, forwardTcp } from './base'
import { handleEvent } from 'share/main/lib/util'
import sleep from 'licia/sleep'
import mime from 'licia/mime'
import splitPath from 'licia/splitPath'

const HELPER = 'io.liriliri.aya.xspacehelper'
const TOKEN_PATH =
  '/storage/emulated/0/Android/data/io.liriliri.aya.xspacehelper/files/bridge-token.txt'
const REMOTE = 'tcp:38766'

const tokens = new Map<string, string>()

interface IXspaceEntry {
  name: string
  directory: boolean
  size?: number
  mtime?: number
}

export interface IXspaceFile {
  name: string
  directory: boolean
  size?: number
  mtime: Date
  mime?: string
}

export interface IXspaceList {
  root: string
  path: string
  entries: IXspaceFile[]
}

const xspaceList = async function (
  deviceId: string,
  target = ''
): Promise<IXspaceList> {
  const installed = await shell(deviceId, `pm path ${HELPER}`)
  if (!installed.includes('package:')) {
    throw new Error('helper_missing')
  }
  const query = target ? `?path=${encodeURIComponent(target)}` : ''
  const json = await helperFetch(deviceId, `/v1/list${query}`)
  const entries = Array.isArray(json.entries) ? json.entries : []
  return {
    root: String(json.root || ''),
    path: String(json.path || ''),
    entries: entries.map((entry: IXspaceEntry) => {
      const item: IXspaceFile = {
        name: entry.name,
        directory: !!entry.directory,
        mtime: new Date(entry.mtime || 0),
      }
      if (!item.directory) {
        item.size = entry.size || 0
        const ext = splitPath(entry.name).ext
        if (ext) {
          item.mime = mime(ext.slice(1))
        }
      }
      return item
    }),
  }
}

const xspaceFileUrl = async function (deviceId: string, target: string) {
  const installed = await shell(deviceId, `pm path ${HELPER}`)
  if (!installed.includes('package:')) {
    throw new Error('helper_missing')
  }
  const port = await forwardTcp(deviceId, REMOTE)
  const token = await tokenFor(deviceId)
  const params = new URLSearchParams()
  params.set('path', target)
  params.set('token', token)
  return `http://127.0.0.1:${port}/v1/raw?${params.toString()}`
}

const xspaceEdit = async function (
  deviceId: string,
  op: string,
  path: string,
  dest = ''
) {
  const installed = await shell(deviceId, `pm path ${HELPER}`)
  if (!installed.includes('package:')) {
    throw new Error('helper_missing')
  }
  return helperFetch(deviceId, '/v1/edit', true, 10 * 60 * 1000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      op,
      path,
      dest,
      confirm: op === 'delete' ? 'DELETE' : '',
    }),
  })
}

async function helperFetch(
  deviceId: string,
  urlPath: string,
  retry = true,
  timeoutMs = 20000,
  init: RequestInit = {}
): Promise<any> {
  const port = await forwardTcp(deviceId, REMOTE)
  const token = await tokenFor(deviceId)
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    if (!retry) {
      throw new Error('helper_offline')
    }
    tokens.delete(deviceId)
    await wakeHelper(deviceId)
    return helperFetch(deviceId, urlPath, false, timeoutMs, init)
  }
  if (response.status === 401 && retry) {
    tokens.delete(deviceId)
    await tokenFor(deviceId, true)
    return helperFetch(deviceId, urlPath, false, timeoutMs, init)
  }
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error || 'helper_error')
  }
  return json
}

async function tokenFor(deviceId: string, refresh = false) {
  if (!refresh) {
    const cached = tokens.get(deviceId)
    if (cached) {
      return cached
    }
  }
  let token = await readToken(deviceId)
  if (!token) {
    await wakeHelper(deviceId)
    token = await readToken(deviceId)
  }
  if (!token) {
    throw new Error('helper_token_missing')
  }
  tokens.set(deviceId, token)
  return token
}

async function readToken(deviceId: string) {
  const output = await shell(deviceId, `cat "${TOKEN_PATH}"`)
  const match = output.match(/[0-9a-f]{32}/)
  return match ? match[0] : null
}

async function wakeHelper(deviceId: string) {
  await shell(
    deviceId,
    `am start --user 0 -n ${HELPER}/.MainActivity`
  )
  await sleep(1200)
}

export function init() {
  handleEvent('xspaceList', xspaceList)
  handleEvent('xspaceFileUrl', xspaceFileUrl)
  handleEvent('xspaceEdit', xspaceEdit)
}
