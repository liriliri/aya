import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import store from '../../store'
import LunaDataGrid from 'luna-data-grid/react'
import Style from './Process.module.scss'
import LunaToolbar from 'luna-toolbar/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { t } from '../../../lib/util'

export default observer(function Process() {
  const [processes, setProcesses] = useState([])
  const [listHeight, setListHeight] = useState(0)

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getProcesses() {
      if (device) {
        const processes = await main.getProcesses(device.id)
        setProcesses(processes)
      }
      timer = setTimeout(getProcesses, 5000)
    }

    getProcesses()

    function resize() {
      const height = window.innerHeight - 89
      setListHeight(height)
    }
    resize()

    window.addEventListener('resize', resize)

    return () => {
      if (timer) {
        clearTimeout(timer)
      }

      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
        <ToolbarIcon icon="delete" title={t('clear')} onClick={() => {}} />
      </LunaToolbar>
      <LunaDataGrid
        className={Style.processes}
        data={processes}
        columns={columns}
        selectable={true}
        minHeight={listHeight}
        maxHeight={listHeight}
        uniqueId="pid"
      />
    </div>
  )
})

const columns = [
  {
    id: 'args',
    title: t('processName'),
    sortable: true,
    weight: 30,
  },
  {
    id: '%cpu',
    title: '% CPU',
    sortable: true,
  },
  {
    id: 'time+',
    title: t('cpuTime'),
    sortable: true,
  },
  {
    id: 'res',
    title: t('memory'),
    sortable: true,
  },
  {
    id: 'pid',
    title: 'PID',
    sortable: true,
  },
  {
    id: 'user',
    title: t('user'),
    sortable: true,
  },
]
