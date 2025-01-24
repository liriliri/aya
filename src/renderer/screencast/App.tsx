import Screencast from './components/Screencast'
import { observer } from 'mobx-react-lite'
import store from './store'

export default observer(function App() {
  return <>{store.device && <Screencast />}</>
})
