import { observer } from 'mobx-react-lite'
import Style from './Screenshot.module.scss'
import LunaToolbar from 'luna-toolbar/react'
import dataUrl from 'licia/dataUrl'
import toBool from 'licia/toBool'
import LunaImageViewer from 'luna-image-viewer/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { useEffect, useState } from 'react'
import store from '../../store'

export default observer(function Screenshot() {
  const [image, setImage] = useState<string>('')

  useEffect(() => {
    recapture()
  }, [])

  async function recapture() {
    if (store.device) {
      const data = await main.screencap(store.device.id)
      setImage(dataUrl.stringify(data, 'image/png'))
    }
  }

  return (
    <div className={Style.container}>
      <LunaToolbar className={Style.toolbar}>
        <ToolbarIcon icon="refresh" onClick={recapture} disabled={!toBool(store.device)}/>
      </LunaToolbar>
      {image && <LunaImageViewer
        className={Style.imageViewer}
        image={image}
      ></LunaImageViewer>}
    </div>
  )
})
