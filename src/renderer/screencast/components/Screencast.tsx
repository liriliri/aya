import { observer } from 'mobx-react-lite'
import store from '../store'
import { useEffect, useRef, useState } from 'react'
import Style from './Screencast.module.scss'
import endWith from 'licia/endWith'
import { LoadingBar } from '../../components/loading'
import { installPackages } from '../../lib/util'

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

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()

    const files = e.dataTransfer.files
    const apkPaths: string[] = []
    for (let i = 0, len = files.length; i < len; i++) {
      const path = preload.getPathForFile(files[i])
      if (!endWith(path, '.apk')) {
        continue
      }
      apkPaths.push(path)
    }
    await installPackages(device.id, apkPaths)
  }

  return (
    <div
      ref={screenContainerRef}
      className={Style.container}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {isLoading && <LoadingBar />}
    </div>
  )
})
