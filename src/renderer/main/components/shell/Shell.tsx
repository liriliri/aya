import { observer } from 'mobx-react-lite'
import store from '../../store'

export default observer(function Shell() {
  return (
    <div
      style={{
        display: store.panel === 'shell' ? 'block' : 'none',
      }}
    >
      Shell
    </div>
  )
})
