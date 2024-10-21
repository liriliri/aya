import { action, makeObservable, observable, runInAction } from 'mobx'
import isStr from 'licia/isStr'
import find from 'licia/find'
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
      devices: observable,
      device: observable,
      panel: observable,
      selectDevice: action,
      selectPanel: action,
    })

    this.init()
  }
  selectDevice(device: string | IDevice) {
    if (isStr(device)) {
      this.device = find(this.devices, ({ id }) => id === device)
    } else {
      this.device = device
    }
  }
  selectPanel(panel: string) {
    this.panel = panel
  }
  private async init() {
    const devices = await main.getDevices()
    runInAction(() => {
      this.devices = devices
    })
  }
}

export default new Store()
