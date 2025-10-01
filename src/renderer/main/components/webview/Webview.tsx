import { observer } from 'mobx-react-lite'
import Style from './Webview.module.scss'
import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../../../common/util'
import toEl from 'licia/toEl'
import LunaDataGrid from 'luna-data-grid/react'
import map from 'licia/map'
import className from 'licia/className'
import store from '../../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import DataGrid from 'luna-data-grid'
import { useWindowResize } from 'share/renderer/lib/hooks'

export default observer(function Webview() {
  const [webviews, setWebviews] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [topPackage, setTopPackage] = useState({
    name: '',
    label: '',
    pid: 0,
  })
  const dataGridRef = useRef<DataGrid>(null)
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
          } catch {
            // ignore
          }
        }
      }
      if (!destroyed) {
        setTimeout(getWebviews, 2000)
      }
    }

    getWebviews()

    return () => {
      destroyed = true
    }
  }, [])

  useWindowResize(() => dataGridRef.current?.fit())

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
        <LunaToolbarCheckbox
          keyName="useLocalInspector"
          value={store.webview.useLocalInspector}
          label={t('useLocalInspector')}
          onChange={(val) => {
            store.webview.set('useLocalInspector', val)
          }}
        />
        <ToolbarIcon
          disabled={selected === null}
          icon="debug"
          title={t('inspect')}
          onClick={() => {
            let url = selected.devtoolsFrontendUrl
            if (store.webview.useLocalInspector) {
              url = 'devtools://devtools/bundled/inspector.html'
              url += `?ws=${selected.webSocketDebuggerUrl.replace('ws://', '')}`
            }
            main.openWindow(url, 'devtools')
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          disabled={selected === null}
          icon="browser"
          title={t('openWithBrowser')}
          onClick={() => main.openExternal(selected.url)}
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
        uniqueId="id"
        onCreate={(dataGrid) => {
          dataGridRef.current = dataGrid
          dataGrid.fit()
        }}
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
