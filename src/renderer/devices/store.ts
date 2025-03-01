import { action, makeObservable, observable, runInAction } from 'mobx'
import BaseStore from '../store/BaseStore'
import { IDevice } from '../../common/types'

class Store extends BaseStore {
  filter = ''
  devices: IDevice[] = []
  device: IDevice | null = null
  constructor() {
    super()
    makeObservable(this, {
      devices: observable,
      device: observable,
      filter: observable,
      setFilter: action,
      selectDevice: action,
    })

    this.init()
    this.bindEvent()
  }
  async init() {
    const devices: IDevice[] = await main.getMemStore('devices')
    runInAction(() => {
      this.devices = devices
    })
  }
  setFilter(filter: string) {
    this.filter = filter
  }
  selectDevice(device: IDevice | null) {
    this.device = device
  }
  private bindEvent() {
    main.on('changeMemStore', (name, val) => {
      switch (name) {
        case 'devices':
          runInAction(() => (this.devices = val))
          break
      }
    })
  }
}

export default new Store()
