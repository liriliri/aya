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
import endWith from 'licia/endWith'
import contain from 'licia/contain'
import { t } from '../../../lib/util'
import LunaModal from 'luna-modal'

export default observer(function Process() {
  const [processes, setProcesses] = useState([])
  const [listHeight, setListHeight] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('')

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getProcesses() {
      if (device) {
        if (store.panel === 'process') {
          const processes = await main.getProcesses(device.id)
          setProcesses(processes)
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
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
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
          disabled={selected === null}
          icon="delete"
          title={t('stop')}
          onClick={stop}
        />
      </LunaToolbar>
      <LunaDataGrid
        onSelect={async (node) => {
          const packages = await main.getPackages(device!.id)
          if (contain(packages, node.data.name)) {
            setSelected(node.data)
          } else {
            setSelected(null)
          }
        }}
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
    comparator: (a, b) => toBytes(a) - toBytes(b),
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

function toBytes(memory: string) {
  let num = parseFloat(memory)
  if (endWith(memory, 'K')) {
    num *= 1024
  } else if (endWith(memory, 'M')) {
    num *= 1024 * 1024
  } else if (endWith(memory, 'G')) {
    num *= 1024 * 1024 * 1024
  }

  return num
}
