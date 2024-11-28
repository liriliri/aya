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
import LunaToolbar, {
  LunaToolbarHtml,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'

export default observer(function Performance() {
  const [uptime, setUptime] = useState(0)
  const dataRef = useRef({
    memUsed: 0,
    memTotal: 0,
    uptime: 0,
    batteryLevel: 0,
    batteryTemperature: 0,
    batteryVoltage: 0,
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

  const data = dataRef.current
  const batteryLevel = data.batteryLevel + '%'
  const batteryVoltage = `${(data.batteryVoltage / 1000).toFixed(2)}V`
  const batteryTemperature = `${data.batteryTemperature / 10}°C`
  const batteryTitle = `${batteryVoltage} ${batteryTemperature}`

  return (
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
        <LunaToolbarText
          text={`${t('uptime')} ${durationFormat(uptime, 'd:hh:mm:ss')}`}
        />
        <LunaToolbarSpace />
        <LunaToolbarHtml>
          <div className={Style.batteryContainer} title={batteryTitle}>
            <span className={Style.batteryLevel}>{batteryLevel}</span>
            <div className={Style.battery}>
              <div className={Style.batteryHead} />
              <div
                className={Style.batteryInside}
                style={{ width: batteryLevel }}
              />
            </div>
          </div>
        </LunaToolbarHtml>
      </LunaToolbar>
      <div className={Style.charts}>
        <LunaPerformanceMonitor
          title={`${t('memory')} ${Math.round(
            (data.memUsed / data.memTotal) * 100
          )}%`}
          data={memData}
          theme={store.theme}
          color={isDark ? colorWarningTextDark : colorWarningText}
          unit="MB"
        />
      </div>
    </div>
  )
})
