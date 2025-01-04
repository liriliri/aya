import { app } from 'electron'
import * as menu from './lib/menu'
import * as ipc from './lib/ipc'
import * as main from './window/main'
import * as language from './lib/language'
import * as theme from './lib/theme'
import * as adb from './lib/adb'
import * as terminal from './window/terminal'
import { setupTitlebar } from 'custom-electron-titlebar/main'

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.setName('Aya')

app.on('ready', () => {
  setupTitlebar()
  language.init()
  theme.init()
  adb.init()
  ipc.init()
  terminal.init()
  main.showWin()
  menu.init()
})
