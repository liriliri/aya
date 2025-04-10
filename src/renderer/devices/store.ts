import { action, makeObservable, observable, runInAction, toJS } from 'mobx'
import BaseStore from 'share/renderer/store/BaseStore'
import { IDevice } from '../../common/types'
import each from 'licia/each'
import filter from 'licia/filter'
import concat from 'licia/concat'
import unique from 'licia/unique'
import { isRemoteDevice } from './lib/util'

class Store extends BaseStore {
  filter = ''
  ip = ''
  port = ''
  devices: IDevice[] = []
  remoteDevices: IDevice[] = []
  device: IDevice | null = null
  constructor() {
    super()
    makeObservable(this, {
      ip: observable,
      port: observable,
      devices: observable,
      device: observable,
      remoteDevices: observable,
      filter: observable,
      setIp: action,
      setPort: action,
      setFilter: action,
      selectDevice: action,
      updateDevices: action,
      removeRemoteDevice: action,
    })

    this.init()
    this.bindEvent()
  }
  async init() {
    const remoteDevices: IDevice[] = await main.getDevicesStore('remoteDevices')
    runInAction(() => {
      this.remoteDevices = remoteDevices
    })

    const devices: IDevice[] = await main.getMemStore('devices')
    this.updateDevices(devices)
  }
  setIp(ip: string) {
    this.ip = ip
  }
  setPort(port: string) {
    this.port = port
  }
  setFilter(filter: string) {
    this.filter = filter
  }
  selectDevice(device: IDevice | null) {
    if (device && isRemoteDevice(device.id) && device.type === 'offline') {
      const [ip, port] = device.id.split(':')
      this.ip = ip
      this.port = port
    }
    this.device = device
  }
  updateDevices(devices: IDevice[]) {
    let remoteDevices: IDevice[] = toJS(this.remoteDevices)
    each(remoteDevices, (device) => {
      device.type = 'offline'
    })
    remoteDevices = unique(
      concat(
        remoteDevices,
        filter(devices, (device) => isRemoteDevice(device.id))
      ),
      (a, b) => a.id === b.id
    )
    this.devices = filter(devices, (device) => !isRemoteDevice(device.id))

    this.remoteDevices = remoteDevices
    main.setDevicesStore('remoteDevices', remoteDevices)

    if (this.device) {
      const id = this.device.id
      each(concat(remoteDevices, this.devices), (device) => {
        if (device.id === id) {
          this.selectDevice(device)
        }
      })
    }
  }
  removeRemoteDevice(id: string) {
    this.remoteDevices = filter(this.remoteDevices, (device) => {
      return device.id !== id
    })
    main.setDevicesStore('remoteDevices', toJS(this.remoteDevices))
  }
  private bindEvent() {
    main.on('changeMemStore', (name, val) => {
      switch (name) {
        case 'devices':
          this.updateDevices(val)
          break
      }
    })
  }
}

export default new Store()
