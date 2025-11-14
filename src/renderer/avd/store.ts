import { IAvd } from 'common/types'
import { action, makeObservable, observable } from 'mobx'
import BaseStore from 'share/renderer/store/BaseStore'
import isStr from 'licia/isStr'
import find from 'licia/find'

class Store extends BaseStore {
  filter = ''
  avds: IAvd[] = []
  avd: IAvd | null = null
  constructor() {
    super()
    makeObservable(this, {
      filter: observable,
      avds: observable,
      avd: observable,
      setFilter: action,
      updateAvds: action,
      selectAvd: action,
    })

    this.bindEvent()
    this.init()
  }
  async init() {
    this.updateAvds(await main.getAvds())
  }
  async refreshAvds() {
    this.updateAvds(await main.getAvds(true))
  }
  updateAvds(avds: IAvd[]) {
    this.avds = avds
    if (this.avd) {
      const avd = find(avds, (d) => d.id === this.avd!.id) || null
      this.avd = avd
    }
  }
  setFilter(filter: string) {
    this.filter = filter
  }
  selectAvd(avd: IAvd | string | null) {
    if (isStr(avd)) {
      avd = find(this.avds, (d) => d.id === avd) || null
    }

    this.avd = avd
  }
  private bindEvent() {
    main.on('changeDevice', async () => {
      this.updateAvds(await main.getAvds())
    })
  }
}

export default new Store()
