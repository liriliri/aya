import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import LunaIconList from 'luna-icon-list/react'
import LunaDataGrid from 'luna-data-grid/react'
import isEmpty from 'licia/isEmpty'
import isNull from 'licia/isNull'
import Style from './Application.module.scss'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { PannelLoading } from '../common/loading'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { installPackages } from '../../../lib/util'
import { notify, isFileDrop } from 'share/renderer/lib/util'
import { t } from 'common/util'
import className from 'licia/className'
import endWith from 'licia/endWith'
import find from 'licia/find'
import chunk from 'licia/chunk'
import map from 'licia/map'
import concat from 'licia/concat'
import clone from 'licia/clone'
import LunaModal from 'luna-modal'
import findIdx from 'licia/findIdx'
import PackageInfoModal from './PackageInfoModal'
import { IPackageInfo } from 'common/types'
import defaultIcon from '../../../assets/default-icon.png'
import contextMenu from 'share/renderer/lib/contextMenu'
import dateFormat from 'licia/dateFormat'
import toEl from 'licia/toEl'
import DataGrid from 'luna-data-grid'
import { useWindowResize } from 'share/renderer/lib/hooks'
import fileSize from 'licia/fileSize'
import jsonClone from 'licia/jsonClone'

export default observer(function Application() {
  const [isLoading, setIsLoading] = useState(false)
  const [packageInfo, setPackageInfo] = useState<IPackageInfo | null>(null)
  const [packageInfos, setPackageInfos] = useState<IPackageInfo[]>([])
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const dataGridRef = useRef<DataGrid>(null)
  const [packageInfoModalVisible, setPackageInfoModalVisible] = useState(false)
  const [isOpenEffectAnimating, setIsOpenEffectAnimating] = useState(false)
  const [openEffectStyle, setOpenEffectStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const draggingRef = useRef(0)
  const iconsRef = useRef<any[]>([])

  const { device } = store

  useEffect(() => {
    refresh()
  }, [])
  useWindowResize(() => dataGridRef.current?.fit())

  async function refresh(packageName?: string) {
    if (!device || isLoading) {
      return
    }
    if (!packageName) {
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
        iconsRef.current = map(packageInfos, (info) => {
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
    } else {
      const idx = findIdx(
        packageInfos,
        (info) => info.packageName === packageName
      )
      if (idx !== -1) {
        const infos = await main.getPackageInfos(device.id, [packageName])
        const info = infos[0]
        packageInfos[idx] = info
        const style: any = {
          borderRadius: '20%',
        }
        if (!info.enabled) {
          style.filter = 'grayscale(100%)'
        }
        iconsRef.current[idx] = {
          info: info,
          src: info.icon || defaultIcon,
          name: info.label,
          style,
        }
        iconsRef.current = clone(iconsRef.current)
        setPackageInfos(clone(packageInfos))
      }
    }
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
    await install(apkPaths)
  }

  async function install(apkPaths?: string[]) {
    const result = await installPackages(device!.id, apkPaths)
    if (result) {
      refresh()
    }
  }

  function showInfo(packageName: string) {
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
    } catch {
      notify(t('startPackageErr'), { icon: 'error' })
    }
  }

  function onContextMenu(e: PointerEvent, info: IPackageInfo) {
    const device = store.device!

    const template: any[] = [
      {
        label: t('packageInfo'),
        click() {
          showInfo(info.packageName)
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
            refresh(info.packageName)
          }
        },
      },
      {
        label: t('enablePackage'),
        click: async () => {
          await main.enablePackage(device.id, info.packageName)
          refresh(info.packageName)
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
            setTimeout(() => refresh(info.packageName), 1000)
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
      className={Style.applications}
      style={{
        overflowY: store.application.listView ? 'hidden' : 'auto',
      }}
      onDrop={onDrop}
      onDragEnter={() => {
        draggingRef.current++
      }}
      onDragLeave={() => {
        draggingRef.current--
        if (draggingRef.current === 0) {
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
      {store.application.listView ? (
        <LunaDataGrid
          onColumnChange={async () => {
            const columns = dataGridRef.current!.getOption('columns')
            store.application.set('dataGridColumns', jsonClone(columns))
          }}
          onClick={(e: any, node) => {
            showInfo((node.data as any).packageName)
          }}
          onDoubleClick={(e: any, node) => {
            open((node.data as any).packageName)
          }}
          onContextMenu={(e: any, node) => {
            onContextMenu(e, (node.data as any).info)
          }}
          headerContextMenu={true}
          filter={filter}
          columns={columns}
          data={map(packageInfos, (info: IPackageInfo) => {
            return {
              info,
              label: toEl(
                `<span><img src="${info.icon || defaultIcon}" />${
                  info.label
                }</span>`
              ),
              packageName: info.packageName,
              versionName: info.versionName,
              minSdkVersion: info.minSdkVersion,
              targetSdkVersion: info.targetSdkVersion,
              storageUsage: fileSize(
                info.appSize + info.dataSize + info.cacheSize
              ),
              appSize: fileSize(info.appSize),
              dataSize: fileSize(info.dataSize),
              cacheSize: fileSize(info.cacheSize),
              enabled: info.enabled ? t('enabled') : t('disabled'),
              firstInstallTime: dateFormat(
                new Date(info.firstInstallTime),
                'yyyy-mm-dd HH:MM:ss'
              ),
              lastUpdateTime: dateFormat(
                new Date(info.lastUpdateTime),
                'yyyy-mm-dd HH:MM:ss'
              ),
            }
          })}
          selectable={true}
          uniqueId="packageName"
          onCreate={(dataGrid) => {
            dataGridRef.current = dataGrid
            dataGrid.fit()
            dataGrid.setOption('columns', store.application.dataGridColumns)
          }}
        />
      ) : (
        <LunaIconList
          icons={iconsRef.current}
          size={store.application.itemSize}
          filter={filter}
          onClick={(e: any, icon) => {
            const info = (icon.data as any).info
            showInfo(info.packageName)
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
      )}
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
          onClick={() => install()}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="zoom-in"
          title={t('zoomIn')}
          disabled={
            store.application.listView ||
            store.application.itemSize > 256 ||
            isEmpty(packageInfos)
          }
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 1.2)
            store.application.set('itemSize', itemSize)
          }}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          disabled={
            store.application.listView ||
            store.application.itemSize < 32 ||
            isEmpty(packageInfos)
          }
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 0.8)
            store.application.set('itemSize', itemSize)
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="grid"
          title={t('iconView')}
          state={store.application.listView ? '' : 'hover'}
          onClick={() => {
            if (store.application.listView) {
              store.application.set('listView', false)
            }
          }}
        />
        <ToolbarIcon
          icon="list"
          title={t('listView')}
          state={store.application.listView ? 'hover' : ''}
          onClick={() => {
            if (!store.application.listView) {
              store.application.set('listView', true)
            }
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading || !device}
          onClick={() => refresh()}
        />
      </LunaToolbar>
      <div
        className={className('panel-body', {
          [Style.highlight]: dropHighlight,
        })}
      >
        {isLoading && isEmpty(packageInfos) ? <PannelLoading /> : applications}
      </div>
      {!isNull(packageInfo) && (
        <PackageInfoModal
          packageInfo={packageInfo}
          visible={packageInfoModalVisible}
          onClose={() => setPackageInfoModalVisible(false)}
        />
      )}
    </div>
  )
})

function sizeCmp(a: string, b: string) {
  return fileSize(a) - fileSize(b)
}

const columns = [
  {
    id: 'label',
    title: t('name'),
    sortable: true,
    weight: 20,
  },
  {
    id: 'packageName',
    title: t('package'),
    sortable: true,
    weight: 25,
  },
  {
    id: 'versionName',
    title: t('version'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'minSdkVersion',
    title: t('minSdkVersion'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'targetSdkVersion',
    title: t('targetSdkVersion'),
    sortable: true,
    visible: false,
    weight: 10,
  },
  {
    id: 'storageUsage',
    title: t('storageUsage'),
    sortable: true,
    comparator: sizeCmp,
    weight: 10,
  },
  {
    id: 'appSize',
    title: t('appSize'),
    sortable: true,
    comparator: sizeCmp,
    visible: false,
    weight: 10,
  },
  {
    id: 'dataSize',
    title: t('dataSize'),
    sortable: true,
    comparator: sizeCmp,
    visible: false,
    weight: 10,
  },
  {
    id: 'cacheSize',
    title: t('cacheSize'),
    sortable: true,
    comparator: sizeCmp,
    visible: false,
    weight: 10,
  },
  {
    id: 'enabled',
    title: t('status'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'firstInstallTime',
    title: t('firstInstallTime'),
    sortable: true,
    visible: false,
    weight: 15,
  },
  {
    id: 'lastUpdateTime',
    title: t('lastUpdateTime'),
    sortable: true,
    visible: false,
    weight: 15,
  },
]
