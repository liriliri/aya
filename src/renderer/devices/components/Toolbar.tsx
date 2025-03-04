import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import Style from './Toolbar.module.scss'
import { useState } from 'react'
import toNum from 'licia/toNum'
import isIp from 'licia/isIp'
import isStrBlank from 'licia/isStrBlank'
import { t } from '../../../common/util'
import { notify } from 'share/renderer/lib/util'
import ToolbarIcon from '../../components/ToolbarIcon'
import store from '../store'

export default observer(function Toolbar() {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const { device } = store

  return (
    <LunaToolbar className={Style.toolbar}>
      <LunaToolbarInput
        keyName="ip"
        className={Style.ip}
        placeholder={t('ipAddress')}
        value={ip}
        onChange={(val) => setIp(val)}
      />
      <LunaToolbarInput
        keyName="port"
        className={Style.port}
        placeholder={t('port')}
        value={port}
        onChange={(val) => setPort(val)}
      />
      <LunaToolbarButton
        onClick={async () => {
          try {
            if (port) {
              await main.connectDevice(ip, toNum(port))
            } else {
              await main.connectDevice(ip)
            }
            // eslint-disable-next-line
          } catch (e) {
            notify(t('connectErr'), { icon: 'error' })
          }
        }}
        state="hover"
        disabled={isStrBlank(ip)}
      >
        {t('connect')}
      </LunaToolbarButton>
      <LunaToolbarSeparator />
      <ToolbarIcon
        icon="disconnect"
        title={t('disconnect')}
        disabled={!device || !isIp.v4(device.id.split(':')[0])}
        onClick={async () => {
          if (device) {
            const [ip, port] = device.id.split(':')
            if (port) {
              await main.disconnectDevice(ip, toNum(port))
            } else {
              await main.disconnectDevice(ip)
            }
          }
        }}
      />
      <LunaToolbarSpace />
      <LunaToolbarInput
        keyName="filter"
        value={store.filter}
        placeholder={t('filter')}
        onChange={(val) => store.setFilter(val)}
      />
      <ToolbarIcon
        icon="refresh"
        title={t('refresh')}
        onClick={async () => {
          main.sendToWindow('main', 'refreshDevices')
          notify(t('deviceRefreshed'), { icon: 'success' })
        }}
      />
    </LunaToolbar>
  )
})
