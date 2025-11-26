import { app } from 'electron'
import * as menu from './lib/menu'
import * as main from './window/main'
import * as adb from './lib/adb'
import * as terminal from 'share/main/window/terminal'
import log from 'share/common/log'
import 'share/main'

const logger = log('main')
logger.info('start')

app.on('ready', () => {
  logger.info('app ready')

  terminal.init()
  adb.init()
  main.showWin()
  menu.init()
})
