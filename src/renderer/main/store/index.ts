import BaseStore from '../../store/BaseStore'

interface IDevice {
  id: string
  brand: string
  model: string
}

class Store extends BaseStore {
  devices: IDevice[] = []
  selectedDevice?: IDevice
}

export default new Store()
