import { action, makeObservable, observable, runInAction } from 'mobx'
import isStr from 'licia/isStr'
import find from 'licia/find'
import BaseStore from '../../store/BaseStore'
import { Settings } from './settings'
import { Application } from './application'
import { Process } from './process'
import { File } from './file'
import { setMainStore } from '../../lib/util'
import isEmpty from 'licia/isEmpty'

interface IDevice {
  id: string
  name: string
  androidVersion: string
  sdkVersion: string
}

class Store extends BaseStore {
  devices: IDevice[] = []
  device: IDevice | null = null
  panel: string = 'overview'
  settings = new Settings()
  application = new Application()
  process = new Process()
  file = new File()
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

    this.bindEvent()
    this.init()
  }
  selectDevice(device: string | IDevice | null) {
    if (isStr(device)) {
      const d = find(this.devices, ({ id }) => id === device)
      if (d) {
        this.device = d
      }
    } else {
      this.device = device
    }

    setMainStore('device', this.device)
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

    const device = await main.getMainStore('device')
    if (device) {
      runInAction(() => (this.device = device))
    }
    await this.refreshDevices()
  }
  refreshDevices = async () => {
    const devices = await main.getDevices()
    runInAction(() => (this.devices = devices))
    if (!isEmpty(devices)) {
      if (!this.device) {
        this.selectDevice(devices[0])
      } else {
        const device = find(devices, ({ id }) => id === this.device!.id)
        if (!device) {
          this.selectDevice(devices[0])
        }
      }
    } else {
      if (this.device) {
        this.selectDevice(null)
      }
    }
  }
  private bindEvent() {
    main.on('changeDevice', this.refreshDevices)
  }
}

export default new Store()
