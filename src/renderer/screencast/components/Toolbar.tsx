import { observer } from 'mobx-react-lite'
import LunaToolbar, { LunaToolbarSeparator } from 'luna-toolbar/react'
import ToolbarIcon from '../../components/ToolbarIcon'
import { t } from '../../../common/util'
import Style from './Toolbar.module.scss'
import store from '../store'
import download from 'licia/download'

export default observer(function Toolbar() {
  const { device, scrcpyClient } = store

  async function captureScreenshot() {
    const blob = await scrcpyClient.captureScreenshot()
    download(blob, 'screenshot.png', 'image/png')
  }

  return (
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
        icon="camera"
        title={t('screenshot')}
        onClick={captureScreenshot}
      />
    </LunaToolbar>
  )
})
