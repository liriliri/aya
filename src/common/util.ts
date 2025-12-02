import defaults from 'licia/defaults'
import enUS from './langs/en-US.json'
import enUSShare from 'share/common/langs/en-US.json'
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

function lang(langObj: any) {
  return defaults(langObj, enUS, enUSShare)
}

const langs = {
  'en-US': enUS,
  ar: lang(ar),
  ru: lang(ru),
  'zh-CN': zhCN,
  tr: lang(tr),
  'zh-TW': lang(zhTW),
  fr: lang(fr),
  pt: lang(pt),
  es: lang(es),
}

initI18n(langs)
