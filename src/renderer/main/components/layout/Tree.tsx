import { observer } from 'mobx-react-lite'
import Style from './Tree.module.scss'
import LunaDomViewer from 'luna-dom-viewer/react'
import store from '../../store'
import contain from 'licia/contain'

interface IProps {
  hierarchy: Document | null
}

export default observer(function Tree(props: IProps) {
  return (
    <div className={Style.container} style={{ width: 250 }}>
      {props.hierarchy && (
        <LunaDomViewer
          theme={store.theme}
          node={props.hierarchy.documentElement}
          ignoreAttr={(el, name) => contain(IGNORE_ATTRS, name)}
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
  'resource-id',
  'class',
  'package',
  'content-desc',
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
