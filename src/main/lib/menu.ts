import { Menu, MenuItemConstructorOptions, app, ipcMain, shell } from 'electron'
import * as window from '../lib/window'
import isMac from 'licia/isMac'
import { t } from './language'
import upperCase from 'licia/upperCase'

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
          window.sendTo('main', 'showAbout')
        },
      },
      ...hideMenu,
      {
        type: 'separator',
      },
      {
        label: t('quitAya'),
        click() {
          window.getWin('main')?.close()
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

  const help: any = {
    role: 'help',
    label: t('help'),
    submenu: [
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

  const template = [help]
  if (isMac) {
    template.unshift(aya, edit)
  } else {
    template.push(aya)
  }

  return template
}

export function init() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(getTemplate()))
}
