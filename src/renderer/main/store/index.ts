import { action, makeObservable, observable } from 'mobx'
import BaseStore from '../../store/BaseStore'

interface IDevice {
  id: string
  brand: string
  model: string
}

class Store extends BaseStore {
  devices: IDevice[] = []
  device?: IDevice
  panel: string = 'logcat'
  constructor() {
    super()

    makeObservable(this, {
      panel: observable,
      selectPanel: action,
    })
  }
  selectPanel(panel: string) {
    this.panel = panel
  }
}

export default new Store()
