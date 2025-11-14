import Toolbar from './components/toolbar/Toolbar'
import Logcat from './components/logcat/Logcat'
import Shell from './components/shell/Shell'
import Overview from './components/overview/Overview'
import Screenshot from './components/screenshot/Screenshot'
import Process from './components/process/Process'
import Performance from './components/performance/Performance'
import Webview from './components/webview/Webview'
import Application from './components/application/Application'
import File from './components/file/File'
import Layout from './components/layout/Layout'
import Style from './App.module.scss'
import Modal from 'luna-modal'
import { t } from 'common/util'
import { useState, useEffect, PropsWithChildren, FC } from 'react'
import store from './store'
import { observer } from 'mobx-react-lite'

export default observer(function App() {
  useEffect(() => {
    const offUpdateError = main.on('updateError', () => {
      Modal.alert(t('updateErr'))
    })
    const offUpdateNotAvailable = main.on('updateNotAvailable', () => {
      Modal.alert(t('updateNotAvailable'))
    })
    const offUpdateAvailable = main.on('updateAvailable', async () => {
      const result = await Modal.confirm(t('updateAvailable'))
      if (result) {
        main.openExternal('https://aya.liriliri.io')
      }
    })
    return () => {
      offUpdateError()
      offUpdateNotAvailable()
      offUpdateAvailable()
    }
  }, [])

  return (
    <>
      <Toolbar />
      {store.ready && (
        <div className={Style.workspace}>
          <div
            className={Style.panels}
            key={store.device ? store.device.id : ''}
          >
            <Panel panel="overview">
              <Overview />
            </Panel>
            <Panel panel="application">
              <Application />
            </Panel>
            <Panel panel="screenshot">
              <Screenshot />
            </Panel>
            <Panel panel="logcat">
              <Logcat />
            </Panel>
            <Panel panel="shell">
              <Shell />
            </Panel>
            <Panel panel="process">
              <Process />
            </Panel>
            <Panel panel="performance">
              <Performance />
            </Panel>
            <Panel panel="webview">
              <Webview />
            </Panel>
            <Panel panel="file">
              <File />
            </Panel>
            <Panel panel="layout">
              <Layout />
            </Panel>
          </div>
        </div>
      )}
    </>
  )
})

interface IPanelProps {
  panel: string
}

const Panel: FC<PropsWithChildren<IPanelProps>> = observer(function Panel(
  props
) {
  const [used, setUsed] = useState(false)

  let visible = false

  if (store.panel === props.panel) {
    if (!used) {
      setUsed(true)
    }
    visible = true
  }

  const style: React.CSSProperties = {}
  if (!visible) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }

  return (
    <div className={Style.panel} style={style}>
      {used ? props.children : null}
    </div>
  )
})
