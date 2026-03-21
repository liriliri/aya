import { observer } from 'mobx-react-lite'
import Style from './Webview.module.scss'
import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import LunaSplitPane, { LunaSplitPaneItem } from 'luna-split-pane/react'
import { useEffect, useRef, useState } from 'react'
import { t } from 'common/util'
import toEl from 'licia/toEl'
import LunaDataGrid from 'luna-data-grid/react'
import map from 'licia/map'
import copy from 'licia/copy'
import store from '../../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import DataGrid from 'luna-data-grid'
import { useWindowResize } from 'share/renderer/lib/hooks'
import { notify } from 'share/renderer/lib/util'
import { IWebview } from 'common/types'
import { parseWebviewUrl } from './urlParser'

export default observer(function Webview() {
  const [webviews, setWebviews] = useState<IWebview[]>([])
  const [selected, setSelected] = useState<IWebview | null>(null)
  const [topPackage, setTopPackage] = useState({
    name: '',
    label: '',
    pid: 0,
  })
  const dataGridRef = useRef<DataGrid>(null)
  const [filter, setFilter] = useState('')
  const [weights, setWeights] = useState([75, 25])
  const [detailWeights, setDetailWeights] = useState([56, 44])

  const { device } = store
  const parsedUrl = selected ? parseWebviewUrl(selected.url) : null
  const basicInfo = parsedUrl
    ? [
        { label: t('protocol'), value: parsedUrl.basic.protocol },
        { label: t('hostname'), value: parsedUrl.basic.hostname },
        { label: t('port'), value: parsedUrl.basic.port },
        { label: t('origin'), value: parsedUrl.basic.origin },
        { label: t('pathname'), value: parsedUrl.basic.pathname },
        { label: t('query'), value: parsedUrl.basic.search },
        { label: t('hashPath'), value: parsedUrl.basic.hashPath },
        { label: t('hashQuery'), value: parsedUrl.basic.hashQuery },
      ]
    : []

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

  function copyUrl() {
    if (!selected) {
      return
    }

    copy(selected.url)
    notify(t('copied'), { icon: 'info' })
  }

  return (
    <div className="panel-with-toolbar">
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
            let url = selected!.devtoolsFrontendUrl
            if (store.webview.useLocalInspector) {
              url = 'devtools://devtools/bundled/inspector.html'
              url += `?ws=${selected!.webSocketDebuggerUrl.replace(
                'ws://',
                ''
              )}`
            }
            main.openWindow(url, 'devtools')
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          disabled={selected === null}
          icon="browser"
          title={t('openWithBrowser')}
          onClick={() => main.openExternal(selected!.url)}
        />
      </LunaToolbar>
      <div className={Style.content}>
        <LunaSplitPane
          direction="vertical"
          onResize={(newWeights) => {
            setWeights(newWeights)
            dataGridRef.current?.fit()
          }}
        >
          <LunaSplitPaneItem minSize={180} weight={weights[0]}>
            <LunaDataGrid
              onSelect={async (node) => setSelected(node.data as any)}
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
          </LunaSplitPaneItem>
          <LunaSplitPaneItem minSize={96} weight={weights[1]}>
            <div className={Style.detail}>
              <LunaSplitPane
                className={Style.detailSplit}
                direction="horizontal"
                onResize={setDetailWeights}
              >
                <LunaSplitPaneItem minSize={220} weight={detailWeights[0]}>
                  <div className={Style.detailPanel}>
                    <div className={Style.detailHeader}>
                      <div className={Style.detailTitle}>URL</div>
                      <button
                        type="button"
                        className={Style.copyButton}
                        disabled={selected === null}
                        onClick={copyUrl}
                      >
                        {t('copy')}
                      </button>
                    </div>
                    <div
                      className={`${Style.detailBody} ${
                        selected ? '' : Style.detailBodyEmpty
                      }`}
                    >
                      {selected ? selected.url : t('noWebviewSelected')}
                    </div>
                  </div>
                </LunaSplitPaneItem>
                <LunaSplitPaneItem minSize={220} weight={detailWeights[1]}>
                  <div className={Style.detailPanel}>
                    <div className={Style.detailHeader}>
                      <div className={Style.detailTitle}>
                        {t('urlAnalysis')}
                      </div>
                    </div>
                    <div className={Style.analysisBody}>
                      {!selected && (
                        <div
                          className={`${Style.detailBody} ${Style.detailBodyEmpty}`}
                        >
                          {t('noWebviewSelected')}
                        </div>
                      )}
                      {selected && parsedUrl && (
                        <>
                          {parsedUrl.error && (
                            <div
                              className={`${Style.message} ${Style.messageError}`}
                            >
                              <div className={Style.messageTitle}>
                                {t('urlParseError')}
                              </div>
                              <div className={Style.messageText}>
                                {parsedUrl.error}
                              </div>
                            </div>
                          )}
                          {parsedUrl.warnings.length > 0 && (
                            <div
                              className={`${Style.message} ${Style.messageWarning}`}
                            >
                              <div className={Style.messageTitle}>
                                {t('warnings')}
                              </div>
                              <div className={Style.messageList}>
                                {map(parsedUrl.warnings, (warning, index) => (
                                  <div key={index} className={Style.messageText}>
                                    {warning}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!parsedUrl.error && (
                            <>
                              <section className={Style.section}>
                                <div className={Style.sectionTitle}>
                                  {t('basicInfo')}
                                </div>
                                <div className={Style.infoList}>
                                  {map(basicInfo, (item) => (
                                    <div
                                      key={item.label}
                                      className={Style.infoRow}
                                    >
                                      <div className={Style.infoLabel}>
                                        {item.label}
                                      </div>
                                      <div className={Style.infoValue}>
                                        {item.value || '-'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                              <section className={Style.section}>
                                <div className={Style.sectionTitle}>
                                  {t('params')}
                                </div>
                                {parsedUrl.params.length > 0 ? (
                                  <div className={Style.paramList}>
                                    {map(parsedUrl.params, (param, index) => (
                                      <div
                                        key={`${param.source}-${param.key}-${index}`}
                                        className={Style.paramItem}
                                      >
                                        <div className={Style.paramKey}>
                                          {param.key}
                                        </div>
                                        <div className={Style.paramValue}>
                                          {param.value || '-'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={Style.emptyText}>
                                    {t('noParams')}
                                  </div>
                                )}
                              </section>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </LunaSplitPaneItem>
              </LunaSplitPane>
            </div>
          </LunaSplitPaneItem>
        </LunaSplitPane>
      </div>
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
