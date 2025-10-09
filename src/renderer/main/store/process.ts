import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class Process {
  onlyPackage = false
  constructor() {
    makeObservable(this, {
      onlyPackage: observable,
    })

    this.init()
  }
  async init() {
    const process = await main.getMainStore('process')
    if (process) {
      runInAction(() => extend(this, process))
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('process', {
      onlyPackage: this.onlyPackage,
    })
  }
}
