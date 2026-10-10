import { observer } from 'mobx-react-lite'
import store from '../store'
import Style from './Screenshot.module.scss'
import { JSX, useRef } from 'react'
import LunaImageViewer from 'luna-image-viewer/react'
import { t } from 'common/util'
import { LoadingBar } from 'share/renderer/components/loading'

export default observer(function Screenshot() {
  const containerRef = useRef<HTMLDivElement>(null)

  const body: JSX.Element =
    store.device && store.screenshot ? (
      <LunaImageViewer image={store.screenshot} />
    ) : (
      <div className={Style.noScreenshot}>
        {store.device && store.device.type !== 'offline' ? (
          <LoadingBar />
        ) : (
          t('deviceNotSelected')
        )}
      </div>
    )

  return (
    <div className={Style.container} ref={containerRef}>
      {body}
    </div>
  )
})
