import types from 'licia/types'
import I18n from 'licia/I18n'
import defaults from 'licia/defaults'
import h from 'licia/h'
import contain from 'licia/contain'
import LunaNotification, { INotifyOptions } from 'luna-notification'
import enUS from '../../common/langs/en-US.json'
import zhCN from '../../common/langs/zh-CN.json'
import { isObservable, toJS } from 'mobx'

export const i18n = new I18n('en-US', {
  'en-US': enUS,
  'zh-CN': defaults(zhCN, enUS),
})

export function t(path: string | string[], data?: types.PlainObj<any>) {
  return i18n.t(path, data)
}

let notification: LunaNotification | null = null

export function notify(content: string, options?: INotifyOptions) {
  if (!notification) {
    const div = h('div')
    document.body.appendChild(div)
    notification = new LunaNotification(div, {
      position: {
        x: 'center',
        y: 'top',
      },
    })
  }

  notification.notify(content, options)
}

export async function setMainStore(name: string, val: any) {
  await main.setMainStore(name, isObservable(val) ? toJS(val) : val)
}

export function isFileDrop(e: React.DragEvent) {
  return contain(e.dataTransfer.types, 'Files')
}
