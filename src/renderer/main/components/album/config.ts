import { BackendId } from './backend'

function storageKey(prefix: string, deviceId: string, backendId: BackendId) {
  return `${prefix}:${deviceId}:${backendId}`
}

function readWithLegacy(
  prefix: string,
  deviceId: string,
  backendId: BackendId
): string | null {
  const current = localStorage.getItem(storageKey(prefix, deviceId, backendId))
  if (current !== null || backendId !== 'main') {
    return current
  }
  // 兼容 v1 存储键(无后缀),主空间缓存迁移后按新键保存
  return localStorage.getItem(`${prefix}:${deviceId}`)
}

const CONFIG_PREFIX = 'aya-album-config'

export interface IAlbumConfig {
  threshold: number
  scanRoot: string
  excludedNames: string[]
  excludeHidden: boolean
  respectNoMedia: boolean
  concurrency: number
  thumbLongSide: number
}

export const DEFAULT_CONFIG: IAlbumConfig = {
  threshold: 5,
  scanRoot: '/sdcard',
  excludedNames: ['Android'],
  excludeHidden: true,
  respectNoMedia: true,
  concurrency: 8,
  thumbLongSide: 480,
}

export function loadConfig(
  deviceId: string,
  backendId: BackendId = 'main'
): IAlbumConfig {
  try {
    const raw = readWithLegacy(CONFIG_PREFIX, deviceId, backendId)
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch {
    // 配置损坏时回退默认值
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(
  deviceId: string,
  backendId: BackendId,
  config: IAlbumConfig
) {
  try {
    localStorage.setItem(
      storageKey(CONFIG_PREFIX, deviceId, backendId),
      JSON.stringify(config)
    )
  } catch {
    // 存储不可用时忽略
  }
}

export function hasStoredConfig(
  deviceId: string,
  backendId: BackendId
): boolean {
  return (
    localStorage.getItem(storageKey(CONFIG_PREFIX, deviceId, backendId)) !==
    null
  )
}

const CACHE_PREFIX = 'aya-album-cache'

export function loadScanCache(
  deviceId: string,
  backendId: BackendId = 'main'
) {
  try {
    const raw = readWithLegacy(CACHE_PREFIX, deviceId, backendId)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // 缓存损坏时视为无缓存
  }
  return null
}

export function saveScanCache(
  deviceId: string,
  backendId: BackendId,
  cache: unknown
) {
  try {
    localStorage.setItem(
      storageKey(CACHE_PREFIX, deviceId, backendId),
      JSON.stringify(cache)
    )
  } catch {
    // 超出 localStorage 容量时放弃持久化,仅本次会话内生效
  }
}
