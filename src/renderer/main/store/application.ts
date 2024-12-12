import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class Application {
  itemSize = 150
  constructor() {
    makeObservable(this, {
      itemSize: observable,
    })

    this.init()
  }
  async init() {
    const application = await main.getMainStore('application')
    if (application) {
      extend(this, application)
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('application', {
      itemSize: this.itemSize,
    })
  }
}
