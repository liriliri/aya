import LunaMenu from 'luna-menu'
import each from 'licia/each'
import isFn from 'licia/isFn'
import uuid from 'licia/uuid'
import types from 'licia/types'

export default function contextMenu(
  e: {
    clientX: number
    clientY: number
  },
  template: any
) {
  const menu = LunaMenu.build(template)

  setTimeout(() => menu.show(e.clientX, e.clientY), 150)
}

const build = LunaMenu.build
LunaMenu.build = function (template) {
  const menu = build([])
  callbacks = {}
  transTpl(template)
  menu.show = function (x, y) {
    main.showContextMenu(x, y, template)
  }
  return menu
}

let callbacks: types.PlainObj<types.AnyFn> = {}

function transTpl(template) {
  each(template, (item: any) => {
    if (isFn(item.click)) {
      const id = uuid()
      callbacks[id] = item.click
      item.click = id
    }
    if (item.type === 'submenu') {
      item.submenu = transTpl(item.submenu)
    }
  })
}

main.on('clickContextMenu', (id: string) => {
  if (callbacks[id]) {
    callbacks[id]()
  }
})
