import { IFile } from 'luna-file-list'
import Semaphore from 'licia/Semaphore'
import {
  IAlbum,
  IDirStat,
  IImageItem,
  ILatestImage,
  IScanCache,
  IScanResult,
  IScanStats,
} from './types'

export const IMAGE_EXTS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'heic',
  'avif',
]

const imageExtSet = new Set(IMAGE_EXTS)

export function isImageName(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) {
    return false
  }
  return imageExtSet.has(name.slice(dot + 1).toLowerCase())
}

export function baseName(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx < 0 ? path : path.slice(idx + 1)
}

/**
 * 粘贴时避免与目标目录现有文件重名:photo.jpg → photo (2).jpg → photo (3).jpg
 */
export function uniqueName(name: string, existing: Set<string>): string {
  if (!existing.has(name)) {
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 2
  let candidate = `${stem} (${i})${ext}`
  while (existing.has(candidate)) {
    i++
    candidate = `${stem} (${i})${ext}`
  }
  return candidate
}

export function joinPath(dir: string, name: string): string {
  return dir.endsWith('/') ? dir + name : dir + '/' + name
}

export type ReadDirFn = (deviceId: string, path: string) => Promise<IFile[]>

export interface IScanOptions {
  deviceId: string
  root: string
  threshold: number
  excludedNames: string[]
  excludeHidden: boolean
  respectNoMedia: boolean
  concurrency: number
  cache: IScanCache
  readDir: ReadDirFn
  onProgress?: (stats: IScanStats) => void
  isAborted?: () => boolean
}

export function isDirExcluded(
  name: string,
  excludedNames: string[],
  excludeHidden: boolean
): boolean {
  if (excludedNames.indexOf(name) >= 0) {
    return true
  }
  if (excludeHidden && name.startsWith('.')) {
    return true
  }
  return name === 'lost+found'
}

export interface IParsedListing {
  images: IImageItem[]
  subdirs: { name: string; mtime: number }[]
  noMedia: boolean
}

export function parseDirListing(path: string, files: IFile[]): IParsedListing {
  const images: IImageItem[] = []
  const subdirs: { name: string; mtime: number }[] = []
  let noMedia = false

  for (let i = 0, len = files.length; i < len; i++) {
    const file = files[i]
    if (file.directory) {
      subdirs.push({ name: file.name, mtime: +new Date(file.mtime as any) })
    } else if (file.name === '.nomedia') {
      noMedia = true
    } else if (isImageName(file.name)) {
      images.push({
        path: joinPath(path, file.name),
        name: file.name,
        mtime: +new Date(file.mtime as any),
        size: file.size || 0,
      })
    }
  }

  return { images, subdirs, noMedia }
}

export function toDirStat(
  dirMtime: number,
  images: IImageItem[],
  subdirs: { name: string; mtime: number }[],
  noMedia: boolean
): IDirStat {
  let latest: ILatestImage | null = null
  for (let i = 0, len = images.length; i < len; i++) {
    const img = images[i]
    if (!latest || img.mtime > latest.mtime) {
      latest = { path: img.path, mtime: img.mtime }
    }
  }
  return {
    mtime: dirMtime,
    imgCount: images.length,
    latest,
    subdirs: subdirs.map((item) => item.name),
    subdirMtimes: subdirs.map((item) => item.mtime),
    noMedia,
  }
}

export function computeAlbums(
  root: string,
  dirs: { [path: string]: IDirStat },
  threshold: number
): IAlbum[] {
  const qualifying: { [path: string]: boolean } = {}

  const paths = Object.keys(dirs)
  for (let i = 0, len = paths.length; i < len; i++) {
    const path = paths[i]
    const info = dirs[path]
    let count = info.imgCount
    for (let j = 0, jlen = info.subdirs.length; j < jlen; j++) {
      const child = dirs[joinPath(path, info.subdirs[j])]
      // .nomedia 子目录的内容对父目录不可见,不计入父目录数量
      if (child && !child.noMedia) {
        count += child.imgCount
      }
    }
    qualifying[path] = !info.noMedia && path !== root && count >= threshold
  }

  const albums: IAlbum[] = []
  for (let i = 0, len = paths.length; i < len; i++) {
    const path = paths[i]
    if (!qualifying[path]) {
      continue
    }
    const info = dirs[path]
    let count = info.imgCount
    let hasQualifyingChild = false
    let latest: ILatestImage | null = info.latest
    for (let j = 0, jlen = info.subdirs.length; j < jlen; j++) {
      const childPath = joinPath(path, info.subdirs[j])
      const child = dirs[childPath]
      if (!child || child.noMedia) {
        continue
      }
      count += child.imgCount
      if (qualifying[childPath]) {
        hasQualifyingChild = true
      }
      if (child.latest && (!latest || child.latest.mtime > latest.mtime)) {
        latest = child.latest
      }
    }
    if (hasQualifyingChild) {
      continue
    }
    albums.push({
      name: baseName(path),
      path,
      count,
      ownCount: info.imgCount,
      latest,
    })
  }

  return albums
}

export async function scanDevice(options: IScanOptions): Promise<IScanResult> {
  const {
    deviceId,
    root,
    threshold,
    excludedNames,
    excludeHidden,
    respectNoMedia,
    concurrency,
    cache,
    readDir,
    onProgress,
    isAborted,
  } = options

  const semaphore = new Semaphore(Math.max(1, concurrency))
  const newCache: IScanCache = {}
  const dirs: { [path: string]: IDirStat } = {}
  const stats: IScanStats = { readDirs: 0, reusedDirs: 0, images: 0 }

  let pending = 0
  let aborted = false
  // 根目录读取失败(如隐私空间助手未运行)时携带原始错误整体失败,
  // 避免静默返回 0 相册让用户误以为没有照片
  let rootError: unknown = null
  let resolveAll: () => void
  const allDone = new Promise<void>((resolve) => {
    resolveAll = resolve
  })

  function visit(path: string, expectedMtime: number) {
    if (aborted) {
      return
    }
    pending++
    semaphore.wait(() => {
      void (async () => {
        let stat: IDirStat | null = null

        const cached = cache[path]
        // 根目录 expectedMtime 为 0(拿不到自身 mtime),每次强制重读以发现新增顶层目录
        if (
          cached &&
          expectedMtime !== 0 &&
          cached.mtime === expectedMtime
        ) {
          stat = cached
          stats.reusedDirs++
          stats.images += cached.imgCount
        } else {
          let files: IFile[]
          try {
            files = await readDir(deviceId, path)
          } catch (err) {
            if (path === root) {
              rootError = err
              aborted = true
            }
            throw err
          }
          const parsed = parseDirListing(path, files)
          stat = toDirStat(expectedMtime, parsed.images, parsed.subdirs, parsed.noMedia)
          stats.readDirs++
          stats.images += stat.imgCount
        }

        newCache[path] = stat
        dirs[path] = stat

        if (!(respectNoMedia && stat.noMedia)) {
          for (let i = 0, len = stat.subdirs.length; i < len; i++) {
            if (isDirExcluded(stat.subdirs[i], excludedNames, excludeHidden)) {
              continue
            }
            visit(
              joinPath(path, stat.subdirs[i]),
              stat.subdirMtimes ? stat.subdirMtimes[i] : 0
            )
          }
        }

        if (isAborted && isAborted()) {
          aborted = true
        }
        if (onProgress) {
          onProgress({ ...stats })
        }
      })()
        .catch(() => {
          // 目录读取失败(权限受限或已删除)时跳过
        })
        .then(() => {
          semaphore.signal()
          pending--
          if (pending === 0) {
            resolveAll()
          }
        })
    })
  }

  visit(root, 0)

  await allDone

  if (rootError) {
    throw rootError
  }

  const albums = computeAlbums(root, dirs, threshold)

  return { albums, cache: newCache, stats }
}

export async function listAlbumImages(
  deviceId: string,
  albumPath: string,
  readDir: ReadDirFn
): Promise<IImageItem[]> {
  const files: IFile[] = await readDir(deviceId, albumPath)
  const parsed = parseDirListing(albumPath, files)
  const images = [...parsed.images]

  const subdirResults = await Promise.all(
    parsed.subdirs.map((subdir) =>
      readDir(deviceId, joinPath(albumPath, subdir.name))
        .then((subFiles: IFile[]) =>
          parseDirListing(joinPath(albumPath, subdir.name), subFiles)
        )
        .catch(() => null)
    )
  )
  for (let i = 0, len = subdirResults.length; i < len; i++) {
    const result = subdirResults[i]
    if (result) {
      images.push(...result.images)
    }
  }

  return images
}
