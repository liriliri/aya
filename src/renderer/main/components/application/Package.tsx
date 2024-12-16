import { useState } from 'react'
import store from '../../store'
import { notify, t } from '../../../lib/util'
import className from 'licia/className'
import defaultIcon from '../../../assets/img/default-icon.png'
import Style from './Package.module.scss'
import LunaModal from 'luna-modal'
import contextMenu from '../../../lib/contextMenu'

interface IProps {
  packageName: string
  icon: string
  label: string
  apkPath: string
  versionName: string
  enabled: boolean
  system: boolean
  onShowInfo: (packageName: string) => void
  onUninstall: () => void
  onEnable: () => void
  onDisable: () => void
}

export default function Package(props: IProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  function confirmText(key: string) {
    const ret = t(key, { name: props.label })

    if (props.system) {
      return t('sysPackageTip') + ' ' + ret
    }

    return ret
  }

  async function open() {
    try {
      await main.startPackage(store.device!.id, props.packageName)
      // eslint-disable-next-line
    } catch (e) {
      notify(t('startPackageErr'), { icon: 'error' })
    }
  }

  const onContextMenu = (e: React.MouseEvent) => {
    const device = store.device!

    const template: any[] = [
      {
        label: t('packageInfo'),
        click() {
          props.onShowInfo(props.packageName)
        },
      },
      {
        label: t('exportApk'),
        click: async () => {
          const { canceled, filePath } = await main.showSaveDialog({
            defaultPath: `${props.packageName}-${props.versionName}.apk`,
          })
          if (canceled) {
            return
          }
          await main.pullFile(device.id, props.apkPath, filePath)
          notify(t('apkExported', { path: filePath }), {
            icon: 'success',
            duration: 5000,
          })
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('open'),
        click: open,
      },
      {
        label: t('stop'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('stopPackageConfirm')
          )
          if (result) {
            await main.stopPackage(device.id, props.packageName)
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: props.enabled ? t('disablePackage') : t('enablePackage'),
        click: async () => {
          if (props.enabled) {
            const result = await LunaModal.confirm(
              confirmText('disablePackageConfirm')
            )
            if (result) {
              await main.disablePackage(device.id, props.packageName)
              await props.onDisable()
            }
          } else {
            await main.enablePackage(device.id, props.packageName)
            await props.onEnable()
          }
        },
      },
      {
        label: t('clearData'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('clearDataConfirm')
          )
          if (result) {
            await main.clearPackage(device.id, props.packageName)
            notify(t('dataCleared'), { icon: 'success' })
          }
        },
      },
      {
        label: t('uninstall'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('uninstallConfirm')
          )
          if (result) {
            await main.uninstallPackage(device.id, props.packageName)
            props.onUninstall()
          }
        },
      },
    ]

    contextMenu(e, template)
  }

  let hasDoubleClick = false

  return (
    <div
      key={props.packageName}
      title={props.packageName}
      className={className({
        [Style.openEffect]: isAnimating,
        [Style.package]: true,
      })}
      onAnimationEnd={() => setIsAnimating(false)}
      onContextMenu={onContextMenu}
      onClick={() => {
        setTimeout(() => {
          if (hasDoubleClick) {
            return
          }
          props.onShowInfo(props.packageName)
        }, 200)
      }}
      onDoubleClick={() => {
        hasDoubleClick = true
        setIsAnimating(true)
        open()
        setTimeout(() => (hasDoubleClick = false), 300)
      }}
    >
      <div
        className={className(Style.packageIcon, {
          [Style.disabled]: !props.enabled,
        })}
      >
        <img src={props.icon || defaultIcon} draggable="false" />
      </div>
      <div className={Style.packageLabel}>{props.label}</div>
    </div>
  )
}
