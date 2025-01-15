import { nativeTheme } from 'electron'
import { getSettingsStore } from './store'
import { getTheme, handleEvent } from './util'
import * as window from './window'
import log from '../../common/log'

const logger = log('theme')

type Theme = 'system' | 'light' | 'dark'

const store = getSettingsStore()

export function get() {
  return getTheme()
}

function set(theme: Theme) {
  nativeTheme.themeSource = theme
}

export function init() {
  logger.info('init')

  set(store.get('theme'))
  handleEvent('getTheme', get)
  nativeTheme.on('updated', () => {
    if (nativeTheme.themeSource === 'system') {
      window.sendAll('updateTheme')
    }
  })
  store.on('change', (name, val) => {
    if (name === 'theme') {
      set(val)
      window.sendAll('updateTheme')
    }
  })
}
