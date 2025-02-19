import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class Application {
  itemSize = 72
  sysPackage = true
  listView = false
  constructor() {
    makeObservable(this, {
      itemSize: observable,
      sysPackage: observable,
      listView: observable,
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
      sysPackage: this.sysPackage,
      listView: this.listView,
    })
  }
}
