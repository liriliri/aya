import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import types from 'licia/types'
import enUS from './langs/en-US.json'
import arIQ from './langs/ar-IQ.json'
import ruRU from './langs/ru-RU.json'
import zhCN from './langs/zh-CN.json'
import trTR from './langs/tr-TR.json'
import zhTW from './langs/zh-TW.json'
import frFR from './langs/fr-FR.json'

const langs = {
  'en-US': enUS,
  'ar-IQ': defaults(arIQ, enUS),
  'ru-RU': defaults(ruRU, enUS),
  'zh-CN': defaults(zhCN, enUS),
  'tr-TR': defaults(trTR, enUS),
  'zh-TW': defaults(zhTW, enUS),
  'fr-FR': defaults(frFR, enUS),
}

export const i18n = new I18n('en-US', langs)

export function hasLocale(locale: string) {
  return !!langs[locale]
}

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}
