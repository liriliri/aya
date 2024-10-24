import Toolbar from './components/toolbar/Toolbar'
import Logcat from './components/logcat/Logcat'
import Shell from './components/shell/Shell'
import Overview from './components/overview/Overview'
import Style from './App.module.scss'
import LunaModal from 'luna-modal/react'
import { t } from '../lib/util'
import { CSSProperties, useState, useEffect, PropsWithChildren, FC } from 'react'
import { createPortal } from 'react-dom'
import store from './store'
import { observer } from 'mobx-react-lite'

export default observer(function App() {
  const [aboutVisible, setAboutVisible] = useState(false)

  useEffect(() => {
    const showAbout = () => setAboutVisible(true)
    main.on('showAbout', showAbout)
    return () => {
      main.off('showAbout', showAbout)
    }
  }, [])

  return (
    <>
      <Toolbar />
      <div className={Style.workspace}>
        <div className={Style.panels} key={store.device ? store.device.id : ''}>
          <Panel panel="overview">
            <Overview />
          </Panel>
          <Panel panel="logcat">
            <Logcat />
          </Panel>
          <Panel panel="shell">
            <Shell />
          </Panel>
        </div>
      </div>
      {createPortal(
        <LunaModal
          title={t('aboutAya')}
          visible={aboutVisible}
          width={400}
          onClose={() => setAboutVisible(false)}
        >
          <div className={Style.about}>
            <div>AYA</div>
            <div>
              {t('version')} {AYA_VERSION}
            </div>
          </div>
        </LunaModal>,
        document.body
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
  const [visible, setVisible] = useState(false)

  const style: CSSProperties = {}
  if (!visible) {
    style.visibility = 'hidden'
    style.pointerEvents = 'none'
  }

  useEffect(() => {
    if (store.panel === props.panel) {
      setUsed(true)
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [store.panel])

  return (
    <div className={Style.panel} style={style}>
      {used ? props.children : null}
    </div>
  )
})
