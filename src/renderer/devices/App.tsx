import { observer } from 'mobx-react-lite'
import DeviceManager from './components/DeviceManager'
import Screenshot from './components/Screenshot'
import Toolbar from './components/Toolbar'

export default observer(function App() {
  return (
    <>
      <Toolbar />
      <DeviceManager />
      <Screenshot />
    </>
  )
})
