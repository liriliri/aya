import h from 'licia/h'
import contain from 'licia/contain'
import LunaNotification, { INotifyOptions } from 'luna-notification'
import { isObservable, toJS } from 'mobx'

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
