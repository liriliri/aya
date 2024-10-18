import isMac from 'licia/isMac'
import { lazy } from 'react'
import ReactDOM from 'react-dom'
import { i18n } from './lib/util'
import './main.scss'
import 'luna-toolbar/css'
import './luna.scss'

function renderApp() {
  const container: HTMLElement = document.getElementById('app') as HTMLElement

  const App = lazy(() => import('./main/App.js') as Promise<any>)
  const title = 'AYA'

  preload.setTitle(title)

  ReactDOM.createRoot(container).render(<App />)
}

;(async function () {
  const language = await main.getLanguage()
  i18n.locale(language)

  document.body.classList.add(`platform-${isMac ? 'mac' : 'windows'}`)

  renderApp()
})()
