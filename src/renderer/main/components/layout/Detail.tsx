import { observer } from 'mobx-react-lite'
import Style from './Detail.module.scss'
import { Element } from '@xmldom/xmldom'
import { t } from 'common/util'
import { Copyable } from '../common/Copyable'
import toNum from 'licia/toNum'
import map from 'licia/map'
import filter from 'licia/filter'
import contain from 'licia/contain'
import className from 'licia/className'

interface IProps {
  selected: Element | null
}

export default observer(function Detail(props: IProps) {
  let content: JSX.Element | null = null

  const { selected } = props

  if (selected) {
    const attributes = filter(selected.attributes, (attr) => {
      if (contain(IGNORE_ATTRS, attr.name) || !attr.value) {
        return false
      }

      return true
    })

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
        <div className={Style.attributes}>
          <table>
            <tbody>
              {map(attributes, (attr) => {
                let value = <Copyable>{attr.value}</Copyable>

                if (attr.value === 'true') {
                  value = (
                    <span className={className('icon-check', Style.true)} />
                  )
                } else if (attr.value === 'false') {
                  value = (
                    <span className={className('icon-delete', Style.false)} />
                  )
                }

                return (
                  <tr key={attr.name}>
                    <td className={Style.name}>{attr.name}</td>
                    <td className={Style.value}>{value}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

const IGNORE_ATTRS = ['id', 'x', 'y', 'width', 'height', 'bounds', 'class']
