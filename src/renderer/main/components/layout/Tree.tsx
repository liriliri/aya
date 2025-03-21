import { observer } from 'mobx-react-lite'
import Style from './Tree.module.scss'
import LunaDomViewer from 'luna-dom-viewer/react'
import DomViewer from 'luna-dom-viewer'
import store from '../../store'
import contain from 'licia/contain'
import { useCallback, useEffect, useRef, useState } from 'react'
import uuid from 'licia/uuid'
import { Document, Element } from '@xmldom/xmldom'

interface IProps {
  hierarchy?: Document
  selected: Element | null
  onSelect?: (el: Element) => void
}

export default observer(function Tree(props: IProps) {
  const treeRef = useRef<HTMLDivElement>(null)
  const domViewerRef = useRef<DomViewer>()
  const [key, setKey] = useState(uuid())
  const [resizerStyle, setResizerStyle] = useState<any>({
    width: '10px',
  })

  useEffect(() => {
    setKey(uuid())
  }, [props.hierarchy])

  useEffect(() => {
    if (props.selected && domViewerRef.current) {
      domViewerRef.current.select(props.selected as any)
    }
  }, [props.selected])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    const width = treeRef.current!.offsetWidth
    setResizerStyle({
      position: 'fixed',
      width: '100%',
      height: '100%',
    })

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX
      treeRef.current!.style.width = `${width - deltaX}px`
    }

    const onMouseUp = (e: MouseEvent) => {
      setResizerStyle({
        width: '10px',
      })
      const deltaX = startX - e.clientX
      store.layout.set('treeWidth', width - deltaX)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div
      className={Style.container}
      style={{ width: store.layout.treeWidth }}
      ref={treeRef}
    >
      <div
        className={Style.resizer}
        style={resizerStyle}
        onMouseDown={onMouseDown}
      />
      <div className={Style.tree} key={key}>
        {props.hierarchy && (
          <LunaDomViewer
            theme={store.theme}
            node={props.hierarchy.documentElement as any}
            ignoreAttr={(el, name, value) => {
              return contain(IGNORE_ATTRS, name) || value === ''
            }}
            observe={false}
            onSelect={(node) => {
              if (node.nodeType === 1) {
                props.onSelect?.(node as any)
              }
            }}
            onCreate={(domViewer) => {
              domViewer.expand()
              domViewerRef.current = domViewer
            }}
          />
        )}
      </div>
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
  'x',
  'y',
  'width',
  'height',
]
