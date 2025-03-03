import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import types from 'licia/types'
import enUS from '../common/langs/en-US.json'
import arIQ from '../common/langs/ar-IQ.json'
import ruRU from '../common/langs/ru-RU.json'
import zhCN from '../common/langs/zh-CN.json'
import trTR from '../common/langs/tr-TR.json'
import zhTW from '../common/langs/zh-TW.json'

const langs = {
  'en-US': enUS,
  'ar-IQ': defaults(arIQ, enUS),
  'ru-RU': defaults(ruRU, enUS),
  'zh-CN': defaults(zhCN, enUS),
  'tr-TR': defaults(trTR, enUS),
  'zh-TW': defaults(zhTW, enUS),
}

export const i18n = new I18n('en-US', langs)

export function hasLocale(locale: string) {
  return !!langs[locale]
}

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}
