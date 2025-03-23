import { observer } from 'mobx-react-lite'
import Style from './Detail.module.scss'
import { Element } from '@xmldom/xmldom'
import { t } from '../../../../common/util'
import { Copyable } from '../common/Copyable'
import toNum from 'licia/toNum'

interface IProps {
  selected: Element | null
}

export default observer(function Detail(props: IProps) {
  let content: JSX.Element | null = null

  const { selected } = props

  if (selected) {
    content = (
      <div className={Style.detail}>
        <Copyable className={Style.title}>
          {selected.getAttribute('class') || selected.tagName}
        </Copyable>
        <div className={Style.boxContainer}>
          <div className={Style.boxTop}>{selected.getAttribute('y')}</div>
          <br />
          <div className={Style.boxLeft}>{selected.getAttribute('x')}</div>
          <div className={Style.box}>
            <div className={Style.size}>{selected.getAttribute('width')}</div> ×{' '}
            <div className={Style.size}>{selected.getAttribute('height')}</div>
          </div>
          <div className={Style.boxRight}>
            {toNum(selected.getAttribute('x')) +
              toNum(selected.getAttribute('width'))}
          </div>
          <br />
          <div className={Style.boxBottom}>
            {toNum(selected.getAttribute('y')) +
              toNum(selected.getAttribute('height'))}
          </div>
        </div>
      </div>
    )
  } else {
    content = (
      <div className={Style.unselected}>{t('componentNotSelected')}</div>
    )
  }

  return <div className={Style.container}>{content}</div>
})
