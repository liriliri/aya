import { useEffect, useMemo, useRef, useState } from 'react'
import LunaImageViewer from 'luna-image-viewer/react'
import { notify } from 'share/renderer/lib/util'
import { IStorageBackend, explainXspaceError } from './backend'
import { baseName, joinPath, listAlbumImages, uniqueName } from './scanner'
import Thumb from './Thumb'
import {
  GridSize,
  IAlbum,
  IImageItem,
  ImageSortBy,
} from './types'
import Style from './Album.module.scss'

const GAP = 8
const OVERSCAN_ROWS = 2
const CELL_SIZE: Record<GridSize, number> = {
  small: 120,
  medium: 200,
  large: 320,
}

const SIZE_LABEL: Record<GridSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
}

export interface IClipboard {
  deviceId: string
  backendId: string
  paths: string[]
}

interface IProps {
  deviceId: string
  album: IAlbum
  backend: IStorageBackend
  clipboard: IClipboard | null
  onCopy: (clipboard: IClipboard) => void
  onAlbumChanged: () => void
  onBack: () => void
}

export default function AlbumView(props: IProps) {
  const {
    deviceId,
    album,
    backend,
    clipboard,
    onCopy,
    onAlbumChanged,
    onBack,
  } = props

  const [images, setImages] = useState<IImageItem[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [size, setSize] = useState<GridSize>('medium')
  const [sortBy, setSortBy] = useState<ImageSortBy>('time')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewer, setViewer] = useState<IImageItem | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef<number>(-1)
  const rafRef = useRef(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  const deviceClip =
    clipboard &&
    clipboard.deviceId === deviceId &&
    clipboard.backendId === backend.id
      ? clipboard
      : null

  function explainListError(err: any): string {
    return backend.id === 'xspace'
      ? explainXspaceError(err)
      : err?.message || '目录读取失败'
  }

  useEffect(() => {
    let alive = true
    setImages(null)
    setListError(null)
    setSelected(new Set())
    anchorRef.current = -1
    listAlbumImages(deviceId, album.path, backend.listDir)
      .then((items) => {
        if (alive) {
          setImages(items)
        }
      })
      .catch((err: any) => {
        // 助手离线、目录被删等情况:展示错误而不是永远「加载中…」
        if (alive) {
          setImages([])
          setListError(explainListError(err))
        }
      })
    return () => {
      alive = false
    }
  }, [deviceId, album.path, backend.id, reloadToken])

  useEffect(() => {
    const viewportEl = viewportRef.current
    if (!viewportEl) {
      return
    }
    const observer = new ResizeObserver(() => {
      setViewport({
        width: viewportEl.clientWidth,
        height: viewportEl.clientHeight,
      })
    })
    observer.observe(viewportEl)
    setViewport({
      width: viewportEl.clientWidth,
      height: viewportEl.clientHeight,
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    if (!viewer) {
      return
    }
    setViewerUrl('')
    void backend.fileUrl(deviceId, viewer.path).then((url: string) => {
      if (alive) {
        setViewerUrl(url)
      }
    })
    return () => {
      alive = false
    }
  }, [viewer])

  const sorted = useMemo(() => {
    if (!images) {
      return []
    }
    const arr = [...images]
    arr.sort((a, b) => {
      let result: number
      if (sortBy === 'name') {
        result = a.name.localeCompare(b.name, 'zh-CN')
      } else {
        result = a.mtime - b.mtime
      }
      return sortAsc ? result : -result
    })
    return arr
  }, [images, sortBy, sortAsc])

  // 排序方式变化后,区间选择的锚点索引不再可靠
  useEffect(() => {
    anchorRef.current = -1
  }, [sortBy, sortAsc])

  function selectImage(idx: number, event: React.MouseEvent) {
    const path = sorted[idx].path
    setSelected((prev) => {
      const next = new Set(prev)
      if (event.ctrlKey || event.metaKey) {
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        anchorRef.current = idx
      } else if (event.shiftKey && anchorRef.current >= 0) {
        next.clear()
        const from = Math.min(anchorRef.current, idx)
        const to = Math.max(anchorRef.current, idx)
        for (let i = from; i <= to; i++) {
          next.add(sorted[i].path)
        }
      } else {
        next.clear()
        next.add(path)
        anchorRef.current = idx
      }
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(sorted.map((image) => image.path)))
  }

  async function reload() {
    try {
      const items = await listAlbumImages(deviceId, album.path, backend.listDir)
      setImages(items)
      setReloadToken((token) => token + 1)
    } catch (err: any) {
      setImages([])
      setListError(explainListError(err))
    }
  }

  async function doDelete() {
    setConfirmDelete(false)
    if (!selected.size) {
      return
    }
    const paths = [...selected]
    let failed = 0
    for (let i = 0; i < paths.length; i++) {
      setBusy(`删除中 ${i + 1}/${paths.length}…`)
      try {
        await backend.deleteFile(deviceId, paths[i])
      } catch {
        failed++
      }
    }
    setBusy('')
    setSelected(new Set())
    anchorRef.current = -1
    await reload()
    onAlbumChanged()
    if (failed > 0) {
      notify(`删除完成,${failed} 张失败(可能权限不足)`, { icon: 'error' })
    } else {
      notify(`已删除 ${paths.length} 张图片`)
    }
  }

  async function doPaste() {
    if (!deviceClip || !deviceClip.paths.length || busy) {
      return
    }
    if (deviceClip.paths.some((p) => p.startsWith(album.path + '/'))) {
      notify('剪贴板中的图片已在当前相册内,未执行粘贴', { icon: 'error' })
      return
    }
    const existing = new Set((images || []).map((image) => image.name))
    let failed = 0
    for (let i = 0; i < deviceClip.paths.length; i++) {
      const src = deviceClip.paths[i]
      setBusy(`复制中 ${i + 1}/${deviceClip.paths.length}…`)
      const name = uniqueName(baseName(src), existing)
      try {
        await backend.copyFile(deviceId, src, joinPath(album.path, name))
        existing.add(name)
      } catch {
        failed++
      }
    }
    setBusy('')
    await reload()
    onAlbumChanged()
    if (failed > 0) {
      notify(`粘贴完成,${failed} 张失败`, { icon: 'error' })
    } else {
      notify(`已粘贴 ${deviceClip.paths.length} 张图片到 ${album.path}`)
    }
  }

  // 键盘快捷键:Delete 删除、Ctrl+A 全选、Ctrl+C 复制、Ctrl+V 粘贴、Esc 取消选择
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      if (e.key === 'Escape') {
        setSelected(new Set())
        anchorRef.current = -1
        return
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        selectAll()
        return
      }
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (selected.size > 0) {
          onCopy({ deviceId, backendId: backend.id, paths: [...selected] })
          notify(`已复制 ${selected.size} 张图片`)
        }
        return
      }
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void doPaste()
        return
      }
      if (e.key === 'Delete' && selected.size > 0 && !confirmDelete) {
        e.preventDefault()
        setConfirmDelete(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const cell = CELL_SIZE[size]
  const cols = Math.max(
    1,
    Math.floor((viewport.width - GAP) / (cell + GAP)) || 1
  )
  const rowHeight = cell + GAP
  const totalRows = Math.ceil(sorted.length / cols)
  const totalHeight = totalRows * rowHeight + GAP
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS)
  const lastRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewport.height) / rowHeight) + OVERSCAN_ROWS
  )
  const allSelected = sorted.length > 0 && selected.size === sorted.length

  const cells: React.ReactNode[] = []
  for (let row = firstRow; row < lastRow; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      if (idx >= sorted.length) {
        break
      }
      const image = sorted[idx]
      const isSelected = selected.has(image.path)
      cells.push(
        <div
          key={image.path}
          className={`${Style.cell} ${isSelected ? Style.cellSelected : ''}`}
          style={{
            width: cell,
            height: cell,
            transform: `translate(${GAP + col * (cell + GAP)}px, ${
              GAP + row * rowHeight
            }px)`,
          }}
        >
          <Thumb
            deviceId={deviceId}
            path={image.path}
            mtime={image.mtime}
            square
            selected={isSelected}
            getUrl={(p) => backend.fileUrl(deviceId, p)}
            onClick={(e) => selectImage(idx, e)}
            onDoubleClick={() => setViewer(image)}
          />
        </div>
      )
    }
  }

  return (
    <div className={Style.container}>
      <div className={Style.viewBar}>
        <button className={Style.btn} onClick={onBack} disabled={!!busy}>
          ← 返回相册列表
        </button>
        <div className={Style.viewTitle} title={album.path}>
          {album.name}
        </div>
        <div className={Style.viewMeta}>
          {listError
            ? '加载失败'
            : images
            ? `共 ${images.length} 张` +
              (selected.size > 0 ? `,已选 ${selected.size} 张` : '')
            : '加载中…'}
          {busy && ` · ${busy}`}
        </div>
        <div className={Style.viewControls}>
          <button
            className={Style.btn}
            onClick={() => (allSelected ? setSelected(new Set()) : selectAll())}
            disabled={!images || !!busy}
            title="Ctrl+A"
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button
            className={Style.btn}
            onClick={() => {
              onCopy({ deviceId, backendId: backend.id, paths: [...selected] })
              notify(`已复制 ${selected.size} 张图片`)
            }}
            disabled={selected.size === 0 || !!busy}
            title="Ctrl+C"
          >
            复制
          </button>
          {deviceClip && (
            <button
              className={Style.btn}
              onClick={() => void doPaste()}
              disabled={!images || !!busy}
              title="Ctrl+V"
            >
              粘贴 {deviceClip.paths.length} 张
            </button>
          )}
          <button
            className={`${Style.btn} ${Style.btnDanger}`}
            onClick={() => setConfirmDelete(true)}
            disabled={selected.size === 0 || !!busy}
            title="Delete 键"
          >
            删除
          </button>
          <span className={Style.sizeSep} />
          {(Object.keys(CELL_SIZE) as GridSize[]).map((key) => (
            <button
              key={key}
              className={`${Style.btn} ${size === key ? Style.btnActive : ''}`}
              onClick={() => setSize(key)}
            >
              {SIZE_LABEL[key]}
            </button>
          ))}
          <select
            className={Style.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ImageSortBy)}
          >
            <option value="time">按修改时间</option>
            <option value="name">按文件名</option>
          </select>
          <button
            className={Style.btn}
            title={sortAsc ? '当前:升序' : '当前:降序'}
            onClick={() => setSortAsc(!sortAsc)}
          >
            {sortAsc ? '↑' : '↓'}
          </button>
        </div>
      </div>
      <div className={Style.gridWrap}>
        <div
          ref={viewportRef}
          className={Style.gridViewport}
          onScroll={(e) => {
            const target = e.currentTarget
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
              setScrollTop(target.scrollTop)
            })
          }}
        >
          {listError && <div className={Style.empty}>{listError}</div>}
          {images && images.length === 0 && !listError && (
            <div className={Style.empty}>相册内没有图片(内容可能已被移动)</div>
          )}
          <div className={Style.gridInner} style={{ height: totalHeight }}>
            {cells}
          </div>
        </div>
        {/* 大图查看器只覆盖缩略图网格区域:相册工具栏及其上方的一切均不被遮挡 */}
        {viewer && (
          <div className={Style.viewer} onClick={() => setViewer(null)}>
            <div className={Style.viewerBar}>
              <span className={Style.viewerName}>{viewer.name}</span>
              <button className={Style.btn} onClick={() => setViewer(null)}>
                关闭
              </button>
            </div>
            {viewerUrl ? (
              <div
                className={Style.viewerBody}
                onClick={(e) => e.stopPropagation()}
              >
                <LunaImageViewer image={viewerUrl} />
              </div>
            ) : (
              <div className={Style.viewerLoading}>原图加载中…</div>
            )}
          </div>
        )}
      </div>
      {confirmDelete && (
        <div className={Style.modalMask}>
          <div className={Style.modal}>
            <div className={Style.modalTitle}>删除确认</div>
            <div className={Style.modalHint}>
              确定要删除已选的 {selected.size} 张图片吗?
              <br />
              删除通过 ADB 直接执行,<b>不会进入手机相册的最近删除</b>
              ,无法恢复。如有疑问请先「复制」备份到其他相册。
            </div>
            <div className={Style.modalActions}>
              <button className={Style.btn} onClick={() => setConfirmDelete(false)}>
                取消
              </button>
              <button
                className={`${Style.btn} ${Style.btnDanger}`}
                onClick={() => void doDelete()}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
