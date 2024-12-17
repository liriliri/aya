import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import map from 'licia/map'
import isEmpty from 'licia/isEmpty'
import Style from './Application.module.scss'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { PannelLoading } from '../../../components/loading'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { notify, t, isFileDrop } from '../../../lib/util'
import isStrBlank from 'licia/isStrBlank'
import contain from 'licia/contain'
import lowerCase from 'licia/lowerCase'
import className from 'licia/className'
import endWith from 'licia/endWith'
import find from 'licia/find'
import chunk from 'licia/chunk'
import concat from 'licia/concat'
import Package from './Package'
import PackageInfoModal from './PackageInfoModal'

export default observer(function Application() {
  const [isLoading, setIsLoading] = useState(false)
  const [packageInfo, setPackageInfo] = useState<any>({})
  const [packageInfos, setPackageInfos] = useState<any[]>([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const [packageInfoModalVisible, setPackageInfoModalVisible] = useState(false)
  const dragging = useRef(0)

  const { device } = store

  useEffect(() => {
    refresh()

    function resize() {
      setWindowWidth(window.innerWidth)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function refresh() {
    if (!device || isLoading) {
      return
    }
    setPackageInfos([])
    setIsLoading(true)
    const packages = await main.getPackages(device.id)
    const chunks = chunk(packages, 50)
    let packageInfos: any[] = []
    for (let i = 0, len = chunks.length; i < len; i++) {
      const chunk = chunks[i]
      packageInfos = concat(
        packageInfos,
        await main.getPackageInfos(device.id, chunk)
      )
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

  const columnCount = Math.round(windowWidth / store.application.itemSize)
  const gapSize = store.application.itemSize < 150 ? 10 : 20

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

  const applications = (
    <div
      className={Style.applications}
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gap: `${gapSize}px ${gapSize}px`,
        padding: `${gapSize}px`,
      }}
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
      {map(packageInfos, (info: any) => {
        if (!isStrBlank(filter)) {
          if (!contain(lowerCase(info.label), lowerCase(filter))) {
            return null
          }
        }

        return (
          <Package
            key={info.packageName}
            {...info}
            onUninstall={refresh}
            onDisable={refresh}
            onEnable={refresh}
            onShowInfo={onShowInfo}
          />
        )
      })}
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
        <LunaToolbarText
          text={t('totalApplication', { total: packageInfos.length })}
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
          disabled={store.application.itemSize > 220 || isEmpty(packageInfos)}
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 1.2)
            store.application.set('itemSize', itemSize)
          }}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          disabled={store.application.itemSize < 120 || isEmpty(packageInfos)}
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 0.8)
            store.application.set('itemSize', itemSize)
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading}
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
