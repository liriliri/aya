import LunaToolbar, {
  LunaToolbarSelect
} from 'luna-toolbar/react'

export default function Device() {
  return <LunaToolbar>
    <LunaToolbarSelect keyName="device" value="id" options={{'a': 'id'}}/>
  </LunaToolbar>
}
