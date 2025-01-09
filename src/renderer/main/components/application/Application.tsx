import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import LunaIconList from 'luna-icon-list/react'
import isEmpty from 'licia/isEmpty'
import Style from './Application.module.scss'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { PannelLoading } from '../../../components/loading'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { notify, t, isFileDrop } from '../../../lib/util'
import className from 'licia/className'
import endWith from 'licia/endWith'
import find from 'licia/find'
import chunk from 'licia/chunk'
import map from 'licia/map'
import concat from 'licia/concat'
import LunaModal from 'luna-modal'
import PackageInfoModal from './PackageInfoModal'
import defaultIcon from '../../../assets/img/default-icon.png'
import contextMenu from '../../../lib/contextMenu'

export default observer(function Application() {
  const [isLoading, setIsLoading] = useState(false)
  const [packageInfo, setPackageInfo] = useState<any>({})
  const [packageInfos, setPackageInfos] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const [packageInfoModalVisible, setPackageInfoModalVisible] = useState(false)
  const [isOpenEffectAnimating, setIsOpenEffectAnimating] = useState(false)
  const [openEffectStyle, setOpenEffectStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const dragging = useRef(0)
  const icons = useRef<any[]>([])

  const { device } = store

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!device || isLoading) {
      return
    }
    setPackageInfos([])
    setIsLoading(true)
    const packages = await main.getPackages(
      device.id,
      store.application.sysPackage
    )
    const chunks = chunk(packages, 50)
    let packageInfos: any[] = []
    for (let i = 0, len = chunks.length; i < len; i++) {
      const chunk = chunks[i]
      packageInfos = concat(
        packageInfos,
        await main.getPackageInfos(device.id, chunk)
      )
      icons.current = map(packageInfos, (info) => {
        const style: any = {
          borderRadius: '20%',
        }
        if (!info.enabled) {
          style.filter = 'grayscale(100%)'
        }

        return {
          info: info,
          src: info.icon || defaultIcon,
          name: info.label,
          style,
        }
      })
      setPackageInfos(packageInfos)
    }
    setIsLoading(false)
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(false)
    const files = e.dataTransfer.files
    const apkPaths: string[] = []
    for (let i = 0, len = files.length; i < len; i++) {
      const path = preload.getPathForFile(files[i])
      if (!endWith(path, '.apk')) {
        continue
      }
      apkPaths.push(path)
    }
    await installPackages(apkPaths)
  }

  async function installPackages(apkPaths?: string[]) {
    if (!apkPaths) {
      const { filePaths } = await main.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'apk file', extensions: ['apk'] }],
      })
      if (isEmpty(filePaths)) {
        return
      }
      apkPaths = filePaths
    }

    let hasSuccess = false
    for (let i = 0, len = apkPaths!.length; i < len; i++) {
      const apkPath = apkPaths![i]
      notify(t('packageInstalling', { path: apkPath }), { icon: 'info' })
      try {
        await main.installPackage(device!.id, apkPath!)
        hasSuccess = true
        // eslint-disable-next-line
      } catch (e) {
        notify(t('installPackageErr'), { icon: 'error' })
      }
    }

    if (hasSuccess) {
      await refresh()
    }
  }

  function onShowInfo(packageName: string) {
    const packageInfo = find(
      packageInfos,
      (info) => info.packageName === packageName
    )
    if (packageInfo) {
      setPackageInfo(packageInfo)
      setPackageInfoModalVisible(true)
    }
  }

  function confirmText(key: string, info: any) {
    const ret = t(key, { name: info.label })

    if (info.system) {
      return t('sysPackageTip') + ' ' + ret
    }

    return ret
  }

  async function open(packageName: string) {
    try {
      await main.startPackage(store.device!.id, packageName)
      // eslint-disable-next-line
    } catch (e) {
      notify(t('startPackageErr'), { icon: 'error' })
    }
  }

  function onContextMenu(e: PointerEvent, info: any) {
    const device = store.device!

    const template: any[] = [
      {
        label: t('packageInfo'),
        click() {
          onShowInfo(info.packageName)
        },
      },
      {
        label: t('exportApk'),
        click: async () => {
          const { canceled, filePath } = await main.showSaveDialog({
            defaultPath: `${info.packageName}-${info.versionName}.apk`,
          })
          if (canceled) {
            return
          }
          await main.pullFile(device.id, info.apkPath, filePath)
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
        click: () => open(info.packageName),
      },
      {
        label: t('stop'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('stopPackageConfirm', info)
          )
          if (result) {
            await main.stopPackage(device.id, info.packageName)
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('disablePackage'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('disablePackageConfirm', info)
          )
          if (result) {
            await main.disablePackage(device.id, info.packageName)
            refresh()
          }
        },
      },
      {
        label: t('enablePackage'),
        click: async () => {
          await main.enablePackage(device.id, info.packageName)
          refresh()
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('clearData'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('clearDataConfirm', info)
          )
          if (result) {
            await main.clearPackage(device.id, info.packageName)
            notify(t('dataCleared'), { icon: 'success' })
          }
        },
      },
      {
        label: t('uninstall'),
        click: async () => {
          const result = await LunaModal.confirm(
            confirmText('uninstallConfirm', info)
          )
          if (result) {
            await main.uninstallPackage(device.id, info.packageName)
            refresh()
          }
        },
      },
    ]

    contextMenu(e, template)
  }

  const applications = (
    <div
      onDrop={onDrop}
      onDragEnter={() => {
        dragging.current++
      }}
      onDragLeave={() => {
        dragging.current--
        if (dragging.current === 0) {
          setDropHighlight(false)
        }
      }}
      onDragOver={(e) => {
        if (!isFileDrop(e)) {
          return
        }
        e.preventDefault()
        setDropHighlight(true)
      }}
    >
      <LunaIconList
        icons={icons.current}
        size={store.application.itemSize}
        selectable={false}
        filter={filter}
        onClick={(e: any, icon) => {
          const info = (icon.data as any).info
          onShowInfo(info.packageName)
        }}
        onDoubleClick={(e: any, icon) => {
          const info = (icon.data as any).info
          const container: HTMLElement = icon.container
          const clientRect = container.getBoundingClientRect()
          setOpenEffectStyle({
            left: clientRect.left,
            top: clientRect.top - 60,
            width: clientRect.width,
            height: clientRect.width,
          })
          open(info.packageName)
          setIsOpenEffectAnimating(true)
        }}
        onContextMenu={(e: any, icon) => {
          onContextMenu(e, (icon.data as any).info)
        }}
      />
      <div
        className={className({
          [Style.openEffect]: true,
          [Style.openEffectAnimation]: isOpenEffectAnimating,
        })}
        style={openEffectStyle}
        onAnimationEnd={() => setIsOpenEffectAnimating(false)}
      />
    </div>
  )

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarCheckbox
          keyName="sysPackage"
          value={store.application.sysPackage}
          label={t('sysPackage')}
          onChange={(val) => {
            store.application.set('sysPackage', val)
            refresh()
          }}
          disabled={isLoading}
        />
        <LunaToolbarSeparator />
        <LunaToolbarText
          text={t('totalPackage', { total: packageInfos.length })}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="add"
          title={t('install')}
          onClick={() => installPackages()}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="zoom-in"
          title={t('zoomIn')}
          disabled={store.application.itemSize > 256 || isEmpty(packageInfos)}
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 1.2)
            store.application.set('itemSize', itemSize)
          }}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          disabled={store.application.itemSize < 32 || isEmpty(packageInfos)}
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 0.8)
            store.application.set('itemSize', itemSize)
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading || !device}
          onClick={refresh}
        />
      </LunaToolbar>
      <div
        className={className('panel-body', {
          [Style.highlight]: dropHighlight,
        })}
      >
        {isLoading && isEmpty(packageInfos) ? <PannelLoading /> : applications}
      </div>
      {!isEmpty(packageInfo) && (
        <PackageInfoModal
          packageInfo={packageInfo}
          visible={packageInfoModalVisible}
          onClose={() => setPackageInfoModalVisible(false)}
        />
      )}
    </div>
  )
})
