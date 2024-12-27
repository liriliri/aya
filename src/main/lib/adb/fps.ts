import { shell, getDeviceStore, setDeviceStore } from './base'
import toNum from 'licia/toNum'
import now from 'licia/now'
import filter from 'licia/filter'
import map from 'licia/map'
import isEmpty from 'licia/isEmpty'
import each from 'licia/each'
import contain from 'licia/contain'
import max from 'licia/max'
import last from 'licia/last'
import trim from 'licia/trim'
import { handleEvent } from '../util'

async function getFps(deviceId: string, pkg: string) {
  let fps = 0

  const result: string = await shell(deviceId, 'dumpsys SurfaceFlinger')
  const match = result.match(/flips=(\d+)/)
  if (match) {
    const flips = toNum(match[1])
    const time = now()
    const lastFlips = getDeviceStore(deviceId, 'flips')
    if (lastFlips) {
      fps = Math.round(
        ((flips - lastFlips.flips) * 1000) / (time - lastFlips.time)
      )
    }
    setDeviceStore(deviceId, 'flips', {
      time,
      flips,
    })

    return fps
  } else {
    fps = await getFpsByLatency(deviceId, pkg)
  }

  return fps
}

async function getFpsByLatency(deviceId: string, pkg: string) {
  const fps = 0

  if (!pkg) {
    return fps
  }

  const list = await shell(deviceId, 'dumpsys SurfaceFlinger --list')
  const layers = filter(list.split('\n'), (line) => contain(line, pkg))
  if (isEmpty(layers)) {
    return fps
  }

  const latencyCmd = map(layers, (layer) => {
    return `dumpsys SurfaceFlinger --latency "${layer}"`
  }).join('\n echo "aya_separator";\n')

  const latency = await shell(deviceId, latencyCmd)
  const latencies = latency.split('aya_separator')
  const allFps = map(latencies, (latency) => {
    latency = trim(latency)
    let fps = 0
    const timestamps: number[] = []
    each(latency.split('\n'), (line) => {
      const match = line.match(/(\d+)\s+(\d+)\s+(\d+)/)
      if (match) {
        timestamps.push(toNum(match[2]) / 1e9)
      }
    })
    timestamps.pop()

    if (timestamps.length > 1) {
      const seconds = last(timestamps) - timestamps[0]
      if (seconds > 0) {
        fps = Math.round((timestamps.length - 1) / seconds)
      }
    }
    return fps
  })

  return max(...allFps)
}

export async function init() {
  handleEvent('getFps', getFps)
}
