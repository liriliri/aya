import { observer } from 'mobx-react-lite'
import LunaToolbar from 'luna-toolbar/react'
import ToolbarIcon from '../../components/ToolbarIcon'
import { t } from '../../../common/util'
import store from '../store'

export default observer(function Toolbar() {
  const device = store.device!

  return (
    <LunaToolbar>
      <ToolbarIcon
        icon="power"
        title={t('power')}
        onClick={() => main.inputKey(device!.id, 26)}
      />
      <ToolbarIcon
        icon="volume"
        title={t('volumeUp')}
        onClick={() => main.inputKey(device!.id, 24)}
      />
      <ToolbarIcon
        icon="volume-down"
        title={t('volumeDown')}
        onClick={() => main.inputKey(device!.id, 25)}
      />
    </LunaToolbar>
  )
})
