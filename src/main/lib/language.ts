import { getSettingsStore } from './store'
import { i18n, hasLocale } from '../../common/util'
import { app } from 'electron'
import { handleEvent } from 'share/main/lib/util'
import log from 'share/common/log'

const logger = log('language')

const store = getSettingsStore()

let language = 'en-US'
export function get() {
  return language
}

export function init() {
  logger.info('init')

  const lang = store.get('language')
  let systemLanguage = 'en-US'
  if (hasLocale(app.getLocale())) {
    systemLanguage = app.getLocale()
  }
  language = lang === 'system' ? systemLanguage : lang
  i18n.locale(language)
  handleEvent('getLanguage', get)
}
