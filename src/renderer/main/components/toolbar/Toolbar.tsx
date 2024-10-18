import Device from './Device'
import Tabs from './Tabs'
import Settings from './Settings'
import Style from './Toolbar.module.scss'

export default function Toolbar() {
  return (
    <div className={Style.container}>
      <Device />
      <Tabs />
      <Settings />
    </div>
  )
}
