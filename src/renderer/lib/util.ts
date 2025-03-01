import h from 'licia/h'
import contain from 'licia/contain'
import isEmpty from 'licia/isEmpty'
import LunaNotification, { INotifyOptions } from 'luna-notification'
import { isObservable, toJS } from 'mobx'
import { t } from '../../common/util'

let notification: LunaNotification | null = null

export function notify(content: string, options?: INotifyOptions) {
  if (!notification) {
    const div = h('div')
    document.body.appendChild(div)
    notification = new LunaNotification(div, {
      position: {
        x: 'center',
        y: 'top',
      },
    })
  }

  notification.notify(content, options)
}

export async function setMainStore(name: string, val: any) {
  await main.setMainStore(name, isObservable(val) ? toJS(val) : val)
}

export async function setMemStore(name: string, val: any) {
  await main.setMemStore(name, isObservable(val) ? toJS(val) : val)
}

export function isFileDrop(e: React.DragEvent) {
  return contain(e.dataTransfer.types, 'Files')
}

export async function installPackages(deviceId: string, apkPaths?: string[]) {
  let hasSuccess = false

  if (!apkPaths) {
    const { filePaths } = await main.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'apk file', extensions: ['apk'] }],
    })
    if (isEmpty(filePaths)) {
      return hasSuccess
    }
    apkPaths = filePaths
  }

  for (let i = 0, len = apkPaths!.length; i < len; i++) {
    const apkPath = apkPaths![i]
    notify(t('packageInstalling', { path: apkPath }), { icon: 'info' })
    try {
      await main.installPackage(deviceId, apkPath!)
      hasSuccess = true
      // eslint-disable-next-line
    } catch (e) {
      notify(t('installPackageErr'), { icon: 'error' })
    }
  }

  return hasSuccess
}
