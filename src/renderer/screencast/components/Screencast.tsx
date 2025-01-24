import { observer } from 'mobx-react-lite'
import store from '../store'
import { useEffect, useRef } from 'react'
import ScrcpyClient from '../lib/ScrcpyClient'

export default observer(function Screencast() {
  const device = store.device!
  const scrcpyClient = useRef<ScrcpyClient>(new ScrcpyClient(device.id))

  useEffect(() => {
    preload.setTitle(device.name)
    scrcpyClient.current.start()
  }, [])

  return <div>Screencast</div>
})
