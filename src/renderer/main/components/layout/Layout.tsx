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
import Detail from './Detail'
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
import download from 'licia/download'
import toBool from 'licia/toBool'
import ImageViewer from 'luna-image-viewer'
import DomViewer from 'luna-dom-viewer'
import isEmpty from 'licia/isEmpty'

export default observer(function Layout() {
  const [image, setImage] = useState<IImage>({
    url: '',
    width: 0,
    height: 0,
  })
  const imageViewerRef = useRef<ImageViewer>()
  const domViewerRef = useRef<DomViewer>()
  const windowHierarchy = useRef('')
  const [hierarchy, setHierarchy] = useState<any>(null)
  const [selected, setSelected] = useState<Element | null>(null)

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
    setSelected(null)
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

  function save() {
    download(windowHierarchy.current, 'window_hierarchy.xml', 'text/xml')
  }

  function select(el: Element) {
    if (domViewerRef.current) {
      domViewerRef.current.select(el as any)
    }
    setSelected(el)
  }

  const hasImage = toBool(image.url)

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={refresh}
          disabled={!store.device}
        />
        <ToolbarIcon
          icon="save"
          title={t('save')}
          onClick={save}
          disabled={!windowHierarchy.current}
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
        <ToolbarIcon
          icon="expand"
          title={t('expandAll')}
          onClick={() => domViewerRef.current?.expand(true)}
          disabled={!windowHierarchy.current}
        />
        <ToolbarIcon
          icon="collapse"
          title={t('collapseAll')}
          onClick={() => domViewerRef.current?.collapse(true)}
          disabled={!windowHierarchy.current}
        />
        <LunaToolbarCheckbox
          keyName="attribute"
          label={t('showAttr')}
          value={store.layout.attribute}
          onChange={(value) => (store.layout.attribute = value)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="rotate-left"
          title={t('rotateLeft')}
          onClick={() => imageViewerRef.current?.rotate(-90)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="rotate-right"
          title={t('rotateRight')}
          onClick={() => imageViewerRef.current?.rotate(90)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="zoom-in"
          title={t('zoomIn')}
          onClick={() => imageViewerRef.current?.zoom(0.1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          onClick={() => imageViewerRef.current?.zoom(-0.1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="original"
          title={t('actualSize')}
          onClick={() => imageViewerRef.current?.zoomTo(1)}
          disabled={!hasImage}
        />
        <ToolbarIcon
          icon="reset"
          title={t('reset')}
          onClick={() => imageViewerRef.current?.reset()}
          disabled={!hasImage}
        />
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
        <Tree
          hierarchy={hierarchy}
          onSelect={select}
          selected={selected}
          onDomViewerCreate={(domViewer) => {
            domViewer.expand()
            domViewerRef.current = domViewer
          }}
        />
        <Screenshot
          image={image}
          hierarchy={hierarchy}
          selected={selected}
          onImageViewerCreate={(imageViewer) =>
            (imageViewerRef.current = imageViewer)
          }
          onSelect={select}
        />
        <Detail selected={selected} />
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
    if (text && isEmpty(el.childNodes)) {
      el.appendChild(hierarchy.createTextNode(text))
    } else {
      each(el.childNodes, (child) => transformRecursively(child as Element))
    }
  }

  if (hierarchy.documentElement) {
    transformRecursively(hierarchy.documentElement)
  }
}
