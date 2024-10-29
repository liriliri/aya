import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSelect,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import LunaLogcat from 'luna-logcat/react'
import Logcat from 'luna-logcat'
import { useEffect, useRef, useState } from 'react'
import Style from './Logcat.module.scss'
import store from '../../store'
import toBool from 'licia/toBool'
import { t } from '../../../lib/util'
import ToolbarIcon from '../../../components/ToolbarIcon'

export default observer(function Logcat() {
  const [view, setView] = useState<'compact' | 'standard'>('standard')
  const logcatRef = useRef<Logcat>()

  useEffect(() => {
    let logcatId = ''
    function onLogcatEntry(_, id, entry) {
      if (logcatId !== id) {
        return
      }
      if (logcatRef.current) {
        logcatRef.current.append(entry)
      }
    }
    if (store.device) {
      main.openLogcat(store.device.id).then((id) => {
        logcatId = id
      })
      main.on('logcatEntry', onLogcatEntry)
    }

    return () => {
      if (logcatId) {
        main.off('logcatEntry', onLogcatEntry)
        main.closeLogcat(logcatId)
      }
    }
  }, [])

  return (
    <div className={Style.container}>
      <LunaToolbar
        className={Style.toolbar}
        onChange={(key, val) => {
          if (key === 'view') {
            setView(val)
          }
        }}
      >
        <LunaToolbarSelect
          keyName="view"
          disabled={!toBool(store.device)}
          value={view}
          options={{
            [t('standardView')]: 'standard',
            [t('compactView')]: 'compact',
          }}
        />
        <LunaToolbarSeparator />
        <LunaToolbarInput
          keyName="package"
          placeholder="package name"
          value=""
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="delete"
          title={t('clear')}
          onClick={() => logcatRef.current?.clear()}
        />
      </LunaToolbar>
      <LunaLogcat
        className={Style.logcat}
        maxNum={2000}
        view={view}
        onCreate={(logcat) => (logcatRef.current = logcat)}
      />
    </div>
  )
})
