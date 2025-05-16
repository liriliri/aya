import { observer } from 'mobx-react-lite'
import Style from './AvdManager.module.scss'
import LunaDataGrid from 'luna-data-grid/react'
import { t } from '../../../common/util'
import { useEffect, useState } from 'react'
import { getWindowHeight } from 'share/renderer/lib/util'
import store from '../store'
import map from 'licia/map'
import fileSize from 'licia/fileSize'

export default observer(function AvdManager() {
  const [listHeight, setListHeight] = useState(0)

  useEffect(() => {
    async function resize() {
      const windowHeight = await getWindowHeight()
      const height = windowHeight - 31
      setListHeight(height)
    }
    resize()

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  const avds = map(store.avds, (avd) => {
    return {
      id: avd.id,
      name: avd.name,
      abi: avd.abi,
      sdkVersion: avd.sdkVersion,
      memory: fileSize(avd.memory * 1024 * 1024),
      internalStorage: avd.internalStorage,
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
        minHeight={listHeight}
        maxHeight={listHeight}
        selectable={true}
        filter={store.filter}
        uniqueId="name"
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
