import { observer } from 'mobx-react-lite'
import Style from './Tree.module.scss'
import LunaDomViewer from 'luna-dom-viewer/react'
import DomViewer from 'luna-dom-viewer'
import store from '../../store'
import contain from 'licia/contain'
import { JSX, useEffect, useRef, useState } from 'react'
import uuid from 'licia/uuid'
import xpath from 'licia/xpath'
import copy from 'licia/copy'
import { Document, Element } from '@xmldom/xmldom'
import { t } from 'common/util'
import CopyButton from 'share/renderer/components/CopyButton'
import { PannelLoading } from '../common/loading'

interface IProps {
  hierarchy?: Document
  selected: Element | null
  isLoading: boolean
  onSelect?: (el: Element) => void
  onDomViewerCreate?: (domViewer: DomViewer) => void
}

export default observer(function Tree(props: IProps) {
  const treeRef = useRef<HTMLDivElement>(null)
  const [key, setKey] = useState(uuid())

  useEffect(() => {
    setKey(uuid())
  }, [props.hierarchy])

  const path = props.selected
    ? xpath(props.selected as any, true).replace(/@id=/g, '@resource-id=')
    : ''

  let content: JSX.Element | null = null
  if (props.isLoading) {
    content = <PannelLoading />
  } else if (props.hierarchy) {
    content = (
      <LunaDomViewer
        theme={store.theme}
        node={props.hierarchy.documentElement as any}
        ignoreAttr={(el, name, value) => {
          let ignore = contain(IGNORE_ATTRS, name) || value === ''
          if (!ignore && !store.layout.attribute) {
            ignore = contain(IGNORE_ATTRS_ALL, name)
          }
          return ignore
        }}
        observe={false}
        lowerCaseTagName={false}
        onSelect={(node) => {
          if (node.nodeType === 1) {
            props.onSelect?.(node as any)
          } else if (node.nodeType === 3) {
            props.onSelect?.(node.parentNode as any)
          }
        }}
        onCreate={props.onDomViewerCreate}
      />
    )
  }

  return (
    <div className={Style.container} ref={treeRef}>
      <div className={Style.tree} key={key}>
        {content}
      </div>
      <div className={Style.xpathContainer}>
        <div className={Style.xpath}>{path || t('componentNotSelected')}</div>
        <CopyButton
          onClick={() => {
            if (path) {
              copy(path)
            }
          }}
        />
      </div>
    </div>
  )
})

const IGNORE_ATTRS_ALL = [
  'rotation',
  'index',
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

const IGNORE_ATTRS = ['id', 'text', 'class', 'x', 'y', 'width', 'height']
