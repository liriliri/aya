import { observer } from 'mobx-react-lite'
import store from '../../store'

export default observer(function Logcat() {
  return (
    <div
      style={{
        display: store.panel === 'logcat' ? 'block' : 'none',
      }}
    >
      Logcat
    </div>
  )
})
