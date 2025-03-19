import { observer } from 'mobx-react-lite'
import Style from './Tree.module.scss'

export default observer(function Tree() {
  return <div className={Style.container}></div>
})
