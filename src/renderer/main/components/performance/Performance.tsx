import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import store from '../../store'
import LunaPerformanceMonitor from 'luna-performance-monitor/react'
import {
  colorWarningText,
  colorWarningTextDark,
} from '../../../../common/theme'
import { t } from '../../../lib/util'
import Style from './Performance.module.scss'
import durationFormat from 'licia/durationFormat'
import LunaToolbar, { LunaToolbarText } from 'luna-toolbar/react'

export default observer(function Performance() {
  const [uptime, setUptime] = useState(0)
  const dataRef = useRef({
    memUsed: 0,
    uptime: 0,
  })

  const memData = useCallback(() => {
    return Math.round(dataRef.current.memUsed / 1024 / 1024)
  }, [])

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getPerformance() {
      timer = null
      if (device) {
        if (store.panel === 'performance') {
          const data = await main.getPerformance(device.id)
          setUptime(data.uptime)
          dataRef.current = data
        }
      }
      timer = setTimeout(getPerformance, 1000)
    }

    getPerformance()

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  const isDark = store.theme === 'dark'

  return (
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
        <LunaToolbarText text={`${t('uptime')} ${durationFormat(uptime)}`} />
      </LunaToolbar>
      <div className={Style.charts}>
        <LunaPerformanceMonitor
          title={t('memory')}
          data={memData}
          theme={store.theme}
          color={isDark ? colorWarningTextDark : colorWarningText}
          unit="MB"
        />
      </div>
    </div>
  )
})
