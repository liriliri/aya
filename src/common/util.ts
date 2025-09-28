import defaults from 'licia/defaults'
import enUS from './langs/en-US.json'
import arIQ from './langs/ar-IQ.json'
import ruRU from './langs/ru-RU.json'
import zhCN from './langs/zh-CN.json'
import trTR from './langs/tr-TR.json'
import zhTW from './langs/zh-TW.json'
import frFR from './langs/fr-FR.json'
import ptBR from './langs/pt-BR.json'
export { t, i18n, hasLocale } from 'share/common/i18n'
import { init as initI18n } from 'share/common/i18n'

const langs = {
  'en-US': enUS,
  'ar-IQ': defaults(arIQ, enUS),
  'ru-RU': defaults(ruRU, enUS),
  'zh-CN': defaults(zhCN, enUS),
  'tr-TR': defaults(trTR, enUS),
  'zh-TW': defaults(zhTW, enUS),
  'fr-FR': defaults(frFR, enUS),
  'pt-BR': defaults(ptBR, enUS),
}

initI18n(langs)
