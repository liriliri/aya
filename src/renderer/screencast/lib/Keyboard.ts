import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidKeyEventMeta,
  ScrcpyControlMessageWriter,
} from '@yume-chan/scrcpy'
import ScrcpyClient from './ScrcpyClient'
import contain from 'licia/contain'
import upperCase from 'licia/upperCase'
import isNumeric from 'licia/isNumeric'

export default class Keyboard {
  private controlLeft = false
  private controlRight = false
  private shiftLeft = false
  private shiftRight = false
  private altLeft = false
  private altRight = false
  private metaLeft = false
  private metaRight = false
  private capsLock = false
  private numLock = true
  private readonly client: ScrcpyClient
  constructor(client: ScrcpyClient) {
    this.client = client
  }
  down = async (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const control = await this.client.getControl()

    const keyCode = this.getKeyCode(e)
    const controller: ScrcpyControlMessageWriter = control.controller

    if (keyCode) {
      this.setModifier(keyCode, true)

      controller.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode,
        repeat: 0,
        metaState: this.getMetaState(),
      })
    } else if (e.key.length === 1) {
      controller.injectText(e.key)
    }
  }
  up = async (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const control = await this.client.getControl()

    const keyCode = this.getKeyCode(e)
    const controller: ScrcpyControlMessageWriter = control.controller

    if (keyCode) {
      this.setModifier(keyCode, false)

      controller.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode,
        repeat: 0,
        metaState: this.getMetaState(),
      })
    }
  }
  private setModifier(keyCode: AndroidKeyCode, value: boolean) {
    switch (keyCode) {
      case AndroidKeyCode.ControlLeft:
        this.controlLeft = value
        break
      case AndroidKeyCode.ControlRight:
        this.controlRight = value
        break
      case AndroidKeyCode.ShiftLeft:
        this.shiftLeft = value
        break
      case AndroidKeyCode.ShiftRight:
        this.shiftRight = value
        break
      case AndroidKeyCode.AltLeft:
        this.altLeft = value
        break
      case AndroidKeyCode.AltRight:
        this.altRight = value
        break
      case AndroidKeyCode.MetaLeft:
        this.metaLeft = value
        break
      case AndroidKeyCode.MetaRight:
        this.metaRight = value
        break
      case AndroidKeyCode.CapsLock:
        if (value) {
          this.capsLock = !this.capsLock
        }
        break
      case AndroidKeyCode.NumLock:
        if (value) {
          this.numLock = !this.numLock
        }
        break
    }
  }
  private getMetaState(): number {
    let metaState = 0

    if (this.altLeft) {
      metaState |= AndroidKeyEventMeta.AltLeft
    }
    if (this.altRight) {
      metaState |= AndroidKeyEventMeta.AltRight
    }
    if (this.shiftLeft) {
      metaState |= AndroidKeyEventMeta.ShiftLeft
    }
    if (this.shiftRight) {
      metaState |= AndroidKeyEventMeta.ShiftRight
    }
    if (this.controlLeft) {
      metaState |= AndroidKeyEventMeta.CtrlLeft
    }
    if (this.controlRight) {
      metaState |= AndroidKeyEventMeta.CtrlRight
    }
    if (this.metaLeft) {
      metaState |= AndroidKeyEventMeta.MetaLeft
    }
    if (this.metaRight) {
      metaState |= AndroidKeyEventMeta.MetaRight
    }
    if (this.capsLock) {
      metaState |= AndroidKeyEventMeta.CapsLock
    }
    if (this.numLock) {
      metaState |= AndroidKeyEventMeta.NumLock
    }

    return metaState
  }
  private getKeyCode(e: KeyboardEvent): AndroidKeyCode | undefined {
    let code = ''
    const key = e.key

    if (contain(ignoreCodes, e.code)) {
      code = e.code
    }

    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      if (/[a-zA-Z]/.test(key)) {
        code = `Key${upperCase(key)}`
      } else if (isNumeric(key)) {
        code = `Digit${key}`
      }
    }

    if (keyCodes[key]) {
      code = keyCodes[key]
    }

    return AndroidKeyCode[code as keyof typeof AndroidKeyCode]
  }
}

const ignoreCodes = [
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'NumLock',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Backspace',
  'PageUp',
  'PageDown',
  'Escape',
  'Delete',
  'PrintScreen',
  'Pause',
  'Home',
  'End',
  'Insert',
  'NumLock',
]

const keyCodes = {
  ' ': 'Space',
  ';': 'Semicolon',
  '*': 'Star',
  '#': 'Pound',
  ',': 'Comma',
  '.': 'Period',
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  "'": 'Quote',
  '/': 'Slash',
  '@': 'At',
  '+': 'Plus',
}
