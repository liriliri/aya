import { contextBridge } from 'electron'
import { Titlebar, TitlebarColor } from 'custom-electron-titlebar'
import { colorBgContainer, colorBgContainerDark } from '../common/theme'
import getUrlParam from 'licia/getUrlParam'
import isMac from 'licia/isMac'
import mainObj from './main'
import nodeObj from './node'

let titleBar: Titlebar

window.addEventListener('DOMContentLoaded', async () => {
  titleBar = new Titlebar({
    containerOverflow: 'hidden',
  })
  if (getUrlParam('page') && !isMac) {
    document.body.classList.add('hide-cet-menubar')
  }
  updateTheme()
  mainObj.on('updateTheme', updateTheme)
})

async function updateTheme() {
  const theme = await mainObj.getTheme()
  if (theme === 'dark') {
    document.body.classList.add('-theme-with-dark-background')
  } else {
    document.body.classList.remove('-theme-with-dark-background')
  }
  const backgroundColor = TitlebarColor.fromHex(
    theme === 'dark' ? colorBgContainerDark : colorBgContainer
  )
  ;(titleBar as any).currentOptions.menuBarBackgroundColor = backgroundColor
  titleBar.updateBackground(backgroundColor)
}

const preloadObj = {
  setTitle: (title: string) => {
    document.title = title
    if (titleBar) {
      titleBar.updateTitle(title)
    }
  },
}
mainObj.on('refreshMenu', () => {
  if (titleBar) {
    titleBar.refreshMenu()
  }
})

contextBridge.exposeInMainWorld('preload', preloadObj)
contextBridge.exposeInMainWorld('main', mainObj)
contextBridge.exposeInMainWorld('node', nodeObj)

declare global {
  const main: typeof mainObj
  const preload: typeof preloadObj
  const node: typeof nodeObj
  const VIVY_VERSION: string
}
