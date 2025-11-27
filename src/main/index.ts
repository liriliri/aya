import { app } from 'electron'
import * as menu from './lib/menu'
import * as main from './window/main'
import * as adb from './lib/adb'
import * as terminal from 'share/main/window/terminal'
import * as window from 'share/main/lib/window'
import log from 'share/common/log'
import { getSettingsStore } from './lib/store'
import 'share/main'

const logger = log('main')
logger.info('start')

const settingsStore = getSettingsStore()
window.setDefaultOptions({
  customTitlebar: !settingsStore.get('useNativeTitlebar'),
})

app.on('ready', () => {
  logger.info('app ready')

  terminal.init()
  adb.init()
  main.showWin()
  menu.init()
})
