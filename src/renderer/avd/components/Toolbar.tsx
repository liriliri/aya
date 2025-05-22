import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import Style from './Toolbar.module.scss'
import { t } from '../../../common/util'
import store from '../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { notify } from 'share/renderer/lib/util'

export default observer(function Toolbar() {
  let pid = 0
  if (store.avd) {
    pid = store.avd.pid
  }

  return (
    <LunaToolbar className={Style.container}>
      <LunaToolbarInput
        keyName="filter"
        value={store.filter}
        placeholder={t('filter')}
        onChange={(val) => store.setFilter(val)}
      />
      <LunaToolbarSpace />
      <ToolbarIcon
        icon={pid ? 'pause' : 'play'}
        title={t(pid ? 'stop' : 'start')}
        onClick={() => {
          const id = store.avd!.id
          if (pid) {
            main.stopAvd(id)
          } else {
            main.startAvd(id)
          }
        }}
        disabled={!store.avd}
      />
      <ToolbarIcon
        icon="open-file"
        title={t('openDir')}
        onClick={() => {
          main.openPath(store.avd!.folder)
        }}
        disabled={!store.avd}
      />
      <LunaToolbarSeparator />
      <ToolbarIcon
        icon="refresh"
        title={t('refresh')}
        onClick={async () => {
          await store.refreshAvds()
          notify(t('deviceRefreshed'), { icon: 'success' })
        }}
      />
    </LunaToolbar>
  )
})
