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
} from 'common/theme'
import { t } from 'common/util'
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
import extend from 'licia/extend'
import className from 'licia/className'

export default observer(function Performance() {
  const [uptime, setUptime] = useState(0)
  const dataRef = useRef({
    topPackage: {
      name: '',
      label: '',
      pid: 0,
    },
    memUsed: 0,
    memTotal: 0,
    batteryLevel: 0,
    batteryTemperature: 0,
    batteryVoltage: 0,
    cpuLoads: [],
    cpus: [],
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
    let destroyed = false

    async function getPerformance() {
      if (device) {
        if (store.panel === 'performance') {
          try {
            main.getUptime(device.id).then(setUptime)
            main.getPerformance(device.id).then((performance) => {
              extend(dataRef.current, performance)
            })
            main.getTopPackage(device.id).then(async (topPackage) => {
              extend(dataRef.current.topPackage, topPackage)
              if (topPackage.name) {
                const packageInfos = await main.getPackageInfos(device.id, [
                  topPackage.name,
                ])
                dataRef.current.topPackage.label = packageInfos[0].label
              }
            })
            main
              .getFps(device.id, dataRef.current.topPackage.name)
              .then((fps) => {
                dataRef.current.fps = fps
              })
          } catch {
            // ignore
          }
        }
      }
      if (!destroyed) {
        setTimeout(getPerformance, 1000)
      }
    }

    getPerformance()

    return () => {
      destroyed = true
    }
  }, [])

  const isDark = store.theme === 'dark'

  const data = dataRef.current
  const batteryLevel = data.batteryLevel + '%'
  const batteryVoltage = `${(data.batteryVoltage / 1000).toFixed(2)}V`
  const batteryTemperature = `${data.batteryTemperature / 10}°C`
  const batteryTitle = `${batteryVoltage} ${batteryTemperature}`

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
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
      <div className={className('panel-body', Style.charts)}>
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
          title={`${t('memory')} ${
            data.memUsed
              ? Math.round((data.memUsed / data.memTotal) * 100) + '%'
              : ''
          }`}
          data={memData}
          theme={store.theme}
          smooth={false}
          color={isDark ? purple6Dark : purple6}
          height={80}
          unit="MB"
        />
        <LunaPerformanceMonitor
          title={`FPS ${data.topPackage.label}`}
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
