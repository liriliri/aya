export interface ILatestImage {
  path: string
  mtime: number
}

export interface IAlbum {
  name: string
  path: string
  count: number
  ownCount: number
  latest: ILatestImage | null
}

export interface IImageItem {
  path: string
  name: string
  mtime: number
  size: number
}

export interface IDirStat {
  imgCount: number
  latest: ILatestImage | null
  subdirs: string[]
  subdirMtimes: number[]
  noMedia: boolean
  mtime: number
}

export interface IScanCache {
  [path: string]: IDirStat
}

export interface IScanStats {
  readDirs: number
  reusedDirs: number
  images: number
}

export interface IScanResult {
  albums: IAlbum[]
  cache: IScanCache
  stats: IScanStats
}

export type AlbumSortBy = 'count' | 'time'
export type GridSize = 'small' | 'medium' | 'large'
export type ImageSortBy = 'name' | 'time'
