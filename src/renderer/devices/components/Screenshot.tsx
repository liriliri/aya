import { observer } from 'mobx-react-lite'
import store from '../store'
import Style from './Screenshot.module.scss'
import { JSX, useRef } from 'react'
import LunaImageViewer from 'luna-image-viewer/react'
import { t } from 'common/util'
import { LoadingBar } from 'share/renderer/components/loading'

export default observer(function Screenshot() {
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className={Style.container} ref={containerRef}>
      {body}
    </div>
  )
})
