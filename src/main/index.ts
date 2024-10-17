import { app } from 'electron'
import * as main from './window/main'
import * as theme from './lib/theme'
import { setupTitlebar } from 'custom-electron-titlebar/main'

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.setName('Aya')

app.on('ready', () => {
  setupTitlebar()
  theme.init()
  main.showWin()
})
