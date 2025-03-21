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
}

export interface IImage {
  url: string
  width: number
  height: number
}

export default observer(function Screenshot(props: IProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    draw()
  }, [props.image, props.hierarchy])

  function draw() {
    if (!canvasRef.current || !props.image.url) {
      return
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) {
      return
    }

    const img = new Image()
    img.src = props.image.url
    ctx.drawImage(img, 0, 0)

    if (store.layout.border && props.hierarchy) {
      drawBorder(ctx, props.hierarchy)
    }
  }
  draw()

  return (
    <div className={Style.container}>
      <canvas
        className={Style.canvas}
        width={props.image.width}
        height={props.image.height}
        ref={canvasRef}
      />
    </div>
  )
})

function drawBorder(ctx: CanvasRenderingContext2D, hierarchy: Document) {
  ctx.strokeStyle = colorPrimary
  ctx.lineWidth = 2

  const transformRecursively = (el: Element) => {
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
      transformRecursively(child as Element)
    })
  }

  if (hierarchy.documentElement) {
    transformRecursively(hierarchy.documentElement)
  }
}
