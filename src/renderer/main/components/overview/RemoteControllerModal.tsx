import LunaModal from 'luna-modal/react'
import { observer } from 'mobx-react-lite'
import { createPortal } from 'react-dom'
import { t } from 'common/util'
import { IModalProps } from 'share/common/types'
import Style from './RemoteControllerModal.module.scss'
import className from 'licia/className'
import store from '../../store'
import { AndroidKeyCode } from '@yume-chan/scrcpy'

export default observer(function RemoteControllerModal(props: IModalProps) {
  function inputKey(keyCode: AndroidKeyCode) {
    return () => {
      if (!store.device) {
        return
      }
      main.inputKey(store.device.id, keyCode)
    }
  }

  return createPortal(
    <LunaModal
      title={t('remoteController')}
      width={400}
      visible={props.visible}
      onClose={props.onClose}
    >
      <div className={Style.remoteController}>
        <div className={Style.top}>
          <div className={Style.button}>
            <span
              className="icon-power"
              title={t('power')}
              onClick={inputKey(AndroidKeyCode.Power)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('volumeDown')}
              className="icon-volume-down"
              onClick={inputKey(AndroidKeyCode.VolumeDown)}
            />
          </div>
          <div className={Style.button}>
            <span
              className="icon-volume"
              title={t('volumeUp')}
              onClick={inputKey(AndroidKeyCode.VolumeUp)}
            />
          </div>
        </div>
        <div className={Style.directionPad}>
          <div
            className={Style.ok}
            onClick={inputKey(AndroidKeyCode.AndroidDPadCenter)}
          >
            OK
          </div>
          <div
            className={Style.up}
            onClick={inputKey(AndroidKeyCode.ArrowUp)}
          />
          <div
            className={Style.right}
            onClick={inputKey(AndroidKeyCode.ArrowRight)}
          />
          <div
            className={Style.down}
            onClick={inputKey(AndroidKeyCode.ArrowDown)}
          />
          <div
            className={Style.left}
            onClick={inputKey(AndroidKeyCode.ArrowLeft)}
          />
        </div>
        <div className={Style.bottom}>
          <div className={Style.button}>
            <span
              title={t('home')}
              className="icon-circle"
              onClick={inputKey(AndroidKeyCode.AndroidHome)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('back')}
              className={className('icon-back', Style.back)}
              onClick={inputKey(AndroidKeyCode.AndroidBack)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('appSwitch')}
              className="icon-square"
              onClick={inputKey(AndroidKeyCode.AndroidAppSwitch)}
            />
          </div>
        </div>
      </div>
    </LunaModal>,
    document.body
  )
})
