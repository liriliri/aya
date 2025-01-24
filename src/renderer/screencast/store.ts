import BaseStore from '../store/BaseStore'
import { IDevice } from '../../common/types'
import { action, makeObservable, observable } from 'mobx'

class Store extends BaseStore {
  device: IDevice | null = null
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
    }
    this.device = device
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
