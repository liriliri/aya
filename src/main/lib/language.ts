import { getSettingsStore } from './store'
import enUS from '../../common/langs/en-US.json'
import zhCN from '../../common/langs/zh-CN.json'
import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import types from 'licia/types'
import { app, ipcMain } from 'electron'

const store = getSettingsStore()

const i18n = new I18n('en-US', {
  'en-US': enUS,
  'zh-CN': defaults(zhCN, enUS),
})

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}

let language = 'en-US'
export function get() {
  return language
}

export function init() {
  const lang = store.get('language')
  const systemLanguage = app.getLocale() === 'zh-CN' ? 'zh-CN' : 'en-US'
  language = lang === 'system' ? systemLanguage : lang
  i18n.locale(language)
  ipcMain.handle('getLanguage', () => get())
}
