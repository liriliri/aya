import { observer } from 'mobx-react-lite'
import Style from './Screenshot.module.scss'
import { useEffect, useRef } from 'react'
import { Document, Element } from '@xmldom/xmldom'
import store from '../../store'
import each from 'licia/each'
import toNum from 'licia/toNum'
import { colorPrimary } from '../../../../common/theme'

interface IProps {
  image: IImage
  hierarchy?: Document
  selected: Element | null
  onSelect?: (el: Element) => void
}

export interface IImage {
  url: string
  width: number
  height: number
}

export default observer(function Screenshot(props: IProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const image = useRef(new Image())

  useEffect(() => {
    image.current.src = props.image.url
    image.current.onload = () => {
      draw()
    }
  }, [props.image])

  useEffect(() => {
    draw()
  }, [props.hierarchy, props.selected])

  function draw() {
    if (!canvasRef.current || !props.image.url) {
      return
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, props.image.width, props.image.height)
    ctx.drawImage(image.current, 0, 0)

    if (store.layout.border && props.hierarchy) {
      drawBorder(ctx, props.hierarchy)
    }

    if (props.selected) {
      drawSelected(ctx, props.selected)
    }
  }
  draw()

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!props.hierarchy) {
      return
    }

    const ratio = props.image.width / canvasRef.current!.clientWidth
    const x = Math.round(e.nativeEvent.offsetX * ratio)
    const y = Math.round(e.nativeEvent.offsetY * ratio)
    const el = findEl(props.hierarchy, x, y)
    if (el) {
      props.onSelect?.(el)
    }
  }

  return (
    <div className={Style.container}>
      <canvas
        onClick={onClick}
        className={Style.canvas}
        width={props.image.width}
        height={props.image.height}
        ref={canvasRef}
      />
    </div>
  )
})

function findEl(hierarchy: Document, pointerX: number, pointerY: number) {
  let result = hierarchy.documentElement
  let resultWidth = 1000000
  let resultHeight = 1000000

  const findRecursively = (el: Element) => {
    const x = el.getAttribute('x')
    const y = el.getAttribute('y')
    const width = el.getAttribute('width')
    const height = el.getAttribute('height')
    if (x && y && width && height) {
      const x1 = toNum(x)
      const y1 = toNum(y)
      const w = toNum(width)
      const h = toNum(height)
      const x2 = x1 + w
      const y2 = y1 + h
      if (
        x1 <= pointerX &&
        pointerX <= x2 &&
        y1 <= pointerY &&
        pointerY <= y2
      ) {
        if (w * h < resultWidth * resultHeight) {
          result = el
          resultWidth = w
          resultHeight = h
        }
      }
    }

    each(el.childNodes, (child) => {
      if (child.nodeType !== 1) {
        return
      }
      findRecursively(child as Element)
    })
  }

  if (hierarchy.documentElement) {
    findRecursively(hierarchy.documentElement)
  }

  return result
}

function drawBorder(ctx: CanvasRenderingContext2D, hierarchy: Document) {
  ctx.strokeStyle = colorPrimary
  ctx.lineWidth = 2

  const drawRecursively = (el: Element) => {
    const x = el.getAttribute('x')
    const y = el.getAttribute('y')
    const width = el.getAttribute('width')
    const height = el.getAttribute('height')
    if (x && y && width && height) {
      ctx.strokeRect(toNum(x), toNum(y), toNum(width), toNum(height))
    }

    each(el.childNodes, (child) => {
      if (child.nodeType !== 1) {
        return
      }
      drawRecursively(child as Element)
    })
  }

  if (hierarchy.documentElement) {
    drawRecursively(hierarchy.documentElement)
  }
}

function drawSelected(ctx: CanvasRenderingContext2D, selected: Element) {
  ctx.fillStyle = 'rgba(111, 168, 220, .66)'

  const x = selected.getAttribute('x')
  const y = selected.getAttribute('y')
  const width = selected.getAttribute('width')
  const height = selected.getAttribute('height')
  if (x && y && width && height) {
    ctx.fillRect(toNum(x), toNum(y), toNum(width), toNum(height))
  }
}
