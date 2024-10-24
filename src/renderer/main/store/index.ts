import { action, makeObservable, observable, runInAction } from 'mobx'
import isStr from 'licia/isStr'
import find from 'licia/find'
import BaseStore from '../../store/BaseStore'
import { Settings } from './settings'
import { setMainStore } from '../../lib/util'
import isEmpty from 'licia/isEmpty'

interface IDevice {
  id: string
  brand: string
  model: string
}

class Store extends BaseStore {
  devices: IDevice[] = []
  device?: IDevice
  panel: string = 'overview'
  settings = new Settings()
  constructor() {
    super()

    makeObservable(this, {
      devices: observable,
      device: observable,
      panel: observable,
      settings: observable,
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
    setMainStore('panel', panel)
  }
  private async init() {
    const panel = await main.getMainStore('panel')
    if (panel) {
      runInAction(() => (this.panel = panel))
    }

    const devices = await main.getDevices()
    runInAction(() => (this.devices = devices))
    if (!isEmpty(devices) && !this.device) {
      this.selectDevice(devices[0])
    }
  }
}

export default new Store()
