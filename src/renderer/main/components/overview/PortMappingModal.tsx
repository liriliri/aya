import { t } from 'common/util'
import LunaModal from 'luna-modal/react'
import { observer } from 'mobx-react-lite'
import { createPortal } from 'react-dom'
import Style from './PortMappingModal.module.scss'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarInput,
  LunaToolbarSelect,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import LunaDataGrid from 'luna-data-grid/react'
import { useEffect, useRef, useState } from 'react'
import isStrBlank from 'licia/isStrBlank'
import store from '../../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { IModalProps } from 'share/common/types'
import { notify } from 'share/renderer/lib/util'
import { normalizePort } from '../../lib/util'

export default observer(function PortMappingModal(props: IModalProps) {
  const portForwarding = useRef(true)
  const [local, setLocal] = useState('')
  const [remote, setRemote] = useState('')
  const [data, setData] = useState<
    {
      local: string
      remote: string
    }[]
  >([])

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!store.device) {
      setData([])
    } else if (portForwarding.current) {
      setData(await main.listForwards(store.device.id))
    } else {
      setData(await main.listReverses(store.device.id))
    }
  }

  return createPortal(
    <LunaModal
      title={t('portMapping')}
      visible={props.visible}
      onClose={props.onClose}
    >
      <div className={Style.container}>
        <LunaToolbar className={Style.toolbar}>
          <LunaToolbarSelect
            keyName="portForwarding"
            onChange={(val) => {
              portForwarding.current = val === 'forward'
              refresh()
            }}
            value={portForwarding.current ? 'forward' : 'reverse'}
            options={{
              [t('portForwarding')]: 'forward',
              [t('portReversing')]: 'reverse',
            }}
          />
          <LunaToolbarInput
            keyName="local"
            className={Style.local}
            value={local}
            placeholder={t('local')}
            onChange={(val) => setLocal(val)}
          />
          <LunaToolbarInput
            keyName="remote"
            className={Style.remote}
            value={remote}
            placeholder={t('remote')}
            onChange={(val) => setRemote(val)}
          />
          <LunaToolbarButton
            state="hover"
            disabled={isStrBlank(local) || isStrBlank(remote) || !store.device}
            onClick={async () => {
              if (!store.device) {
                return
              }
              const l = normalizePort(local)
              const r = normalizePort(remote)
              try {
                if (portForwarding.current) {
                  await main.forward(store.device.id, l, r)
                } else {
                  await main.reverse(store.device.id, r, l)
                }
              } catch {
                notify(t('commonErr'), { icon: 'error' })
                return
              }
              refresh()
            }}
          >
            {t('add')}
          </LunaToolbarButton>
          <LunaToolbarSpace />
          <ToolbarIcon
            icon="refresh"
            title={t('refresh')}
            onClick={refresh}
            disabled={!store.device}
          />
        </LunaToolbar>
        <LunaDataGrid
          className={Style.grid}
          data={data}
          minHeight={250}
          maxHeight={250}
          selectable={true}
          columns={columns}
        />
      </div>
    </LunaModal>,
    document.body
  )
})

const columns = [
  {
    id: 'local',
    title: t('local'),
    sortable: true,
  },
  {
    id: 'remote',
    title: t('remote'),
    sortable: true,
  },
]
