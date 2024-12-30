import { PropsWithChildren, useState } from 'react'
import className from 'licia/className'
import Style from './setting.module.scss'
import types from 'licia/types'
import map from 'licia/map'
import toNum from 'licia/toNum'
import toStr from 'licia/toStr'

interface IRowProps {
  className?: string
}

export function Row(props: PropsWithChildren<IRowProps>) {
  return (
    <div className={className(Style.row, props.className)}>
      {props.children}
    </div>
  )
}

interface ISelectProps {
  title?: string
  disabled?: boolean
  options: types.PlainObj<string>
  value: string
  onChange: (val: string) => void
}

export function Select(props: ISelectProps) {
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (props.onChange) {
      props.onChange(e.target.value)
    }
  }

  const options = map(props.options, (val, key) => {
    return (
      <option key={val} value={val}>
        {key}
      </option>
    )
  })

  return (
    <div
      className={className(Style.item, Style.itemSelect, {
        [Style.disabled]: props.disabled,
      })}
    >
      {props.title && <div className={Style.title}>{props.title}</div>}
      <div className={Style.control}>
        <div className={Style.select}>
          <select onChange={onChange} value={props.value}>
            {options}
          </select>
        </div>
      </div>
    </div>
  )
}

interface INumberProps {
  title: string
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  range?: boolean
}

export function Number(props: INumberProps) {
  const [value, setValue] = useState(toStr(props.value))
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) {
      setValue(e.target.value)
      props.onChange(toNum(e.target.value))
    }
  }

  const max = props.max || Infinity
  const min = props.min || 0
  const step = props.step || 1
  let input = (
    <input
      type={props.range ? 'range' : 'number'}
      value={value !== '' ? props.value : value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
    />
  )

  if (props.range) {
    input = (
      <div className={Style.control}>
        <span className={Style.rangeValue}>{`${props.value}/${max}`}</span>
        <div className={Style.rangeContainer}>
          <div className={Style.rangeTrack}>
            <div className={Style.rangeTrackBar}>
              <div
                className={Style.rangeTrackProgress}
                style={{ width: `${progress(props.value, min, max)}%` }}
              ></div>
            </div>
          </div>
          {input}
        </div>
      </div>
    )
  } else {
    input = <div className={Style.control}>{input}</div>
  }

  return (
    <div className={className(Style.item, Style.itemNumber)}>
      <div className={Style.title}>{props.title}</div>
      {input}
    </div>
  )
}

const progress = (val: number, min: number, max: number) => {
  return (((val - min) / (max - min)) * 100).toFixed(2)
}

interface IInputProps {
  title: string
  value: string
  onChange: (val: string) => void
}

export function Input(props: IInputProps) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) {
      props.onChange(e.target.value)
    }
  }

  return (
    <div className={className(Style.item, Style.itemInput)}>
      <div className={Style.title}>{props.title}</div>
      <div className={Style.control}>
        <input value={props.value} type="text" onChange={onChange}></input>
      </div>
    </div>
  )
}

interface ITextareaProps {
  title?: string
  rows?: number
  placeholder?: string
  value: string
  onChange: (val: string) => void
}

export function Textarea(props: ITextareaProps) {
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (props.onChange) {
      props.onChange(e.target.value)
    }
  }

  return (
    <div className={className(Style.item, Style.itemTextarea)}>
      {props.title ? <div className={Style.title}>{props.title}</div> : null}
      <div className={Style.control}>
        <textarea
          value={props.value}
          rows={props.rows || 4}
          placeholder={props.placeholder || ''}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
