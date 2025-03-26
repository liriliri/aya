import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class Layout {
  treeWidth = 400
  border = true
  attribute = false
  constructor() {
    makeObservable(this, {
      treeWidth: observable,
      border: observable,
      attribute: observable,
    })

    this.init()
  }
  async init() {
    const layout = await main.getMainStore('layout')
    if (layout) {
      extend(this, layout)
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('layout', {
      treeWidth: this.treeWidth,
      border: this.border,
      attribute: this.attribute,
    })
  }
}
