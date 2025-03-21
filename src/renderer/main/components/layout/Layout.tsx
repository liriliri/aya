import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarCheckbox,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import { observer } from 'mobx-react-lite'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from '../../../../common/util'
import Style from './Layout.module.scss'
import Tree from './Tree'
import Attributes from './Attributes'
import Screenshot, { IImage } from './Screenshot'
import className from 'licia/className'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import copy from 'licia/copy'
import dataUrl from 'licia/dataUrl'
import each from 'licia/each'
import toNum from 'licia/toNum'
import toStr from 'licia/toStr'
import CopyButton from 'share/renderer/components/CopyButton'
import { xmlToDom } from '../../lib/util'
import { Document, Element } from '@xmldom/xmldom'
import loadImg from 'licia/loadImg'

export default observer(function Layout() {
  const [image, setImage] = useState<IImage>({
    url: '',
    width: 0,
    height: 0,
  })
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
    const url = dataUrl.stringify(data, 'image/png')
    setHierarchy(null)
    loadImg(url, (err, img) => {
      setImage({
        url,
        width: img.width,
        height: img.height,
      })
    })
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
        <LunaToolbarSeparator />
        <LunaToolbarCheckbox
          keyName="border"
          label={t('showBorder')}
          value={store.layout.border}
          onChange={(value) => (store.layout.border = value)}
        />
        <LunaToolbarSpace />
        <LunaToolbarText
          text={image.url ? `${image.width}x${image.height}` : ''}
        />
      </LunaToolbar>
      <div className={className('panel-body', Style.container)}>
        <Tree hierarchy={hierarchy} />
        <Screenshot image={image} hierarchy={hierarchy} />
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

    const bounds = el.getAttribute('bounds')
    if (bounds) {
      const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
      if (match) {
        const left = toNum(match[1])
        const top = toNum(match[2])
        const right = toNum(match[3])
        const bottom = toNum(match[4])
        el.setAttribute('x', toStr(left))
        el.setAttribute('y', toStr(top))
        el.setAttribute('width', toStr(right - left))
        el.setAttribute('height', toStr(bottom - top))
      }
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
