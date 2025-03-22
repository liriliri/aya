import { observer } from 'mobx-react-lite'
import Style from './Detail.module.scss'

export default observer(function Detail() {
  return <div className={Style.container}></div>
})
