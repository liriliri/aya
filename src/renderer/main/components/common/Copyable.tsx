import { FC, PropsWithChildren, useRef } from 'react'
import Style from './Copyable.module.scss'
import copy from 'licia/copy'
import { notify } from 'share/renderer/lib/util'
import { t } from '../../../../common/util'
import className from 'licia/className'

interface IProps {
  className?: string
}

export const Copyable: FC<PropsWithChildren<IProps>> = function (props) {
  const valueRef = useRef<HTMLDivElement>(null)

  function copyValue() {
    setTimeout(() => {
      copy(valueRef.current!.innerText)
      notify(t('copied'), { icon: 'info' })
    }, 200)
  }

  return (
    <div
      className={className(props.className, Style.container)}
      ref={valueRef}
      onClick={copyValue}
    >
      {props.children}
    </div>
  )
}
