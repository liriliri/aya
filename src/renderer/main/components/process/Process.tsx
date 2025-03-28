import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import store from '../../store'
import LunaDataGrid from 'luna-data-grid/react'
import Style from './Process.module.scss'
import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import fileSize from 'licia/fileSize'
import className from 'licia/className'
import has from 'licia/has'
import isEmpty from 'licia/isEmpty'
import { t } from '../../../../common/util'
import LunaModal from 'luna-modal'
import singleton from 'licia/singleton'
import map from 'licia/map'
import defaultIcon from '../../../assets/default-icon.png'
import toEl from 'licia/toEl'
import find from 'licia/find'

export default observer(function Process() {
  const [processes, setProcesses] = useState<any[]>([])
  const packageInfos = useRef<any[]>([])
  const [listHeight, setListHeight] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('')

  const { device } = store

  const getPackageInfos = useCallback(
    singleton(async function () {
      if (!device) {
        return
      }
      const packages = await main.getPackages(device.id)
      packageInfos.current = await main.getPackageInfos(device.id, packages)
    }),
    []
  )

  const getProcesses = useCallback(
    singleton(async function () {
      if (device) {
        if (isEmpty(packageInfos.current)) {
          getPackageInfos()
        }
        const allProcesses = await main.getProcesses(device.id)
        let processes = map(allProcesses, (process: any) => {
          const info = find(packageInfos.current, (info) => {
            const match = process.name.match(/^[\w.]+/)
            if (!match) {
              return false
            }

            return match[0] === info.packageName
          })

          if (info) {
            const icon = info.icon || defaultIcon
            const name = toEl(
              `<span><img src="${icon}" />${process.name.replace(
                info.packageName,
                info.label
              )}</span>`
            )
            return {
              ...process,
              packageName: info.packageName,
              label: info.label,
              name,
            }
          } else {
            return process
          }
        })
        if (!isEmpty(packageInfos.current) && store.process.onlyPackage) {
          processes = processes.filter((process) => {
            return process.packageName
          })
        }
        setProcesses(processes)
      }
    }),
    []
  )

  useEffect(() => {
    let destroyed = false

    async function refresh() {
      if (store.panel === 'process') {
        await getProcesses()
      }
      if (!destroyed) {
        setTimeout(refresh, 5000)
      }
    }
    refresh()

    function resize() {
      const height = window.innerHeight - 89
      setListHeight(height)
    }
    resize()

    window.addEventListener('resize', resize)

    return () => {
      destroyed = true

      window.removeEventListener('resize', resize)
    }
  }, [])

  async function stop() {
    if (!selected || !has(selected, 'packageName')) {
      return
    }
    const result = await LunaModal.confirm(
      t('stopPackageConfirm', { name: selected.label })
    )
    if (result) {
      await main.stopPackage(device!.id, selected.packageName)
      await getProcesses()
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
        <LunaToolbarCheckbox
          keyName="onlyPackage"
          value={store.process.onlyPackage}
          label={t('onlyPackage')}
          onChange={(val) => {
            getProcesses()
            store.process.set('onlyPackage', val)
          }}
        />
        <LunaToolbarSeparator />
        <LunaToolbarText
          text={t('totalProcess', { total: processes.length })}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          disabled={selected === null || !has(selected, 'packageName')}
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
