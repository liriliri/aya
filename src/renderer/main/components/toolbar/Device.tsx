import LunaToolbar, { LunaToolbarSelect } from 'luna-toolbar/react'
import types from 'licia/types'
import Style from './Device.module.scss'
import { observer } from 'mobx-react-lite'
import isEmpty from 'licia/isEmpty'
import store from '../../store'
import { t } from '../../../lib/util'
import each from 'licia/each'

export default observer(function Device() {
  let deviceOptions: types.PlainObj<string> = {}
  let deviceDisabled = false
  if (!isEmpty(store.devices)) {
    deviceOptions = {}
    each(store.devices, (device) => {
      deviceOptions[device.name] = device.id
    })
  } else {
    deviceOptions[t('deviceNotConnected')] = ''
    deviceDisabled = true
  }

  return (
    <LunaToolbar
      className={Style.container}
      onChange={(key, val) => {
        if (key === 'device') {
          store.selectDevice(val)
        }
      }}
    >
      <LunaToolbarSelect
        keyName="device"
        disabled={deviceDisabled}
        value={store.device ? store.device.id : ''}
        options={deviceOptions}
      />
    </LunaToolbar>
  )
})
