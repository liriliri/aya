import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from '../../../common/util'
import Style from './Toolbar.module.scss'
import store from '../store'
import download from 'licia/download'
import fullscreen from 'licia/fullscreen'
import SettingsModal from './SettingsModal'
import { useState } from 'react'

export default observer(function Toolbar() {
  const [settingsModalVisiable, setSettingsModalVisiable] = useState(false)

  const { device, scrcpyClient } = store

  async function captureScreenshot() {
    const video = await scrcpyClient.getVideo()
    const blob = await video.decoder.snapshot()
    download(blob, 'screenshot.png', 'image/png')
  }

  async function toggleFullscreen() {
    const video = await scrcpyClient.getVideo()

    fullscreen.toggle(video.decoder.renderer.element.parentElement)
  }

  return (
    <>
      <LunaToolbar className={Style.container}>
        <ToolbarIcon
          icon="power"
          title={t('power')}
          onClick={() => main.inputKey(device.id, 26)}
        />
        <ToolbarIcon
          icon="volume"
          title={t('volumeUp')}
          onClick={() => main.inputKey(device.id, 24)}
        />
        <ToolbarIcon
          icon="volume-down"
          title={t('volumeDown')}
          onClick={() => main.inputKey(device.id, 25)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="back"
          title={t('back')}
          onClick={() => main.inputKey(device.id, 4)}
        />
        <ToolbarIcon
          icon="circle"
          title={t('home')}
          onClick={() => main.inputKey(device.id, 3)}
        />
        <ToolbarIcon
          icon="square"
          title={t('appSwitch')}
          onClick={() => main.inputKey(device.id, 187)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="screen-on"
          title={t('screenOn')}
          onClick={() => scrcpyClient.turnOnScreen()}
        />
        <ToolbarIcon
          icon="screen-off"
          title={t('screenOff')}
          onClick={() => scrcpyClient.turnOffScreen()}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="camera"
          title={t('screenshot')}
          onClick={captureScreenshot}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="pin"
          title={t('alwaysOnTop')}
          state={store.alwaysOnTop ? 'hover' : ''}
          onClick={() => {
            store.setAlwaysOnTop(!store.alwaysOnTop)
          }}
        />
        <ToolbarIcon
          icon="fullscreen"
          title={t('fullscreen')}
          onClick={toggleFullscreen}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="setting"
          title={t('settings')}
          onClick={() => setSettingsModalVisiable(true)}
        />
      </LunaToolbar>
      <SettingsModal
        visible={settingsModalVisiable}
        onClose={() => setSettingsModalVisiable(false)}
      />
    </>
  )
})
