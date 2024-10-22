import { observer } from 'mobx-react-lite'
import Style from './Overview.module.scss'

export default observer(function Overview() {
  return <div className={Style.container}>Overview</div>
})
