import { contextBridge } from 'electron'
import mainObj from './main'
import nodeObj from 'share/preload/node'
import preloadObj from 'share/preload/preload'

contextBridge.exposeInMainWorld('preload', preloadObj)
contextBridge.exposeInMainWorld('main', mainObj)
contextBridge.exposeInMainWorld('node', nodeObj)

declare global {
  const main: typeof mainObj
  const preload: typeof preloadObj
  const node: typeof nodeObj
}
