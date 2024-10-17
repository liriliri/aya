import { BrowserWindow } from 'electron'

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }
}
