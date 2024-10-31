import { Menu } from 'electron'
import each from 'licia/each'
import * as window from './window'

export default function contextMenu(x: number, y: number, template: any) {
  transTpl(template)
  const menu = Menu.buildFromTemplate(template)
  menu.popup({
    x,
    y,
  })
}

function transTpl(template: any) {
  each(template, (item: any) => {
    if (item.click) {
      const id: string = item.click
      item.click = function () {
        window.sendFocused('clickContextMenu', id)
      }
    }
    if (item.type === 'submenu') {
      item.submenu = transTpl(item.submenu)
    }
  })
}
