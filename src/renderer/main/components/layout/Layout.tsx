import LunaToolbar, { LunaToolbarButton } from 'luna-toolbar/react'
import { observer } from 'mobx-react-lite'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from '../../../../common/util'
import Style from './Layout.module.scss'
import Tree from './Tree'
import Attributes from './Attributes'
import Screenshot from './Screenshot'
import className from 'licia/className'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import copy from 'licia/copy'
import dataUrl from 'licia/dataUrl'
import each from 'licia/each'
import CopyButton from 'share/renderer/components/CopyButton'
import { xmlToDom } from '../../lib/util'
import { Document, Element } from '@xmldom/xmldom'

export default observer(function Layout() {
  const [image, setImage] = useState('')
  const windowHierarchy = useRef('')
  const [hierarchy, setHierarchy] = useState<any>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!store.device) {
      return
    }

    const data = await main.screencap(store.device.id)
    setImage(dataUrl.stringify(data, 'image/png'))
    windowHierarchy.current = await main.dumpWindowHierarchy(store.device.id)
    const doc = xmlToDom(windowHierarchy.current)
    transfromHierarchy(doc)
    setHierarchy(doc)
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={refresh}
          disabled={!store.device}
        />
        <LunaToolbarButton
          onClick={() => {}}
          disabled={!windowHierarchy.current}
        >
          <CopyButton
            className="toolbar-icon"
            onClick={() => copy(windowHierarchy.current)}
          />
        </LunaToolbarButton>
      </LunaToolbar>
      <div className={className('panel-body', Style.container)}>
        <Tree hierarchy={hierarchy} />
        <Screenshot image={image} />
        <Attributes />
      </div>
    </div>
  )
})

function changeElType(doc: Document, oldEl: Element, newType: string): Element {
  const newEl = doc.createElement(newType)

  for (const attr of oldEl.attributes) {
    newEl.setAttribute(attr.name, attr.value)
  }

  while (oldEl.firstChild) {
    newEl.appendChild(oldEl.firstChild)
  }

  if (oldEl.parentNode) {
    oldEl.parentNode.replaceChild(newEl, oldEl)
  }

  return newEl
}

function transfromHierarchy(hierarchy: Document) {
  const transformRecursively = (el: Element) => {
    const className = el.getAttribute('class')
    if (className) {
      el = changeElType(hierarchy, el, className.split('.').pop()!)
    }
    const text = el.getAttribute('text')
    if (text) {
      el.removeAttribute('text')
      el.appendChild(hierarchy.createTextNode(text))
    } else {
      each(el.childNodes, (child) => transformRecursively(child as Element))
    }
  }

  if (hierarchy.documentElement) {
    transformRecursively(hierarchy.documentElement)
  }
}
