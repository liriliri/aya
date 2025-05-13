import LunaDataGrid from 'luna-data-grid/react'
import { observer } from 'mobx-react-lite'
import Style from './DeviceManager.module.scss'
import { t } from '../../../common/util'
import map from 'licia/map'
import concat from 'licia/concat'
import store from '../store'
import { useEffect, useState } from 'react'
import { getWindowHeight } from 'share/renderer/lib/util'

export default observer(function DeviceManager() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    async function resize() {
      const windowHeight = await getWindowHeight()
      const height = windowHeight - 31
      setHeight(height)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  const devices = map(concat(store.devices, store.remoteDevices), (device) => {
    return {
      id: device.id,
      name: device.name,
      serialno: device.serialno,
      androidVersion: `Android ${device.androidVersion} (API ${device.sdkVersion})`,
      status: device.type === 'offline' ? t('offline') : t('online'),
      type: device.type,
    }
  })

  return (
    <div className={Style.devices}>
      <LunaDataGrid
        className={Style.grid}
        onSelect={(node) => store.selectDevice(node.data as any)}
        onDeselect={() => store.selectDevice(null)}
        columns={columns}
        data={devices}
        selectable={true}
        filter={store.filter}
        minHeight={height}
        maxHeight={height}
        onDoubleClick={(e, node) => {
          if (node.data.type !== 'offline') {
            main.sendToWindow('main', 'selectDevice', node.data.id)
          }
        }}
        uniqueId="id"
      />
    </div>
  )
})

const columns = [
  {
    id: 'id',
    title: 'ID',
    sortable: true,
    weight: 15,
  },
  {
    id: 'serialno',
    title: t('serialno'),
    sortable: true,
    weight: 15,
  },
  {
    id: 'name',
    title: t('name'),
    sortable: true,
    weight: 30,
  },
  {
    id: 'androidVersion',
    title: t('androidVersion'),
    sortable: true,
    weight: 30,
  },
  {
    id: 'status',
    title: t('status'),
    sortable: true,
    weight: 10,
  },
]
