import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import Style from './Toolbar.module.scss'
import toNum from 'licia/toNum'
import isStrBlank from 'licia/isStrBlank'
import { t } from '../../../common/util'
import { notify } from 'share/renderer/lib/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import store from '../store'
import { isRemoteDevice } from '../lib/util'
import some from 'licia/some'

export default observer(function Toolbar() {
  const { device, remoteDevices } = store

  const wirelessDisabled =
    !device ||
    isRemoteDevice(device.id) ||
    some(remoteDevices, (d) => {
      return d.serialno === device.serialno && d.type !== 'offline'
    })

  return (
    <LunaToolbar className={Style.toolbar}>
      <LunaToolbarInput
        keyName="ip"
        className={Style.ip}
        placeholder={t('ipAddress')}
        value={store.ip}
        onChange={(val) => store.setIp(val)}
      />
      <LunaToolbarInput
        keyName="port"
        className={Style.port}
        placeholder={t('port')}
        value={store.port}
        onChange={(val) => store.setPort(val)}
      />
      <LunaToolbarButton
        onClick={async () => {
          try {
            if (store.port) {
              await main.connectDevice(store.ip, toNum(store.port))
            } else {
              await main.connectDevice(store.ip)
            }
          } catch {
            notify(t('connectErr'), { icon: 'error' })
          }
        }}
        state="hover"
        disabled={isStrBlank(store.ip)}
      >
        {t('connect')}
      </LunaToolbarButton>
      <LunaToolbarSpace />
      <ToolbarIcon
        icon="wifi"
        title={t('wirelessMode')}
        disabled={wirelessDisabled}
        onClick={() => {
          if (device) {
            main.startWireless(device.id)
          }
        }}
      />
      <ToolbarIcon
        icon="disconnect"
        title={t('disconnect')}
        disabled={
          !device || !isRemoteDevice(device.id) || device.type === 'offline'
        }
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
      <ToolbarIcon
        icon="delete"
        title={t('delete')}
        disabled={
          !device || !isRemoteDevice(device.id) || device.type !== 'offline'
        }
        onClick={async () => {
          if (device) {
            store.removeRemoteDevice(device.id)
          }
        }}
      />
      <LunaToolbarSeparator />
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
