import { useEffect, useRef, useState } from 'react'
import Semaphore from 'licia/Semaphore'
import { getThumb, putThumb } from './thumbCache'
import Style from './Album.module.scss'

// 缩略图生成并发数:避免同时经 HTTP 文件服务拉取过多原图压垮 USB 通道
const fetchSemaphore = new Semaphore(4)

interface IProps {
  deviceId: string
  path: string
  mtime: number
  square?: boolean
  selected?: boolean
  getUrl?: (path: string) => Promise<string>
  onClick?: (event: React.MouseEvent) => void
  onDoubleClick?: (event: React.MouseEvent) => void
}

let thumbLongSide = 480
export function setThumbLongSide(size: number) {
  thumbLongSide = size
}

async function downscale(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: 'from-image',
  })
  try {
    const scale = Math.min(
      1,
      thumbLongSide / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas 不可用')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    const out = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        0.82
      )
    })
    if (!out) {
      throw new Error('缩略图编码失败')
    }
    return out
  } finally {
    bitmap.close()
  }
}

type ResolveUrl = (path: string) => Promise<string>

async function loadThumb(
  key: string,
  deviceId: string,
  path: string,
  resolveUrl: ResolveUrl
): Promise<string | null> {
  const cached = await getThumb(key)
  if (cached) {
    return URL.createObjectURL(cached)
  }

  return new Promise<string | null>((resolve) => {
    fetchSemaphore.wait(() => {
      generateThumb(key, deviceId, path, resolveUrl)
        .then(resolve)
        .catch(() => {
          // HEIC 等格式 Electron 无法解码、文件被删等情况,降级为占位图
          resolve(null)
        })
        .finally(() => fetchSemaphore.signal())
    })
  })
}

async function generateThumb(
  key: string,
  deviceId: string,
  path: string,
  resolveUrl: ResolveUrl
): Promise<string> {
  const remote = await resolveUrl(path)
  const resp = await fetch(remote)
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  const blob = await resp.blob()
  const thumb = await downscale(blob)
  await putThumb(key, thumb)
  return URL.createObjectURL(thumb)
}

export default function Thumb(props: IProps) {
  const { deviceId, path, mtime, square, selected, getUrl, onClick, onDoubleClick } = props
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    const key = `${deviceId}|${path}|${mtime}`
    const resolveUrl = getUrl || ((p: string) => main.getFileUrl(deviceId, p))

    function setObjectUrl(objectUrl: string) {
      urlRef.current = objectUrl
      if (alive) {
        setUrl(objectUrl)
        setState('ok')
      } else {
        URL.revokeObjectURL(objectUrl)
      }
    }

    void loadThumb(key, deviceId, path, resolveUrl).then((objectUrl) => {
      if (!alive) {
        return
      }
      if (objectUrl) {
        setObjectUrl(objectUrl)
      } else {
        setState('error')
      }
    })

    return () => {
      alive = false
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [deviceId, path, mtime])

  return (
    <div
      className={`${Style.thumb} ${square ? Style.thumbSquare : ''} ${
        selected ? Style.thumbSelected : ''
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={path}
    >
      {selected && <div className={Style.thumbCheck}>✓</div>}
      {state === 'ok' && url ? (
        <img className={Style.thumbImg} src={url} alt="" loading="lazy" />
      ) : state === 'loading' ? (
        <div className={Style.thumbPlaceholder}>…</div>
      ) : (
        <div className={Style.thumbPlaceholder}>✕</div>
      )}
    </div>
  )
}
