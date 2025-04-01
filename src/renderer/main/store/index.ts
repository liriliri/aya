import { action, makeObservable, observable, runInAction } from 'mobx'
import isStr from 'licia/isStr'
import find from 'licia/find'
import BaseStore from 'share/renderer/store/BaseStore'
import { Settings } from './settings'
import { Application } from './application'
import { Process } from './process'
import { File } from './file'
import { Layout } from './layout'
import { setMainStore } from '../../lib/util'
import { setMemStore } from 'share/renderer/lib/util'
import isEmpty from 'licia/isEmpty'
import { IDevice } from '../../../common/types'

class Store extends BaseStore {
  devices: IDevice[] = []
  device: IDevice | null = null
  panel: string = 'overview'
  settings = new Settings()
  application = new Application()
  process = new Process()
  file = new File()
  layout = new Layout()
  isInit = false
  constructor() {
    super()

    makeObservable(this, {
      devices: observable,
      device: observable,
      panel: observable,
      settings: observable,
      isInit: observable,
      selectDevice: action,
      selectPanel: action,
    })

    this.bindEvent()
    this.init()
  }
  selectDevice = (device: string | IDevice | null) => {
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

    this.isInit = true
  }
  refreshDevices = async () => {
    const devices = await main.getDevices()
    runInAction(() => {
      this.devices = devices
      setMemStore('devices', devices)
    })
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
    main.on('refreshDevices', this.refreshDevices)
    main.on('selectDevice', this.selectDevice)
  }
}

export default new Store()
