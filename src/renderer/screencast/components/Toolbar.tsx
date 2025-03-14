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
import { AndroidKeyCode } from '@yume-chan/scrcpy'

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

  function inputKey(keyCode: AndroidKeyCode) {
    return () => main.inputKey(device.id, keyCode)
  }

  return (
    <>
      <LunaToolbar className={Style.container}>
        <ToolbarIcon
          icon="power"
          title={t('power')}
          onClick={inputKey(AndroidKeyCode.Power)}
        />
        <ToolbarIcon
          icon="volume"
          title={t('volumeUp')}
          onClick={inputKey(AndroidKeyCode.VolumeUp)}
        />
        <ToolbarIcon
          icon="volume-down"
          title={t('volumeDown')}
          onClick={inputKey(AndroidKeyCode.VolumeDown)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="back"
          title={t('back')}
          onClick={inputKey(AndroidKeyCode.AndroidBack)}
        />
        <ToolbarIcon
          icon="circle"
          title={t('home')}
          onClick={inputKey(AndroidKeyCode.AndroidHome)}
        />
        <ToolbarIcon
          icon="square"
          title={t('appSwitch')}
          onClick={() => inputKey(AndroidKeyCode.AndroidAppSwitch)}
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
