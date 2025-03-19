import { observer } from 'mobx-react-lite'
import Style from './Screenshot.module.scss'

interface IProps {
  image: string
}

export default observer(function Screenshot(props: IProps) {
  return (
    <div className={Style.container}>
      {props.image && <img className={Style.image} src={props.image} alt="" />}
    </div>
  )
})
