import { observer } from 'mobx-react-lite'
import Style from './Webview.module.scss'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import { useEffect, useState } from 'react'
import { t } from '../../../../common/util'
import toEl from 'licia/toEl'
import LunaDataGrid from 'luna-data-grid/react'
import map from 'licia/map'
import className from 'licia/className'
import store from '../../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import PortMappingModal from './PortMappingModal'

export default observer(function Webview() {
  const [portModalVisible, setPortModalVisible] = useState(false)
  const [webviews, setWebviews] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [topPackage, setTopPackage] = useState({
    name: '',
    label: '',
    pid: 0,
  })
  const [listHeight, setListHeight] = useState(0)
  const [filter, setFilter] = useState('')

  const { device } = store

  useEffect(() => {
    let destroyed = false

    async function getWebviews() {
      if (device) {
        if (store.panel === 'webview') {
          try {
            const topPackage = await main.getTopPackage(device.id)
            if (topPackage.name) {
              const packageInfos = await main.getPackageInfos(device.id, [
                topPackage.name,
              ])
              setTopPackage({
                ...topPackage,
                label: packageInfos[0].label,
              })
            }
            if (topPackage.pid) {
              const webviews = await main.getWebviews(device.id, topPackage.pid)
              setWebviews(
                map(webviews, (webview: any) => {
                  const title = webview.faviconUrl
                    ? toEl(
                        `<span><img src="${webview.faviconUrl}" />${webview.title}</span>`
                      )
                    : webview.title

                  return {
                    ...webview,
                    title,
                  }
                })
              )
            }
            /* eslint-disable @typescript-eslint/no-unused-vars, no-empty */
          } catch (e) {}
        }
      }
      if (!destroyed) {
        setTimeout(getWebviews, 2000)
      }
    }

    getWebviews()

    function resize() {
      const height = window.innerHeight - 89
      setListHeight(height)
    }
    resize()

    window.addEventListener('resize', resize)

    return () => {
      destroyed = true

      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className={className('panel-with-toolbar', Style.conatiner)}>
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarText text={topPackage ? topPackage.label : ''} />
        <LunaToolbarSpace />
        <ToolbarIcon
          disabled={selected === null}
          icon="debug"
          title={t('inspect')}
          onClick={() => window.open(selected.devtoolsFrontendUrl)}
        />
        <ToolbarIcon
          disabled={selected === null}
          icon="browser"
          title={t('openWithBrowser')}
          onClick={() => main.openExternal(selected.url)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="bidirection"
          title={t('portMapping')}
          onClick={() => setPortModalVisible(true)}
        />
      </LunaToolbar>
      <LunaDataGrid
        onSelect={async (node) => setSelected(node.data)}
        onDeselect={() => setSelected(null)}
        className={Style.webviews}
        filter={filter}
        columns={columns}
        data={webviews}
        selectable={true}
        minHeight={listHeight}
        maxHeight={listHeight}
        uniqueId="id"
      />
      <PortMappingModal
        visible={portModalVisible}
        onClose={() => setPortModalVisible(false)}
      />
    </div>
  )
})

const columns = [
  {
    id: 'title',
    title: t('title'),
    sortable: true,
    weight: 20,
  },
  {
    id: 'url',
    title: 'URL',
    sortable: true,
  },
  {
    id: 'type',
    title: t('type'),
    sortable: true,
    weight: 10,
  },
]
