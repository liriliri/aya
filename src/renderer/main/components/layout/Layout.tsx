import LunaToolbar, { LunaToolbarButton } from 'luna-toolbar/react'
import { observer } from 'mobx-react-lite'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from '../../../../common/util'
import Style from './Layout.module.scss'
import Tree from './Tree'
import Attributes from './Attributes'
import Screenshot from './Screenshot'
import className from 'licia/className'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import copy from 'licia/copy'
import dataUrl from 'licia/dataUrl'
import CopyButton from 'share/renderer/components/CopyButton'
import { xmlToDom } from '../../lib/util'

export default observer(function Layout() {
  const [image, setImage] = useState('')
  const windowHierarchy = useRef('')
  const [hierarchy, setHierarchy] = useState<any>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!store.device) {
      return
    }

    const data = await main.screencap(store.device.id)
    setImage(dataUrl.stringify(data, 'image/png'))
    windowHierarchy.current = await main.dumpWindowHierarchy(store.device.id)
    console.log(xmlToDom(windowHierarchy.current))
    setHierarchy(xmlToDom(windowHierarchy.current))
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={refresh}
          disabled={!store.device}
        />
        <LunaToolbarButton
          onClick={() => {}}
          disabled={!windowHierarchy.current}
        >
          <CopyButton
            className="toolbar-icon"
            onClick={() => copy(windowHierarchy.current)}
          />
        </LunaToolbarButton>
      </LunaToolbar>
      <div className={className('panel-body', Style.container)}>
        <Tree hierarchy={hierarchy} />
        <Screenshot image={image} />
        <Attributes />
      </div>
    </div>
  )
})
