import LunaToolbar from 'luna-toolbar/react'
import className from 'licia/className'
import Style from './Application.module.scss'
import { observer } from 'mobx-react-lite'

export default observer(function Application() {
  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar"></LunaToolbar>
      <div className={className('panel-body', Style.applications)}></div>
    </div>
  )
})
