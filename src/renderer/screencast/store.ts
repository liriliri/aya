import BaseStore from '../store/BaseStore'
import { IDevice } from '../../common/types'
import { action, makeObservable, observable } from 'mobx'
import ScrcpyClient from './lib/ScrcpyClient'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'

class Store extends BaseStore {
  device!: IDevice
  scrcpyClient!: ScrcpyClient
  constructor() {
    super()

    makeObservable(this, {
      device: observable,
      setDevice: action,
    })

    this.init()
    this.bindEvent()
  }
  setDevice(device: IDevice | null) {
    if (device === null) {
      main.closeScreencast()
    } else {
      this.scrcpyClient = new ScrcpyClient(
        device.id,
        new ScrcpyOptions3_1({
          audio: true,
          clipboardAutosync: false,
        })
      )
      this.device = device
    }
  }
  private async init() {
    const device = await main.getMainStore('device')
    this.setDevice(device)
  }
  private bindEvent() {
    main.on('changeMainStore', (name: string, val: any) => {
      if (name === 'device') {
        this.setDevice(val)
      }
    })
  }
}

export default new Store()
