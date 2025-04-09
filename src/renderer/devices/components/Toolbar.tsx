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

export default observer(function Toolbar() {
  const { device } = store

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
            // eslint-disable-next-line
          } catch (e) {
            notify(t('connectErr'), { icon: 'error' })
          }
        }}
        state="hover"
        disabled={isStrBlank(store.ip)}
      >
        {t('connect')}
      </LunaToolbarButton>
      <LunaToolbarSeparator />
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
