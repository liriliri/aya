import { makeObservable, observable, runInAction } from 'mobx'

export default class BaseStore {
  theme = 'light'
  language = 'en-US'
  constructor() {
    makeObservable(this, {
      theme: observable,
      language: observable,
    })

    this.updateTheme()
    this.updateLanguage()
    main.on('updateTheme', this.updateTheme)
  }
  private updateTheme = async () => {
    const theme = await main.getTheme()

    runInAction(() => (this.theme = theme))
  }
  private updateLanguage = async () => {
    const language = await main.getLanguage()

    runInAction(() => (this.language = language))
  }
}
