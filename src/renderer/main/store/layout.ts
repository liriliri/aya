import { makeObservable, observable, runInAction, toJS } from 'mobx'
import extend from 'licia/extend'

export class Layout {
  border = true
  attribute = false
  weights = [30, 70, 30]
  constructor() {
    makeObservable(this, {
      border: observable,
      attribute: observable,
      weights: observable,
    })

    this.init()
  }
  async init() {
    const layout = await main.getMainStore('layout')
    if (layout) {
      runInAction(() => extend(this, layout))
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('layout', {
      border: this.border,
      attribute: this.attribute,
      weights: toJS(this.weights),
    })
  }
}
