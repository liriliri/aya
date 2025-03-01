import LunaDataGrid from 'luna-data-grid/react'
import { observer } from 'mobx-react-lite'
import Style from './DeviceManager.module.scss'
import { t } from '../../../common/util'
import map from 'licia/map'
import store from '../store'
import { useEffect, useState } from 'react'

export default observer(function DeviceManager() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    function resize() {
      const height = window.innerHeight - 58
      setHeight(height)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  const devices = map(store.devices, (device) => {
    return {
      id: device.id,
      name: device.name,
      androidVersion: `Android ${device.androidVersion} (API ${device.sdkVersion})`,
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
          main.sendToWindow('main', 'selectDevice', node.data.id)
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
