import BaseStore from '../store/BaseStore'
import { IDevice } from '../../common/types'
import { makeObservable, observable, runInAction, toJS } from 'mobx'
import ScrcpyClient from './lib/ScrcpyClient'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'
import defaults from 'licia/defaults'

class Store extends BaseStore {
  device!: IDevice
  scrcpyClient!: ScrcpyClient
  alwaysOnTop = false
  settings = defaultSettings
  constructor() {
    super()

    makeObservable(this, {
      alwaysOnTop: observable,
      settings: observable,
      device: observable,
    })

    this.init()
    this.bindEvent()
  }
  setAlwaysOnTop(val: boolean) {
    this.alwaysOnTop = val
    main.setScreencastStore('alwaysOnTop', val)
    main.setScreencastAlwaysOnTop(val)
  }
  async setDevice(device: IDevice | null) {
    if (device === null) {
      main.closeScreencast()
    } else {
      const deviceSettings = (await main.getScreencastStore('settings')) || {}
      let settings = defaultSettings
      if (deviceSettings[device.id]) {
        settings = deviceSettings[device.id]
        defaults(settings, defaultSettings)
      }
      this.settings = settings

      this.scrcpyClient = new ScrcpyClient(
        device.id,
        new ScrcpyOptions3_1({
          audio: true,
          videoBitRate: settings.videoBitRate,
          maxSize: settings.maxSize,
          clipboardAutosync: false,
        })
      )
      this.scrcpyClient.on('close', () => {
        if (this.device.id === device.id) {
          this.setDevice(null)
        }
      })

      runInAction(() => (this.device = device))
    }
  }
  async setSettings(name: string, val: any) {
    runInAction(() => (this.settings[name] = val))
    const deviceSettings = (await main.getScreencastStore('settings')) || {}
    deviceSettings[this.device.id] = toJS(this.settings)
    main.setScreencastStore('settings', deviceSettings)
  }
  private async init() {
    const device = await main.getMainStore('device')
    this.setDevice(device)
    const alwaysOnTop = await main.getScreencastStore('alwaysOnTop')
    if (alwaysOnTop) {
      main.setScreencastAlwaysOnTop(true)
      runInAction(() => (this.alwaysOnTop = true))
    }
  }
  private bindEvent() {
    main.on('changeMainStore', (name: string, val: any) => {
      if (name === 'device') {
        this.setDevice(val)
      }
    })
  }
}

const defaultSettings = {
  videoBitRate: 8000000,
  maxSize: 0,
}

export default new Store()
