import { observer } from 'mobx-react-lite'
import store from '../../store'

export default observer(function File() {
  return (
    <div style={{ display: store.panel === 'file' ? 'block' : 'none' }}>
      file
    </div>
  )
})
