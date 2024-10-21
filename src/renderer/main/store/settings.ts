import { action, makeObservable, observable, runInAction } from 'mobx'

export class Settings {
  language = 'en-US'
  theme = 'light'
  constructor() {
    makeObservable(this, {
      language: observable,
      theme: observable,
      set: action,
    })

    this.init()
  }
  async init() {
    const names = ['language', 'theme']
    for (let i = 0, len = names.length; i < len; i++) {
      const name = names[i]
      const val = await main.getSettingsStore(name)
      if (val) {
        runInAction(() => (this[name] = val))
      }
    }
  }
  async set(name: string, val: any) {
    runInAction(() => {
      this[name] = val
    })
    await main.setSettingsStore(name, val)
  }
}
