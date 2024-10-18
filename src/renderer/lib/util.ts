import types from 'licia/types'
import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import enUS from '../../common/langs/en-US.json'
import zhCN from '../../common/langs/zh-CN.json'

export const i18n = new I18n('en-US', {
  'en-US': enUS,
  'zh-CN': defaults(zhCN, enUS),
})

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}
