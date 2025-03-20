import { observer } from 'mobx-react-lite'
import Style from './Tree.module.scss'
import LunaDomViewer from 'luna-dom-viewer/react'
import store from '../../store'
import contain from 'licia/contain'
import { useEffect, useState } from 'react'
import uuid from 'licia/uuid'

interface IProps {
  hierarchy: Document | null
}

export default observer(function Tree(props: IProps) {
  const [key, setKey] = useState(uuid())

  useEffect(() => {
    setKey(uuid())
  }, [props.hierarchy])

  return (
    <div className={Style.container} style={{ width: 400 }}>
      {props.hierarchy && (
        <LunaDomViewer
          key={key}
          theme={store.theme}
          node={props.hierarchy.documentElement}
          ignoreAttr={(el, name, value) => {
            return contain(IGNORE_ATTRS, name) || value === ''
          }}
          observe={false}
          onCreate={(domViewer) => {
            domViewer.expand()
          }}
        />
      )}
    </div>
  )
})

const IGNORE_ATTRS = [
  'rotation',
  'index',
  'text',
  'class',
  'package',
  'checkable',
  'checked',
  'clickable',
  'enabled',
  'focusable',
  'focused',
  'scrollable',
  'long-clickable',
  'password',
  'selected',
  'bounds',
]
