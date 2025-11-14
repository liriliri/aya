import { observer } from 'mobx-react-lite'
import Style from './AvdManager.module.scss'
import LunaDataGrid from 'luna-data-grid/react'
import DataGrid from 'luna-data-grid'
import { t } from 'common/util'
import { useRef } from 'react'
import store from '../store'
import map from 'licia/map'
import fileSize from 'licia/fileSize'
import { useWindowResize } from 'share/renderer/lib/hooks'

export default observer(function AvdManager() {
  const dataGridRef = useRef<DataGrid>(null)

  useWindowResize(() => dataGridRef.current?.fit())

  const avds = map(store.avds, (avd) => {
    return {
      id: avd.id,
      name: avd.name,
      abi: avd.abi,
      sdkVersion: avd.sdkVersion,
      memory: fileSize(avd.memory * 1024 * 1024),
      internalStorage: fileSize(avd.internalStorage),
      resolution: avd.resolution,
    }
  })

  return (
    <div className={Style.container}>
      <LunaDataGrid
        className={Style.avds}
        onSelect={(node) => store.selectAvd(node.data.id as string)}
        onDeselect={() => store.selectAvd(null)}
        onDoubleClick={(e, node) => {
          main.startAvd(node.data.id as string)
        }}
        data={avds}
        columns={columns}
        selectable={true}
        filter={store.filter}
        uniqueId="name"
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
    id: 'name',
    title: t('name'),
    sortable: true,
    weight: 30,
  },
  {
    id: 'resolution',
    title: t('resolution'),
    sortable: true,
    weight: 15,
  },
  {
    id: 'sdkVersion',
    title: t('sdkVersion'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'abi',
    title: 'ABI',
    sortable: true,
    weight: 15,
  },
  {
    id: 'memory',
    title: t('memory'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'internalStorage',
    title: t('storage'),
    sortable: true,
    weight: 10,
  },
]
