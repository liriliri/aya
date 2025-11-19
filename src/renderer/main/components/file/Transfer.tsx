import { observer } from 'mobx-react-lite'
import Style from './Transfer.module.scss'
import LunaDataGrid from 'luna-data-grid/react'
import { t } from 'common/util'
import { useRef } from 'react'
import DataGrid from 'luna-data-grid'
import { useResizeSensor } from 'share/renderer/lib/hooks'
import store from '../../store'
import map from 'licia/map'
import { TransferType } from 'common/types'
import dateFormat from 'licia/dateFormat'
import durationFormat from 'licia/durationFormat'
import fileSize from 'licia/fileSize'

export default observer(function Transfer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dataGridRef = useRef<DataGrid>(null)

  useResizeSensor(containerRef, () => {
    dataGridRef.current?.fit()
  })

  const data = map(store.file.transfers, (transfer) => {
    return {
      id: transfer.id,
      type:
        transfer.type === TransferType.Download ? t('download') : t('upload'),
      source: transfer.src,
      destination: transfer.dest,
      startTime: dateFormat(transfer.startTime, 'mm-dd HH:MM:ss'),
      duration: durationFormat(Math.round(transfer.duration), 'h:m:s:l'),
      size: `${fileSize(transfer.transferred)}B/${fileSize(transfer.size)}B`,
      speed: fileSize(transfer.speed) + 'B/s',
    }
  })

  return (
    <div className={Style.container} ref={containerRef}>
      <LunaDataGrid
        columns={columns}
        data={data}
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
    id: 'type',
    title: t('type'),
    weight: 10,
  },
  {
    id: 'source',
    title: t('source'),
    weight: 15,
  },
  {
    id: 'destination',
    title: t('destination'),
    weight: 15,
  },
  {
    id: 'startTime',
    title: t('startTime'),
    weight: 20,
  },
  {
    id: 'duration',
    title: t('duration'),
    weight: 20,
  },
  {
    id: 'size',
    title: t('size'),
    weight: 20,
  },
  {
    id: 'speed',
    title: t('speed'),
    weight: 20,
  },
]
