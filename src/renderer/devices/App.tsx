import { observer } from 'mobx-react-lite'
import DeviceManager from './components/DeviceManager'
import Toolbar from './components/Toolbar'

export default observer(function App() {
  return (
    <>
      <Toolbar />
      <DeviceManager />
    </>
  )
})
