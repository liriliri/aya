import { IAvd } from '../../common/types'
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
}

export default new Store()
