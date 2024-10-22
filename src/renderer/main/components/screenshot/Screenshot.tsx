import { observer } from 'mobx-react-lite'
import store from '../../store'

export default observer(function Screenshot() {
  return (
    <div style={{ display: store.panel === 'screenshot' ? 'block' : 'none' }}>
      screenshot
    </div>
  )
})
