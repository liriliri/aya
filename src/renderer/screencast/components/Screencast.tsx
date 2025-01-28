import { observer } from 'mobx-react-lite'
import store from '../store'
import { useEffect, useRef, useState } from 'react'
import ScrcpyClient from '../lib/ScrcpyClient'
import Style from './Screencast.module.scss'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'
import { LoadingBar } from '../../components/loading'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    preload.setTitle(device.name)

    async function start() {
      const video = await scrcpyClient.current.getVideo()
      video.stream.pipeTo(video.decoder.writable)
      screenContainerRef.current!.appendChild(video.decoder.renderer.element)
      setIsLoading(false)
    }
    start()

    return () => scrcpyClient.current.destroy()
  }, [])

  return (
    <div ref={screenContainerRef} className={Style.container}>
      {isLoading && <LoadingBar />}
    </div>
  )
})
