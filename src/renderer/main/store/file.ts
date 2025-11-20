import { action, makeObservable, observable, runInAction } from 'mobx'
import extend from 'licia/extend'
import { TransferType } from 'common/types'
import filter from 'licia/filter'
import now from 'licia/now'
import splitPath from 'licia/splitPath'

export class File {
  listView = false
  showTransfer = true
  transferWeight = 30
  transfers: Transfer[] = []
  constructor() {
    makeObservable(this, {
      listView: observable,
      showTransfer: observable,
      transferWeight: observable,
      transfers: observable,
    })

    this.init()
    this.bindEvent()
  }
  async init() {
    const file = await main.getMainStore('file')
    if (file) {
      runInAction(() => extend(this, file))
    }
  }
  async set(key: string, val: any) {
    runInAction(() => {
      this[key] = val
    })
    await main.setMainStore('file', {
      listView: this.listView,
      showTransfer: this.showTransfer,
      transferWeight: this.transferWeight,
    })
  }
  private bindEvent() {
    main.on('startTransfer', (id, type, src, dest, size) => {
      this.transfers.push(new Transfer(id, type, src, dest, size))
    })
    main.on('updateTransfer', (id, transferred) => {
      if (this.showTransfer) {
        const transfer = this.transfers.find((t) => t.id === id)
        if (transfer) {
          transfer.update(transferred)
        }
      }
    })
    main.on('finishTransfer', (id) => {
      this.transfers = filter(this.transfers, (t) => t.id !== id)
    })
  }
}

class Transfer {
  name: string
  id: string
  type: TransferType
  src: string
  dest: string
  startTime = new Date()
  duration = 0
  size = 0
  transferred = 0
  constructor(
    id: string,
    type: TransferType,
    src: string,
    dest: string,
    size: number
  ) {
    this.name = splitPath(src).name
    this.id = id
    this.type = type
    this.src = src
    this.dest = dest
    this.size = size

    makeObservable(this, {
      transferred: observable,
      duration: observable,
      update: action,
    })
  }
  update(transferred: number) {
    this.duration = now() - this.startTime.getTime()
    this.transferred = transferred
  }
}
