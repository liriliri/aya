import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from 'common/util'
import Style from './Toolbar.module.scss'
import store from '../store'
import download from 'licia/download'
import fullscreen from 'licia/fullscreen'
import SettingsModal from './SettingsModal'
import { useState } from 'react'
import { AndroidKeyCode } from '@yume-chan/scrcpy'
import LunaModal from 'luna-modal'
import dateFormat from 'licia/dateFormat'

export default observer(function Toolbar() {
  const [settingsModalVisiable, setSettingsModalVisiable] = useState(false)

  const { device, scrcpyClient } = store

  async function captureScreenshot() {
    const video = await scrcpyClient.getVideo()
    const blob = await video.decoder.snapshot()
    download(blob, `screenshot-${dateFormat('yyyymmddHHMM')}.png`, 'image/png')
  }

  async function toggleFullscreen() {
    const video = await scrcpyClient.getVideo()

    fullscreen.toggle(video.decoder.renderer.element.parentElement)
  }

  function inputKey(keyCode: AndroidKeyCode) {
    return () => main.inputKey(device.id, keyCode)
  }

  async function injectText() {
    const text = await LunaModal.prompt(t('inputText'), '')
    if (text) {
      scrcpyClient.setClipboard(text, true)
    }
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
          onClick={inputKey(AndroidKeyCode.AndroidAppSwitch)}
        />
        <ToolbarIcon icon="text" title={t('inputText')} onClick={injectText} />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon={store.screenOff ? 'screen-on' : 'screen-off'}
          title={t(store.screenOff ? 'screenOn' : 'screenOff')}
          onClick={() => {
            if (store.screenOff) {
              store.turnOnScreen()
            } else {
              store.turnOffScreen()
            }
          }}
        />
        <ToolbarIcon
          icon="camera"
          title={t('screenshot')}
          onClick={captureScreenshot}
        />
        <ToolbarIcon
          icon="video-recorder"
          title={t('screenRecording')}
          state={store.recording ? 'hover' : ''}
          onClick={() => {
            if (store.recording) {
              store.stopRecording()
            } else {
              store.startRecording()
            }
          }}
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
