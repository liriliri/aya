import { useEffect, useId, useRef, useState } from 'react'
import { t } from 'common/util'
import Style from './Logcat.module.scss'

interface Props {
  value: string
  history: string[]
  placeholder: string
  ariaLabel?: string
  className?: string
  type?: 'search' | 'text'
  maxLength?: number
  invalid?: boolean
  describedBy?: string
  onChange: (value: string) => void
  onCommit: (value: string) => void
  onDelete: (value: string) => void
  onClear: () => void
  onEscape?: () => void
}

export default function HistoryInput({
  value,
  history,
  placeholder,
  ariaLabel = placeholder,
  className,
  type = 'text',
  maxLength,
  invalid,
  describedBy,
  onChange,
  onCommit,
  onDelete,
  onClear,
  onEscape,
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dirtyRef = useRef(false)
  const listId = useId()
  const hasHistory = history.length > 0

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (activeIndex >= history.length) {
      setActiveIndex(history.length - 1)
    }
    if (!hasHistory) {
      setOpen(false)
    }
  }, [activeIndex, hasHistory, history.length])

  const select = (item: string) => {
    dirtyRef.current = false
    onChange(item)
    onCommit(item)
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div className={`${Style.historyInput} ${className || ''}`} ref={rootRef}>
      <input
        ref={inputRef}
        type={type}
        role={type === 'search' ? 'searchbox' : 'combobox'}
        className={Style.historyInputControl}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-expanded={open && hasHistory}
        aria-autocomplete={type === 'text' ? 'list' : undefined}
        aria-controls={hasHistory ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        onFocus={() => {
          dirtyRef.current = false
          setOpen(hasHistory)
        }}
        onClick={() => setOpen(hasHistory)}
        onBlur={() => {
          if (dirtyRef.current) {
            onCommit(value)
          }
          dirtyRef.current = false
        }}
        onChange={(event) => {
          dirtyRef.current = true
          onChange(event.target.value)
          setOpen(false)
          setActiveIndex(-1)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && hasHistory) {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) =>
              index < history.length - 1 ? index + 1 : 0
            )
          } else if (event.key === 'ArrowUp' && hasHistory) {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) =>
              index > 0 ? index - 1 : history.length - 1
            )
          } else if (event.key === 'Enter') {
            event.preventDefault()
            if (open && activeIndex >= 0) {
              select(history[activeIndex])
            } else {
              dirtyRef.current = false
              onCommit(value)
              setOpen(false)
            }
          } else if (event.key === 'Escape') {
            if (open) {
              event.preventDefault()
              setOpen(false)
              setActiveIndex(-1)
            }
            dirtyRef.current = false
            onEscape?.()
          }
        }}
      />
      {value && (
        <button
          type="button"
          className={Style.historyInputClear}
          title={t('clearLogSearch')}
          aria-label={t('clearLogSearch')}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            dirtyRef.current = false
            onChange('')
            setOpen(false)
            setActiveIndex(-1)
            inputRef.current?.focus()
          }}
        >
          ×
        </button>
      )}
      {open && hasHistory && (
        <div
          className={Style.historyMenu}
          id={listId}
          role="listbox"
          onPointerDown={(event) => event.preventDefault()}
        >
          <div className={Style.historyItems}>
            {history.map((item, index) => (
              <div
                className={`${Style.historyItem} ${
                  activeIndex === index ? Style.historyItemActive : ''
                }`}
                key={item}
              >
                <button
                  type="button"
                  className={Style.historyValue}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  title={item}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                >
                  {item}
                </button>
                <button
                  type="button"
                  className={Style.historyDelete}
                  title={t('deleteHistoryItem')}
                  aria-label={`${t('deleteHistoryItem')}: ${item}`}
                  onClick={() => {
                    if (item === value) {
                      dirtyRef.current = false
                    }
                    onDelete(item)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={Style.historyClear}
            onClick={() => {
              dirtyRef.current = false
              onClear()
              setOpen(false)
              setActiveIndex(-1)
              inputRef.current?.focus()
            }}
          >
            {t('clearSearchHistory')}
          </button>
        </div>
      )}
    </div>
  )
}
