import LunaDataGrid from 'luna-data-grid/react'
import { observer } from 'mobx-react-lite'
import Style from './DeviceManager.module.scss'
import { t } from '../../../common/util'
import map from 'licia/map'
import concat from 'licia/concat'
import store from '../store'
import { useEffect, useRef } from 'react'
import DataGrid from 'luna-data-grid'
import ResizeSensor from 'licia/ResizeSensor'

export default observer(function DeviceManager() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dataGridRef = useRef<DataGrid>(null)
  const resizeSensorRef = useRef<ResizeSensor>(null)

  useEffect(() => {
    const resizeSensor = new ResizeSensor(containerRef.current!)
    resizeSensor.addListener(() => {
      dataGridRef.current?.fit()
    })
    resizeSensorRef.current = resizeSensor

    return () => {
      resizeSensor.destroy()
      resizeSensorRef.current = null
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
    <div ref={containerRef} className={Style.container}>
      <LunaDataGrid
        className={Style.devices}
        onSelect={(node) => store.selectDevice(node.data.id as string)}
        onDeselect={() => store.selectDevice(null)}
        columns={columns}
        data={devices}
        selectable={true}
        filter={store.filter}
        onDoubleClick={(e, node) => {
          if (node.data.type !== 'offline') {
            main.sendToWindow('main', 'selectDevice', node.data.id)
          }
        }}
        uniqueId="id"
        onCreate={(dataGrid) => {
          dataGridRef.current = dataGrid
          dataGrid.fit()
        }}
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
