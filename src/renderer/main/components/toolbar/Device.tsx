import LunaToolbar, { LunaToolbarSelect } from 'luna-toolbar/react'
import Style from './Device.module.scss'

export default function Device() {
  return (
    <LunaToolbar className={Style.container}>
      <LunaToolbarSelect
        keyName="device"
        value="id"
        options={{ 'realme xxx': 'id' }}
      />
    </LunaToolbar>
  )
}
