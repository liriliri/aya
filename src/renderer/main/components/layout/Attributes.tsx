import { observer } from 'mobx-react-lite'
import Style from './Attributes.module.scss'

export default observer(function Attributes() {
  return <div className={Style.container}></div>
})
