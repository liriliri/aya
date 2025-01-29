import { observer } from 'mobx-react-lite'
import store from '../store'
import { useEffect, useRef, useState } from 'react'
import Style from './Screencast.module.scss'
import { LoadingBar } from '../../components/loading'

export default observer(function Screencast() {
  const { device, scrcpyClient } = store
  const screenContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    preload.setTitle(device.name)

    async function start() {
      const video = await scrcpyClient.getVideo()
      video.stream.pipeTo(video.decoder.writable)
      screenContainerRef.current!.appendChild(video.decoder.renderer.element)
      setIsLoading(false)
    }
    start()

    return () => scrcpyClient.destroy()
  }, [])

  return (
    <div ref={screenContainerRef} className={Style.container}>
      {isLoading && <LoadingBar />}
    </div>
  )
})
