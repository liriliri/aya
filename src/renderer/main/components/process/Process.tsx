import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import store from '../../store'
import LunaDataGrid from 'luna-data-grid/react'
import Style from './Process.module.scss'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import fileSize from 'licia/fileSize'
import className from 'licia/className'
import contain from 'licia/contain'
import { t } from '../../../lib/util'
import LunaModal from 'luna-modal'

export default observer(function Process() {
  const [processes, setProcesses] = useState([])
  const [packages, setPackages] = useState([])
  const [listHeight, setListHeight] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('')

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getProcesses() {
      timer = null
      if (device) {
        if (store.panel === 'process') {
          setProcesses(await main.getProcesses(device.id))
          setPackages(await main.getPackages(device.id))
        }
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

  async function stop() {
    if (!selected) {
      return
    }
    const result = await LunaModal.confirm(
      t('stopPackageConfirm', { name: selected.args })
    )
    if (result) {
      await main.stopPackage(device!.id, selected.args)
    }
  }

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarText
          text={t('totalProcess', { total: processes.length })}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          disabled={selected === null || !contain(packages, selected.name)}
          icon="delete"
          title={t('stop')}
          onClick={stop}
        />
      </LunaToolbar>
      <LunaDataGrid
        onSelect={async (node) => setSelected(node.data)}
        onDeselect={() => setSelected(null)}
        filter={filter}
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
    id: 'name',
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
    comparator: (a: string, b: string) => fileSize(a) - fileSize(b),
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
