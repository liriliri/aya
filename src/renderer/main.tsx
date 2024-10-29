import isMac from 'licia/isMac'
import { lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from './lib/util'
import { isDev } from '../common/util'
import hotKey from 'licia/hotkey'
import './main.scss'
import './icon.css'
import 'luna-toolbar/css'
import 'luna-tab/css'
import 'luna-modal/css'
import 'luna-setting/css'
import 'luna-notification/css'
import 'luna-image-viewer/css'
import 'luna-logcat/css'
import './luna.scss'
import LunaModal from 'luna-modal'

function renderApp() {
  const container: HTMLElement = document.getElementById('app') as HTMLElement

  const App = lazy(() => import('./main/App.js') as Promise<any>)
  const title = 'AYA'

  preload.setTitle(title)

  createRoot(container).render(<App />)
}

if (isDev()) {
  hotKey.on('f5', () => location.reload())
}

;(async function () {
  const language = await main.getLanguage()
  i18n.locale(language)
  LunaModal.i18n.locale(language)

  document.body.classList.add(`platform-${isMac ? 'mac' : 'windows'}`)

  renderApp()
})()
