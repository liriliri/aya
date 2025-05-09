import { observer } from 'mobx-react-lite'
import store from '../../store'
import { Terminal, ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebglAddon } from '@xterm/addon-webgl'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useEffect, useRef } from 'react'
import {
  colorBgContainer,
  colorBgContainerDark,
  colorPrimary,
  colorText,
  colorTextDark,
  fontFamilyCode,
} from '../../../../common/theme'
import copy from 'licia/copy'
import Style from './Term.module.scss'
import '@xterm/xterm/css/xterm.css'
import { t } from '../../../../common/util'
import contextMenu from 'share/renderer/lib/contextMenu'
import isHidden from 'licia/isHidden'

interface ITermProps {
  visible: boolean
  onSessionIdChange: (id: string) => void
  onCreate: (terminal: Terminal) => void
}

export default observer(function Term(props: ITermProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>()
  const fitAddonRef = useRef<FitAddon>()
  const sessionIdRef = useRef('')

  const { device } = store

  useEffect(() => {
    const term = new Terminal({
      allowProposedApi: true,
      fontSize: 14,
      fontFamily: fontFamilyCode,
      theme: getTheme(store.theme === 'dark'),
    })

    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    term.loadAddon(fitAddon)
    const fit = () => {
      if (!isHidden(terminalRef.current!)) {
        fitAddon.fit()
      }
    }
    window.addEventListener('resize', fit)

    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'

    try {
      term.loadAddon(new WebglAddon())
    } catch {
      term.loadAddon(new CanvasAddon())
    }

    term.open(terminalRef.current!)
    termRef.current = term
    props.onCreate(term)

    function onShellData(id, data) {
      if (sessionIdRef.current !== id) {
        return
      }
      term.write(data)
    }
    const offShellData = main.on('shellData', onShellData)

    if (device) {
      main.createShell(device.id).then((id) => {
        setSessionId(id)
        term.onData((data) => main.writeShell(sessionIdRef.current, data))
        term.onResize((size) => {
          main.resizeShell(sessionIdRef.current, size.cols, size.rows)
        })
        fit()
      })
    }

    return () => {
      offShellData()
      if (sessionIdRef.current) {
        main.killShell(sessionIdRef.current)
      }
      term.dispose()
      window.removeEventListener('resize', fit)
    }
  }, [])

  useEffect(() => {
    if (fitAddonRef.current && props.visible) {
      fitAddonRef.current.fit()
    }
    if (props.visible) {
      setTimeout(() => {
        if (termRef.current) {
          termRef.current.focus()
        }
      }, 500)
    }
  }, [props.visible])

  const theme = getTheme(store.theme === 'dark')
  if (termRef.current) {
    termRef.current.options.theme = theme
  }

  function setSessionId(id: string) {
    sessionIdRef.current = id
    props.onSessionIdChange(id)
  }

  const onContextMenu = (e: React.MouseEvent) => {
    if (!device) {
      return
    }

    const term = termRef.current!
    const template: any[] = [
      {
        label: t('copy'),
        click() {
          if (term.hasSelection()) {
            copy(term.getSelection())
            term.focus()
          }
        },
      },
      {
        label: t('paste'),
        click: async () => {
          const text = await navigator.clipboard.readText()
          if (text) {
            main.writeShell(sessionIdRef.current, text)
          }
        },
      },
      {
        label: t('selectAll'),
        click() {
          term.selectAll()
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('reset'),
        click() {
          if (sessionIdRef.current) {
            main.killShell(sessionIdRef.current)
          }
          term.reset()
          if (device) {
            main.createShell(device.id).then((id) => {
              setSessionId(id)
            })
            term.focus()
          }
        },
      },
      {
        label: t('clear'),
        click() {
          term.clear()
          term.focus()
        },
      },
    ]

    contextMenu(e, template)
  }

  return (
    <>
      <div
        className={Style.term}
        style={{ display: props.visible ? 'block' : 'none' }}
        ref={terminalRef}
        onContextMenu={onContextMenu}
      />
    </>
  )
})

function getTheme(dark = false) {
  let theme: ITheme = {
    background: colorBgContainer,
    foreground: colorText,
    cursor: colorText,
  }

  if (dark) {
    theme = {
      background: colorBgContainerDark,
      foreground: colorTextDark,
      cursor: colorTextDark,
    }
  }

  return {
    selectionForeground: '#fff',
    selectionBackground: colorPrimary,
    ...theme,
  }
}
