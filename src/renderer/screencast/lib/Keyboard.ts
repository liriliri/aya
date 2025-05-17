import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  ScrcpyControlMessageWriter,
} from '@yume-chan/scrcpy'
import ScrcpyClient from './ScrcpyClient'

export default class Keyboard {
  private readonly client: ScrcpyClient
  constructor(client: ScrcpyClient) {
    this.client = client
  }
  down = async (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const control = await this.client.getControl()

    const { code } = e

    const keyCode = AndroidKeyCode[code as keyof typeof AndroidKeyCode]

    const controller: ScrcpyControlMessageWriter = control.controller
    controller.injectKeyCode({
      action: AndroidKeyEventAction.Down,
      keyCode,
      repeat: 0,
      metaState: 0,
    })
  }
  up = async (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const control = await this.client.getControl()

    const { code } = e

    const keyCode = AndroidKeyCode[code as keyof typeof AndroidKeyCode]

    const controller: ScrcpyControlMessageWriter = control.controller
    controller.injectKeyCode({
      action: AndroidKeyEventAction.Up,
      keyCode,
      repeat: 0,
      metaState: 0,
    })
  }
}
