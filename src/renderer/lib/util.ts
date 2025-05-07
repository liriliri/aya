import isEmpty from 'licia/isEmpty'
import { isObservable, toJS } from 'mobx'
import { t } from '../../common/util'
import { notify } from 'share/renderer/lib/util'

export async function setMainStore(name: string, val: any) {
  await main.setMainStore(name, isObservable(val) ? toJS(val) : val)
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
    } catch {
      notify(t('installPackageErr'), { icon: 'error' })
    }
  }

  return hasSuccess
}
