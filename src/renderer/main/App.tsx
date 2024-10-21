import Toolbar from './components/toolbar/Toolbar'
import Logcat from './components/logcat/Logcat'
import Shell from './components/shell/Shell'
import Style from './App.module.scss'
import LunaModal from 'luna-modal/react'
import { t } from '../lib/util'
import { useState, useEffect, lazy } from 'react'
import { createPortal } from 'react-dom'

export default function App() {
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
        <div className={Style.panel}>
          <Logcat />
          <Shell />
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
}
