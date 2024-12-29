import sleep from 'licia/sleep'
import each from 'licia/each'
import map from 'licia/map'
import trim from 'licia/trim'
import toNum from 'licia/toNum'
import startWith from 'licia/startWith'
import { shell } from './base'

const DEFAULT_PERIOD = 50

export async function getCpuLoads(
  deviceId: string,
  allCpus: any[],
  period = 0
) {
  const cpuLoads: number[] = []
  if (!period) {
    period = DEFAULT_PERIOD
  }

  return new Promise(function (resolve) {
    sleep(period).then(async () => {
      const newAllCpus = await getCpus(deviceId, false)
      each(allCpus, (cpu, idx) => {
        cpuLoads[idx] = calculateCpuLoad(cpu, newAllCpus[idx])
      })
      resolve(cpuLoads)
    })
  })
}

function calculateCpuLoad(lastCpu, cpu) {
  const lastTimes = lastCpu.times
  const times = cpu.times
  const lastLoad =
    lastTimes.user +
    lastTimes.sys +
    lastTimes.nice +
    lastTimes.irq +
    lastTimes.iowait +
    lastTimes.softirq
  const lastTick = lastLoad + lastTimes.idle
  const load =
    times.user +
    times.sys +
    times.nice +
    times.irq +
    times.iowait +
    times.softirq
  const tick = load + times.idle

  return (load - lastLoad) / (tick - lastTick)
}

export async function getCpus(deviceId: string, speed = true) {
  const result: string = await shell(deviceId, 'cat /proc/stat')
  const lines = result.split('\n')
  const cpus: any[] = []

  each(lines, (line) => {
    line = trim(line)
    if (!startWith(line, 'cpu')) {
      return
    }

    const parts = line.split(/\s+/)
    if (parts[0] === 'cpu') {
      return
    }

    const cpu: any = {}
    cpu.times = {
      user: toNum(parts[1]),
      nice: toNum(parts[2]),
      sys: toNum(parts[3]),
      idle: toNum(parts[4]),
      iowait: toNum(parts[5]),
      irq: toNum(parts[6]),
      softirq: toNum(parts[7]),
    }

    cpus.push(cpu)
  })

  if (speed) {
    const freqs = await shell(
      deviceId,
      map(cpus, (cpu, idx) => {
        return `cat /sys/devices/system/cpu/cpu${idx}/cpufreq/scaling_cur_freq`
      })
    )
    const speeds: number[] = []
    each(freqs, (line) => {
      line = trim(line)
      if (!line) {
        return
      }
      speeds.push(Math.floor(toNum(line) / 1000))
    })

    each(cpus, (cpu, idx) => {
      cpu.speed = speeds[idx]
    })
  }

  return cpus
}
