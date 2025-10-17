import defaults from 'licia/defaults'
import enUS from './langs/en-US.json'
import ar from './langs/ar.json'
import ru from './langs/ru.json'
import zhCN from './langs/zh-CN.json'
import tr from './langs/tr.json'
import zhTW from './langs/zh-TW.json'
import fr from './langs/fr.json'
import pt from './langs/pt.json'
import es from './langs/es.json'
export { t, i18n } from 'share/common/i18n'
import { init as initI18n } from 'share/common/i18n'

const langs = {
  'en-US': enUS,
  ar: defaults(ar, enUS),
  ru: defaults(ru, enUS),
  'zh-CN': defaults(zhCN, enUS),
  tr: defaults(tr, enUS),
  'zh-TW': defaults(zhTW, enUS),
  fr: defaults(fr, enUS),
  pt: defaults(pt, enUS),
  es: defaults(es, enUS),
}

initI18n(langs)
