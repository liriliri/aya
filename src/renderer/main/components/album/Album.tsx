import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { notify } from 'share/renderer/lib/util'
import { getBackend, BackendId, explainXspaceError } from './backend'
import { computeAlbums, scanDevice } from './scanner'
import {
  hasStoredConfig,
  loadConfig,
  loadScanCache,
  saveConfig,
  saveScanCache,
  IAlbumConfig,
} from './config'
import { setThumbLongSide } from './Thumb'
import AlbumList from './AlbumList'
import AlbumView, { IClipboard } from './AlbumView'
import {
  AlbumSortBy,
  IAlbum,
  IScanCache,
  IScanStats,
} from './types'
import Style from './Album.module.scss'

export default observer(function Album() {
  const { device } = store

  const [backendId, setBackendId] = useState<BackendId>('main')
  const backend = getBackend(backendId)
  const [config, setConfig] = useState<IAlbumConfig | null>(null)
  const [cache, setCache] = useState<IScanCache>({})
  const [albums, setAlbums] = useState<IAlbum[]>([])
  const [sortBy, setSortBy] = useState<AlbumSortBy>('time')
  const [scanning, setScanning] = useState(false)
  const [stats, setStats] = useState<IScanStats | null>(null)
  const [current, setCurrent] = useState<IAlbum | null>(null)
  const [clipboard, setClipboard] = useState<IClipboard | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const scanTokenRef = useRef(0)
  const lastDeviceIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!device) {
      return
    }
    let alive = true
    // 立即作废上一个数据源的配置,避免切换瞬间用旧配置触发扫描
    setConfig(null)
    setSourceError(null)
    void (async () => {
      let loaded = loadConfig(device.id, backendId)
      // 隐私空间首次使用时自动探测卷根目录作为扫描根;
      // 助手缺失/未运行时给出中文提示并跳过注定失败的自动扫描
      if (backendId === 'xspace' && !hasStoredConfig(device.id, backendId)) {
        try {
          const root = await backend.detectRoot(device.id)
          if (root) {
            loaded = { ...loaded, scanRoot: root }
          }
        } catch (err: any) {
          if (!alive) {
            return
          }
          setSourceError(explainXspaceError(err))
          setConfig(loaded)
          setThumbLongSide(loaded.thumbLongSide)
          setCache({})
          setAlbums([])
          return
        }
      }
      if (!alive) {
        return
      }
      setConfig(loaded)
      setThumbLongSide(loaded.thumbLongSide)
      const cached = loadScanCache(device.id, backendId)
      if (cached) {
        setCache(cached)
        setAlbums(computeAlbums(loaded.scanRoot, cached, loaded.threshold))
        setStats(null)
      } else {
        setCache({})
        setAlbums([])
        // 首次使用自动触发扫描
        void scan(loaded, {})
      }
    })()
    return () => {
      alive = false
    }
  }, [device?.id, backendId])

  useEffect(() => {
    // 切换到其他设备时回到相册列表并清空剪贴板(剪贴板按设备绑定;
    // 同一设备断线重连不清空)
    const prevId = lastDeviceIdRef.current
    lastDeviceIdRef.current = device?.id
    if (device && prevId !== undefined && prevId !== device.id) {
      setClipboard(null)
      setCurrent(null)
    }
  }, [device?.id])

  async function scan(cfg: IAlbumConfig, baseCache: IScanCache) {
    if (!device) {
      return
    }
    const token = ++scanTokenRef.current
    setScanning(true)
    setStats(null)
    try {
      const result = await scanDevice({
        deviceId: device.id,
        root: cfg.scanRoot,
        threshold: cfg.threshold,
        excludedNames: cfg.excludedNames,
        excludeHidden: cfg.excludeHidden,
        respectNoMedia: cfg.respectNoMedia,
        concurrency: cfg.concurrency,
        cache: baseCache,
        readDir: backend.listDir,
        onProgress: (s) => {
          if (scanTokenRef.current === token) {
            setStats(s)
          }
        },
        isAborted: () => scanTokenRef.current !== token,
      })
      if (scanTokenRef.current !== token) {
        return
      }
      setCache(result.cache)
      setAlbums(result.albums)
      setStats(result.stats)
      setSourceError(null)
      saveScanCache(device.id, backendId, result.cache)
    } catch (err: any) {
      const message =
        backendId === 'xspace'
          ? explainXspaceError(err)
          : err?.message || '扫描失败'
      setSourceError(message)
      notify(message, { icon: 'error' })
    } finally {
      if (scanTokenRef.current === token) {
        setScanning(false)
      }
    }
  }

  function applyConfig(next: IAlbumConfig) {
    setConfig(next)
    setShowSettings(false)
    if (!device) {
      return
    }
    saveConfig(device.id, backendId, next)
    setThumbLongSide(next.thumbLongSide)
    // 阈值与排除规则变化可直接基于缓存重算,无需重新扫描
    setAlbums(computeAlbums(next.scanRoot, cache, next.threshold))
  }

  if (!device) {
    return <div className={Style.noDevice}>未连接设备</div>
  }

  return (
    <div className={Style.root}>
      {current ? (
        <AlbumView
          deviceId={device.id}
          album={current}
          backend={backend}
          clipboard={clipboard}
          onCopy={setClipboard}
          onAlbumChanged={() => config && scan(config, cache)}
          onBack={() => setCurrent(null)}
        />
      ) : (
        <AlbumList
          deviceId={device.id}
          backend={backend}
          albums={albums}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onOpen={setCurrent}
          onScan={() => config && scan(config, cache)}
          onSettings={() => setShowSettings(true)}
          scanning={scanning}
          stats={stats}
          error={sourceError}
          backendId={backendId}
          onBackendChange={(id) => {
            setCurrent(null)
            setBackendId(id)
          }}
          clipboardCount={
            clipboard &&
            clipboard.deviceId === device.id &&
            clipboard.backendId === backendId
              ? clipboard.paths.length
              : 0
          }
        />
      )}
      {showSettings && config && (
        <SettingsModal
          config={config}
          onCancel={() => setShowSettings(false)}
          onSave={applyConfig}
        />
      )}
    </div>
  )
})

function SettingsModal(props: {
  config: IAlbumConfig
  onCancel: () => void
  onSave: (config: IAlbumConfig) => void
}) {
  const { config } = props
  const [draft, setDraft] = useState<IAlbumConfig>({ ...config })

  function update<K extends keyof IAlbumConfig>(key: K, value: IAlbumConfig[K]) {
    setDraft({ ...draft, [key]: value })
  }

  return (
    <div className={Style.modalMask} onClick={props.onCancel}>
      <div className={Style.modal} onClick={(e) => e.stopPropagation()}>
        <div className={Style.modalTitle}>相册插件设置</div>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>成册阈值(张)</span>
          <input
            className={Style.input}
            type="number"
            min={1}
            value={draft.threshold}
            onChange={(e) => update('threshold', Math.max(1, +e.target.value || 1))}
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>扫描根目录</span>
          <input
            className={Style.input}
            value={draft.scanRoot}
            onChange={(e) => update('scanRoot', e.target.value)}
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>排除目录名(逗号分隔)</span>
          <input
            className={Style.input}
            value={draft.excludedNames.join(',')}
            onChange={(e) =>
              update(
                'excludedNames',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s !== '')
              )
            }
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>排除隐藏目录(以 . 开头)</span>
          <input
            type="checkbox"
            checked={draft.excludeHidden}
            onChange={(e) => update('excludeHidden', e.target.checked)}
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>遵循 .nomedia 标记</span>
          <input
            type="checkbox"
            checked={draft.respectNoMedia}
            onChange={(e) => update('respectNoMedia', e.target.checked)}
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>扫描并发数</span>
          <input
            className={Style.input}
            type="number"
            min={1}
            max={32}
            value={draft.concurrency}
            onChange={(e) =>
              update('concurrency', Math.min(32, Math.max(1, +e.target.value || 8)))
            }
          />
        </label>
        <label className={Style.formRow}>
          <span className={Style.formLabel}>缩略图最长边(像素)</span>
          <input
            className={Style.input}
            type="number"
            min={120}
            max={1280}
            value={draft.thumbLongSide}
            onChange={(e) =>
              update(
                'thumbLongSide',
                Math.min(1280, Math.max(120, +e.target.value || 480))
              )
            }
          />
        </label>
        <div className={Style.modalHint}>
          修改扫描根目录后需点击「扫描 / 增量刷新」重新扫描;阈值与排除规则会基于现有缓存立即重算。
        </div>
        <div className={Style.modalActions}>
          <button className={Style.btn} onClick={props.onCancel}>
            取消
          </button>
          <button
            className={`${Style.btn} ${Style.btnPrimary}`}
            onClick={() => props.onSave(draft)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
