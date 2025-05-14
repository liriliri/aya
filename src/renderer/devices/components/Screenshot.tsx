import { observer } from 'mobx-react-lite'
import store from '../store'
import Style from './Screenshot.module.scss'
import { useCallback, useRef, useState } from 'react'
import LunaImageViewer from 'luna-image-viewer/react'
import { t } from '../../../common/util'
import { LoadingBar } from 'share/renderer/components/loading'

export default observer(function Screenshot() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [resizerStyle, setResizerStyle] = useState<any>({
    height: '10px',
  })

  let body: JSX.Element | null = null

  if (store.device && store.screenshot) {
    body = <LunaImageViewer image={store.screenshot} />
  } else {
    body = (
      <div className={Style.noScreenshot}>
        {store.device && store.device.type !== 'offline' ? (
          <LoadingBar />
        ) : (
          t('deviceNotSelected')
        )}
      </div>
    )
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const startY = e.clientY
    const height = containerRef.current!.offsetHeight
    setResizerStyle({
      position: 'fixed',
      width: '100%',
      height: '100%',
    })

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      containerRef.current!.style.height = `${height + deltaY}px`
    }

    const onMouseUp = (e: MouseEvent) => {
      setResizerStyle({
        height: '10px',
      })
      const deltaY = startY - e.clientY
      store.setScreenshotHeight(height + deltaY)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div
      className={Style.container}
      style={{
        height: store.screenshotHeight,
      }}
      ref={containerRef}
    >
      <div
        className={Style.resizer}
        style={resizerStyle}
        onMouseDown={onMouseDown}
      ></div>
      {body}
    </div>
  )
})
