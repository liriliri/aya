import LunaModal from 'luna-modal/react'
import { createPortal } from 'react-dom'
import { t } from '../../../../common/util'
import { observer } from 'mobx-react-lite'
import Style from './DeviceManagerModal.module.scss'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { notify } from '../../../lib/util'
import store from '../../store'
import LunaDataGrid from 'luna-data-grid/react'
import { useState } from 'react'
import map from 'licia/map'
import isStrBlank from 'licia/isStrBlank'
import isIp from 'licia/isIp'
import toNum from 'licia/toNum'

interface IProps {
  visible: boolean
  onClose: () => void
}

export default observer(function DeviceManagerModal(props: IProps) {
  const [filter, setFilter] = useState('')
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const devices = map(store.devices, (device) => {
    return {
      id: device.id,
      name: device.name,
      androidVersion: `Android ${device.androidVersion} (API ${device.sdkVersion})`,
    }
  })

  return createPortal(
    <LunaModal
      title={t('deviceManager')}
      visible={props.visible}
      width={720}
      onClose={props.onClose}
    >
      <div className={Style.devices}>
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
            disabled={!selected || !isIp.v4(selected.id.split(':')[0])}
            onClick={async () => {
              if (selected) {
                const [ip, port] = selected.id.split(':')
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
            value={filter}
            placeholder={t('filter')}
            onChange={(val) => setFilter(val)}
          />
          <ToolbarIcon
            icon="refresh"
            title={t('refresh')}
            onClick={async () => {
              await store.refreshDevices()
              notify(t('deviceRefreshed'), { icon: 'success' })
            }}
          />
        </LunaToolbar>
        <LunaDataGrid
          className={Style.grid}
          onSelect={(node) => setSelected(node.data)}
          onDeselect={() => setSelected(null)}
          columns={columns}
          data={devices}
          selectable={true}
          filter={filter}
          minHeight={250}
          maxHeight={250}
          onDoubleClick={(e, node) => {
            store.selectDevice(node.data.id as string)
            props.onClose()
          }}
          uniqueId="id"
        />
      </div>
    </LunaModal>,
    document.body
  )
})

const columns = [
  {
    id: 'id',
    title: 'ID',
    sortable: true,
    weight: 20,
  },
  {
    id: 'name',
    title: t('name'),
    sortable: true,
    weight: 40,
  },
  {
    id: 'androidVersion',
    title: t('androidVersion'),
    sortable: true,
    weight: 40,
  },
]
