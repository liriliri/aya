import { useState } from 'react'
import store from '../../store'
import { notify, t } from '../../../lib/util'
import className from 'licia/className'
import defaultIcon from '../../../assets/img/default-icon.png'
import Style from './Application.module.scss'

interface IAppProps {
  packageName: string
  icon: string
  label: string
}

export default function App(props: IAppProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  async function start() {
    setIsAnimating(true)
    try {
      await main.startPackage(store.device!.id, props.packageName)
      // eslint-disable-next-line
    } catch (e) {
      notify(t('startPackageErr'), { icon: 'error' })
    }
  }

  return (
    <div
      key={props.packageName}
      title={props.packageName}
      className={className({
        [Style.openEffect]: isAnimating,
        [Style.application]: true,
      })}
      onAnimationEnd={() => setIsAnimating(false)}
      onClick={start}
    >
      <div className={Style.applicationIcon}>
        <img src={props.icon || defaultIcon} draggable="false" />
      </div>
      <div className={Style.applicationLabel}>{props.label}</div>
    </div>
  )
}
