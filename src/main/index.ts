import { app } from 'electron'
import * as main from './window/main'

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.setName('Aya')

app.on('ready', () => {
  main.showWin()
})
