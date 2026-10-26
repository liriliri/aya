import { IFile } from 'luna-file-list'
import uuid from 'licia/uuid'
import { joinPath } from './scanner'

export type BackendId = 'main' | 'xspace'

export interface IStorageBackend {
  id: BackendId
  label: string
  listDir(deviceId: string, path: string): Promise<IFile[]>
  deleteFile(deviceId: string, path: string): Promise<void>
  copyFile(deviceId: string, src: string, dest: string): Promise<void>
  fileUrl(deviceId: string, path: string): Promise<string>
  detectRoot(deviceId: string): Promise<string | null>
}

function explainXspaceError(err: any): string {
  const msg = err?.message || String(err || '')
  if (msg.includes('helper_missing')) {
    return '手机上还没有安装隐私空间助手'
  }
  if (msg.includes('helper_offline')) {
    return '助手没有在运行。请先打开手机上的「AYA 隐私空间助手」,并保持 USB 调试连接'
  }
  if (msg.includes('helper_token_missing')) {
    return '无法读取隐私空间助手的访问令牌,请重新打开助手后重试'
  }
  return msg || '隐私空间操作失败'
}

async function mainCopy(deviceId: string, src: string, dest: string) {
  // 主空间没有设备端复制接口,经电脑临时目录中转(拉取 → 推回)
  const temp = await main.getPath('temp')
  const dot = dest.lastIndexOf('.')
  const ext = dot > 0 ? dest.slice(dot) : ''
  const pcTemp = `${temp}/aya-album-${uuid()}${ext}`
  await main.pullFile(deviceId, src, pcTemp)
  await main.pushFile(deviceId, pcTemp, dest)
}

const mainBackend: IStorageBackend = {
  id: 'main',
  label: '主空间',
  async listDir(deviceId, path) {
    return main.readDir(deviceId, path)
  },
  async deleteFile(deviceId, path) {
    await main.deleteFile(deviceId, path)
  },
  copyFile: mainCopy,
  async fileUrl(deviceId, path) {
    return main.getFileUrl(deviceId, path)
  },
  async detectRoot() {
    return null
  },
}

const xspaceBackend: IStorageBackend = {
  id: 'xspace',
  label: '隐私空间',
  async listDir(deviceId, path) {
    const result = await main.xspaceList(deviceId, path)
    return result.entries as IFile[]
  },
  async deleteFile(deviceId, path) {
    await main.xspaceEdit(deviceId, 'delete', path)
  },
  async copyFile(deviceId, src, dest) {
    // 助手在设备端直接复制,无需经电脑中转
    await main.xspaceEdit(deviceId, 'copy', src, dest)
  },
  async fileUrl(deviceId, path) {
    return main.xspaceFileUrl(deviceId, path)
  },
  async detectRoot(deviceId) {
    // 助手缺失/离线等错误原样抛出,由调用方给出中文提示
    const result = await main.xspaceList(deviceId, '')
    return result.root || null
  },
}

const backends: { [id in BackendId]: IStorageBackend } = {
  main: mainBackend,
  xspace: xspaceBackend,
}

export function getBackend(id: BackendId): IStorageBackend {
  return backends[id]
}

export { explainXspaceError, joinPath }
