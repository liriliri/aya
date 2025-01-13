import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class File {
  listView = false
  constructor() {
    makeObservable(this, {
      listView: observable,
    })

    this.init()
  }
  async init() {
    const file = await main.getMainStore('file')
    if (file) {
      extend(this, file)
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('file', {
      listView: this.listView,
    })
  }
}
