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
import { useEffect, useState } from 'react'
import store from '../../store'
import { PannelLoading } from '../../../components/loading'
import className from 'licia/className'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { notify, t } from '../../../lib/util'
import isStrBlank from 'licia/isStrBlank'
import contain from 'licia/contain'
import lowerCase from 'licia/lowerCase'
import defaultIcon from '../../../assets/img/default-icon.png'

export default observer(function Application() {
  const [isLoading, setIsLoading] = useState(false)
  const [packageInfos, setPackageInfos] = useState<any[]>([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [filter, setFilter] = useState('')

  const { device } = store

  useEffect(() => {
    getAllPackageInfos()

    function resize() {
      setWindowWidth(window.innerWidth)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function getAllPackageInfos() {
    if (!device || isLoading) {
      return
    }

    setIsLoading(true)
    const packages = await main.getPackages(device.id)
    const packageInfos = await main.getPackageInfos(device.id, packages)
    setPackageInfos(packageInfos)
    setIsLoading(false)
  }

  const columnCount = Math.round(windowWidth / store.application.itemSize)
  const gapSize = store.application.itemSize < 150 ? 10 : 20

  const applications = (
    <div
      className={Style.applications}
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gap: `${gapSize}px ${gapSize}px`,
        padding: `${gapSize}px`,
      }}
    >
      {map(packageInfos, (info: any) => {
        if (!isStrBlank(filter)) {
          if (!contain(lowerCase(info.label), lowerCase(filter))) {
            return null
          }
        }

        return <App {...info} />
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
          onClick={getAllPackageInfos}
        />
      </LunaToolbar>
      <div className="panel-body">
        {isLoading ? <PannelLoading /> : applications}
      </div>
    </div>
  )
})

interface IAppProps {
  packageName: string
  icon: string
  label: string
}

function App(props: IAppProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  async function start() {
    setIsAnimating(true)
    try {
      await main.startPackage(store.device!.id, props.packageName)
      // eslint-disable-next-line
    } catch (e) {
      notify(t('startPackageErr'), { icon: 'error' })
    }
  }

  return (
    <div
      key={props.packageName}
      title={props.packageName}
      className={className({
        [Style.openEffect]: isAnimating,
        [Style.application]: true,
      })}
      onAnimationEnd={() => setIsAnimating(false)}
      onClick={start}
    >
      <div className={Style.applicationIcon}>
        <img src={props.icon || defaultIcon} draggable="false" />
      </div>
      <div className={Style.applicationLabel}>{props.label}</div>
    </div>
  )
}
