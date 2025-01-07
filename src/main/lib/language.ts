import { getSettingsStore } from './store'
import enUS from '../../common/langs/en-US.json'
import arIQ from '../../common/langs/ar-IQ.json'
import ruRU from '../../common/langs/ru-RU.json'
import zhCN from '../../common/langs/zh-CN.json'
import trTR from '../../common/langs/tr-TR.json'
import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import types from 'licia/types'
import { app } from 'electron'
import { handleEvent } from './util'

const store = getSettingsStore()

const langs = {
  'en-US': enUS,
  'ar-IQ': defaults(arIQ, enUS),
  'ru-RU': defaults(ruRU, enUS),
  'zh-CN': defaults(zhCN, enUS),
  'tr-TR': defaults(trTR, enUS),
}

const i18n = new I18n('en-US', langs)

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}

let language = 'en-US'
export function get() {
  return language
}

export function init() {
  const lang = store.get('language')
  let systemLanguage = 'en-US'
  if (langs[app.getLocale()]) {
    systemLanguage = app.getLocale()
  }
  language = lang === 'system' ? systemLanguage : lang
  i18n.locale(language)
  handleEvent('getLanguage', get)
}
