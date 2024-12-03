import { observer } from 'mobx-react-lite'
import Style from './Webview.module.scss'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import { useEffect, useState } from 'react'
import { t } from '../../../lib/util'
import LunaDataGrid from 'luna-data-grid/react'
import store from '../../store'
import ToolbarIcon from '../../../components/ToolbarIcon'

export default observer(function Webview() {
  const [port, setPort] = useState(0)
  const [webviews, setWebviews] = useState([])
  const [selected, setSelected] = useState<any>(null)
  const [topActivity, setTopActivity] = useState({
    name: '',
    pid: 0,
  })
  const [listHeight, setListHeight] = useState(0)
  const [filter, setFilter] = useState('')

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getWebviews() {
      timer = null
      if (device) {
        if (store.panel === 'webview') {
          try {
            const topActivity = await main.getTopActivity(device.id)
            setTopActivity(topActivity)
            if (topActivity.pid) {
              const result = await main.getWebviews(device.id, topActivity.pid)
              setPort(result.port)
              setWebviews(result.webviews)
            }
            /* eslint-disable @typescript-eslint/no-unused-vars, no-empty */
          } catch (e) {}
        }
      }
      timer = setTimeout(getWebviews, 2000)
    }

    getWebviews()

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

  function inspect() {
    if (!selected) {
      return
    }
    window.open(selected.devtoolsFrontendUrl)
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
        <LunaToolbarText text={topActivity ? topActivity.name : ''} />
        <LunaToolbarSpace />
        <ToolbarIcon
          disabled={selected === null}
          icon="debug"
          title={t('inspect')}
          onClick={inspect}
        />
      </LunaToolbar>
      <LunaDataGrid
        onSelect={async (node) => setSelected(node.data)}
        onDeselect={() => setSelected(null)}
        className={Style.webviews}
        filter={filter}
        columns={columns}
        data={webviews}
        selectable={true}
        minHeight={listHeight}
        maxHeight={listHeight}
        uniqueId="id"
      />
    </div>
  )
})

const columns = [
  {
    id: 'title',
    title: t('title'),
    sortable: true,
    weight: 20,
  },
  {
    id: 'url',
    title: 'URL',
    sortable: true,
  },
  {
    id: 'type',
    title: t('type'),
    sortable: true,
    weight: 10,
  },
]
