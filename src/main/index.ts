import { app } from 'electron'
import * as menu from './lib/menu'
import * as ipc from 'share/main/lib/ipc'
import * as main from './window/main'
import * as language from 'share/main/lib/language'
import * as theme from 'share/main/lib/theme'
import * as adb from './lib/adb'
import * as terminal from 'share/main/window/terminal'
import * as updater from 'share/main/lib/updater'
import { setupTitlebar } from 'custom-electron-titlebar/main'
import log from 'share/common/log'

const logger = log('main')
logger.info('start')

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.setName('Aya')

app.on('ready', () => {
  logger.info('app ready')

  setupTitlebar()
  terminal.init()
  language.init()
  theme.init()
  adb.init()
  ipc.init()
  main.showWin()
  menu.init()
  updater.init()
})
