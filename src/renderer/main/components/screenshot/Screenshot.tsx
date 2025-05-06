import { observer } from 'mobx-react-lite'
import Style from './Screenshot.module.scss'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import dataUrl from 'licia/dataUrl'
import toBool from 'licia/toBool'
import fileSize from 'licia/fileSize'
import base64 from 'licia/base64'
import convertBin from 'licia/convertBin'
import download from 'licia/download'
import loadImg from 'licia/loadImg'
import className from 'licia/className'
import LunaImageViewer from 'luna-image-viewer/react'
import ImageViewer from 'luna-image-viewer'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { t } from '../../../../common/util'
import CopyButton from 'share/renderer/components/CopyButton'
import { copyData } from 'share/renderer/lib/util'
import dateFormat from 'licia/dateFormat'

export default observer(function Screenshot() {
  const [image, setImage] = useState<{
    data: string
    url: string
    width: number
    height: number
    size: number
  } | null>(null)
  const imageViewerRef = useRef<ImageViewer>()

  useEffect(() => {
    recapture()
  }, [])

  function save() {
    const blob = convertBin(image!.data, 'Blob')
    download(blob, `screenshot-${dateFormat('yyyymmddHHMM')}.png`, 'image/png')
  }

  function copy() {
    copyData(image!.data, 'image/png')
  }

  async function recapture() {
    if (store.device) {
      const data = await main.screencap(store.device.id)
      const url = dataUrl.stringify(data, 'image/png')
      loadImg(url, (err, img) => {
        setImage({
          data,
          url,
          width: img.width,
          height: img.height,
          size: base64.decode(data).length,
        })
      })
    }
  }

  const hasImage = toBool(image)

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="refresh"
          title={t('recapture')}
          onClick={recapture}
          disabled={!store.device}
        />
        <ToolbarIcon
          icon="save"
          title={t('save')}
          onClick={save}
          disabled={!hasImage}
        />
        <LunaToolbarButton onClick={() => {}} disabled={!hasImage}>
          <CopyButton className="toolbar-icon" onClick={copy} />
        </LunaToolbarButton>
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="rotate-left"
          title={t('rotateLeft')}
          onClick={() => imageViewerRef.current?.rotate(-90)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="rotate-right"
          title={t('rotateRight')}
          onClick={() => imageViewerRef.current?.rotate(90)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="zoom-in"
          title={t('zoomIn')}
          onClick={() => imageViewerRef.current?.zoom(0.1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          onClick={() => imageViewerRef.current?.zoom(-0.1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="original"
          title={t('actualSize')}
          onClick={() => imageViewerRef.current?.zoomTo(1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="reset"
          title={t('reset')}
          onClick={() => imageViewerRef.current?.reset()}
          disabled={!hasImage}
        />
        <LunaToolbarSpace />
        <LunaToolbarText
          text={
            hasImage
              ? `${image!.width}x${image!.height} PNG ${fileSize(image!.size)}B`
              : ''
          }
        />
      </LunaToolbar>
      {image ? (
        <LunaImageViewer
          className="panel-body"
          image={image.url}
          onCreate={(imageViewer) => (imageViewerRef.current = imageViewer)}
        />
      ) : (
        <div className="panel-body" />
      )}
    </div>
  )
})
