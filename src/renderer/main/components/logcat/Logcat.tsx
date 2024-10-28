import { observer } from 'mobx-react-lite'
import LunaToolbar, { LunaToolbarInput } from 'luna-toolbar/react'
import { useEffect } from 'react'
import Style from './Logcat.module.scss'

export default observer(function Logcat() {
  useEffect(() => {}, [])

  return (
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
        <LunaToolbarInput
          keyName="package"
          placeholder="package name"
          value=""
        />
      </LunaToolbar>
    </div>
  )
})
