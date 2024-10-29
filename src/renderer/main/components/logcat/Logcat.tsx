import { observer } from 'mobx-react-lite'
import LunaToolbar, { LunaToolbarInput } from 'luna-toolbar/react'
import LunaLogcat from 'luna-logcat/react'
import Logcat from 'luna-logcat'
import { useEffect, useRef } from 'react'
import Style from './Logcat.module.scss'
import store from '../../store'

export default observer(function Logcat() {
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
      <LunaToolbar className={Style.toolbar}>
        <LunaToolbarInput
          keyName="package"
          placeholder="package name"
          value=""
        />
      </LunaToolbar>
      <LunaLogcat
        className={Style.logcat}
        maxNum={2000}
        onCreate={(logcat) => (logcatRef.current = logcat)}
      />
    </div>
  )
})
