import { makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'

export class Webview {
  useLocalInspector = false
  constructor() {
    makeObservable(this, {
      useLocalInspector: observable,
    })

    this.init()
  }
  async init() {
    const webview = await main.getMainStore('webview')
    if (webview) {
      extend(this, webview)
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('webview', {
      useLocalInspector: this.useLocalInspector,
    })
  }
}
