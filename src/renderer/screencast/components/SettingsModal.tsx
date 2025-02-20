import LunaModal from 'luna-modal/react'
import { observer } from 'mobx-react-lite'
import { createPortal } from 'react-dom'
import LunaSetting, {
  LunaSettingButton,
  LunaSettingNumber,
  LunaSettingSelect,
} from 'luna-setting/react'
import { t } from '../../../common/util'
import Style from './SettingsModal.module.scss'
import toStr from 'licia/toStr'
import toNum from 'licia/toNum'
import store from '../store'

interface IProps {
  visible: boolean
  onClose: () => void
}

export default observer(function SettingsModal(props: IProps) {
  function onChange(key, val) {
    if (key === 'videoBitRate') {
      val *= 1000000
    } else if (key === 'maxSize') {
      val = toNum(val)
    }
    store.setSettings(key, val)
  }

  return createPortal(
    <LunaModal
      title={t('settings')}
      width={400}
      visible={props.visible}
      onClose={props.onClose}
    >
      <LunaSetting className={Style.settings} onChange={onChange}>
        <LunaSettingNumber
          keyName="videoBitRate"
          range={true}
          value={Math.floor(store.settings.videoBitRate / 1000000)}
          title={`${t('videoBitRate')} Mbps`}
          min={2}
          max={32}
        />
        <LunaSettingSelect
          keyName="maxSize"
          value={toStr(store.settings.maxSize)}
          title={t('maxSize')}
          options={{
            640: '640',
            720: '720',
            1080: '1080',
            1280: '1280',
            1920: '1920',
            [t('actualSize')]: '0',
          }}
        />
        <LunaSettingButton
          description={t('restart')}
          onClick={() => main.restartScreencast()}
        />
      </LunaSetting>
    </LunaModal>,
    document.body
  )
})
