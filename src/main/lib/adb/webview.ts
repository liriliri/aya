import each from 'licia/each'
import trim from 'licia/trim'
import contain from 'licia/contain'
import singleton from 'licia/singleton'
import axios from 'axios'
import { shell, forwardTcp } from './base'
import { handleEvent } from 'share/main/lib/util'

const getWebviews = singleton(async (deviceId: string, pid: number) => {
  const webviews: any[] = []

  const result: string = await shell(deviceId, `cat /proc/net/unix`)

  const lines = result.split('\n')
  let line = ''
  for (let i = 0, len = lines.length; i < len; i++) {
    line = trim(lines[i])
    if (contain(line, `webview_devtools_remote_${pid}`)) {
      break
    }
  }

  if (!line) {
    return webviews
  }

  const socketNameMatch = line.match(/[^@]+@(.*?webview_devtools_remote_?.*)/)
  if (!socketNameMatch) {
    return webviews
  }

  const socketName = socketNameMatch[1]
  const remote = `localabstract:${socketName}`
  const port = await forwardTcp(deviceId, remote)
  const { data } = await axios.get(`http://127.0.0.1:${port}/json`)
  each(data, (item: any) => webviews.push(item))

  return webviews
})

export function init() {
  handleEvent('getWebviews', getWebviews)
}
