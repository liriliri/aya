import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import store from '../../store'
import LunaPerformanceMonitor from 'luna-performance-monitor/react'
import {
  green4,
  green4Dark,
  green6,
  green6Dark,
  orange6,
  orange6Dark,
  purple6,
  purple6Dark,
} from '../../../../common/theme'
import { t } from '../../../lib/util'
import sum from 'licia/sum'
import Style from './Performance.module.scss'
import durationFormat from 'licia/durationFormat'
import LunaToolbar, {
  LunaToolbarHtml,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import isEmpty from 'licia/isEmpty'
import map from 'licia/map'

export default observer(function Performance() {
  const [uptime, setUptime] = useState(0)
  const dataRef = useRef({
    memUsed: 0,
    memTotal: 0,
    uptime: 0,
    batteryLevel: 0,
    batteryTemperature: 0,
    batteryVoltage: 0,
    cpuLoads: [],
    cpus: [],
    frames: 0,
    frameTime: 0,
    fps: 0,
  })

  const memData = useCallback(() => {
    return Math.round(dataRef.current.memUsed / 1024 / 1024)
  }, [])

  const cpuData = useCallback(() => {
    const cpuLoads = dataRef.current.cpuLoads
    if (isEmpty(cpuLoads)) {
      return 0
    }
    const cpuLoad = sum(...cpuLoads) / cpuLoads.length
    return Math.floor(cpuLoad * 100)
  }, [])

  const fpsData = useCallback(() => dataRef.current.fps, [])

  const { device } = store

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    async function getPerformance() {
      timer = null
      if (device) {
        if (store.panel === 'performance') {
          try {
            const data = await main.getPerformance(device.id)
            setUptime(data.uptime)
            let fps = 0
            const lastData = dataRef.current
            if (lastData.frames) {
              const duration = data.frameTime - lastData.frameTime
              fps = Math.round(
                ((data.frames - lastData.frames) * 1000) / duration
              )
            }
            dataRef.current = {
              ...data,
              fps,
            }
            /* eslint-disable @typescript-eslint/no-unused-vars, no-empty */
          } catch (e) {}
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
          title="CPU"
          data={cpuData}
          theme={store.theme}
          max={100}
          color={isDark ? green6Dark : green6}
          height={80}
          unit="%"
        />
        <div className={Style.cpuContainer}>
          {map(data.cpuLoads, (load, idx) => (
            <Cpu key={idx} index={idx} dataRef={dataRef} load={load} />
          ))}
        </div>
        <LunaPerformanceMonitor
          title={`${t('memory')} ${Math.round(
            (data.memUsed / data.memTotal) * 100
          )}%`}
          data={memData}
          theme={store.theme}
          smooth={false}
          color={isDark ? purple6Dark : purple6}
          height={80}
          unit="MB"
        />
        <LunaPerformanceMonitor
          title="FPS"
          data={fpsData}
          theme={store.theme}
          smooth={false}
          height={80}
          color={isDark ? orange6Dark : orange6}
        />
      </div>
    </div>
  )
})

interface ICpuProps {
  dataRef: any
  index: number
  load: number
}

const Cpu = observer(function (props: ICpuProps) {
  const cpuData = useCallback(() => {
    const cpuLoad = props.dataRef.current.cpuLoads[props.index]!
    return Math.floor(cpuLoad * 100)
  }, [])

  const isDark = store.theme === 'dark'
  const speed = props.dataRef.current.cpus[props.index]!.speed

  return (
    <LunaPerformanceMonitor
      title={`CPU${props.index} ${speed}MHz`}
      data={cpuData}
      theme={store.theme}
      max={100}
      height={50}
      color={isDark ? green4Dark : green4}
      unit="%"
    />
  )
})
