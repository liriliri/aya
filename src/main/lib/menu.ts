import { Menu, MenuItemConstructorOptions, app, shell } from 'electron'
import * as window from 'share/main/lib/window'
import * as terminal from 'share/main/window/terminal'
import * as process from 'share/main/window/process'
import * as about from 'share/main/window/about'
import * as avd from '../window/avd'
import isMac from 'licia/isMac'
import { t } from '../../common/util'
import upperCase from 'licia/upperCase'
import isWindows from 'licia/isWindows'
import * as updater from 'share/main/lib/updater'
import { handleEvent } from 'share/main/lib/util'
import * as language from 'share/main/lib/language'

function getTemplate(): MenuItemConstructorOptions[] {
  const hideMenu = isMac
    ? [
        {
          type: 'separator',
        },
        {
          label: t('hideAya'),
          role: 'hide',
        },
        {
          label: t('hideOthers'),
          role: 'hideothers',
        },
        {
          label: t('showAll'),
          role: 'unhide',
        },
      ]
    : []

  const aya = {
    label: upperCase(app.name),
    submenu: [
      {
        label: t('aboutAya'),
        click() {
          about.showWin()
        },
      },
      {
        label: `${t('checkUpdate')}...`,
        click() {
          updater.checkUpdate()
        },
      },
      ...hideMenu,
      {
        type: 'separator',
      },
      {
        label: t('quitAya'),
        accelerator: isMac ? 'Command+Q' : 'Ctrl+Q',
        click() {
          app.quit()
        },
      },
    ],
  }

  const edit = {
    label: t('edit'),
    submenu: [
      {
        role: 'cut',
        label: t('cut'),
      },
      {
        role: 'copy',
        label: t('copy'),
      },
      {
        role: 'paste',
        label: t('paste'),
      },
      {
        role: 'delete',
        label: t('delete'),
      },
      {
        role: 'selectAll',
        label: t('selectAll'),
      },
    ],
  }

  const tools = {
    label: t('tools'),
    submenu: [
      {
        label: t('avdManager'),
        click() {
          avd.showWin()
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('terminal'),
        click() {
          terminal.showWin()
        },
      },
      {
        label: t('processManager'),
        click() {
          process.showWin()
        },
      },
    ],
  }

  const help: any = {
    role: 'help',
    label: t('help'),
    submenu: [
      {
        label: t('documentation'),
        click() {
          shell.openExternal(
            `https://aya.liriliri.io/${
              language.get() === 'zh-CN' ? 'zh/' : ''
            }guide/`
          )
        },
      },
      {
        label: t('donate'),
        click() {
          const link =
            language.get() === 'zh-CN'
              ? 'http://surunzi.com/wechatpay.html'
              : 'https://ko-fi.com/surunzi'
          shell.openExternal(link)
        },
      },
      {
        label: t('reportIssue'),
        click() {
          shell.openExternal('https://github.com/liriliri/aya/issues')
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'toggledevtools',
        label: t('toggleDevtools'),
      },
    ],
  }

  const template = [tools, help]
  if (isMac) {
    template.unshift(aya, edit)
  } else {
    template.unshift(aya)
  }

  return template
}

function updateMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(getTemplate()))

  if (isWindows) {
    window.sendTo('main', 'refreshMenu')
  }
}

export function init() {
  updateMenu()

  handleEvent('updateMenu', updateMenu)
}
