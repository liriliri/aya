import { observer } from 'mobx-react-lite'
import store from '../store'
import { useEffect, useRef } from 'react'
import ScrcpyClient from '../lib/ScrcpyClient'
import Style from './Screencast.module.scss'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'

export default observer(function Screencast() {
  const device = store.device!
  const scrcpyClient = useRef<ScrcpyClient>(
    new ScrcpyClient(
      device.id,
      new ScrcpyOptions3_1({
        audio: true,
        clipboardAutosync: false,
      })
    )
  )
  const screenContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    preload.setTitle(device.name)

    async function start() {
      const video = await scrcpyClient.current.getVideo()
      video.stream.pipeTo(video.decoder.writable)
      screenContainerRef.current!.appendChild(video.decoder.renderer.element)
    }
    start()

    return () => scrcpyClient.current.destroy()
  }, [])

  return <div ref={screenContainerRef} className={Style.container} />
})
