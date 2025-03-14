import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { Terminal, ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import each from 'licia/each'
import replaceAll from 'licia/replaceAll'
import Style from './Terminal.module.scss'
import {
  colorBgContainer,
  colorBgContainerDark,
  colorPrimary,
  colorText,
  colorTextDark,
} from '../../../common/theme'
import store from '../store'
import '@xterm/xterm/css/xterm.css'
import contextMenu from 'share/renderer/lib/contextMenu'
import { t } from '../../../common/util'
import copy from 'licia/copy'

export default observer(function () {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>()

  useEffect(() => {
    const term = new Terminal({
      allowProposedApi: true,
      fontSize: 14,
      fontFamily: 'mono, courier-new, courier, monospace',
      theme: getTheme(store.theme === 'dark'),
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'
    try {
      term.loadAddon(new WebglAddon())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      term.loadAddon(new CanvasAddon())
    }
    term.open(terminalRef.current!)
    const write = (log: string) => {
      term.write(replaceAll(log, '\n', '\r\n'))
    }
    const fit = () => fitAddon.fit()
    fit()

    window.addEventListener('resize', fit)
    main.getLogs().then((logs: string[]) => {
      each(logs, (log) => write(log))
    })
    main.on('addLog', (log) => write(log))

    termRef.current = term

    return () => {
      term.dispose()
      window.removeEventListener('resize', fit)
    }
  }, [])

  const onContextMenu = (e: React.MouseEvent) => {
    const term = termRef.current!
    const template: any[] = [
      {
        label: t('copy'),
        click: () => {
          if (term.hasSelection()) {
            copy(term.getSelection())
            term.focus()
          }
        },
      },
      {
        label: t('selectAll'),
        click: () => {
          term.selectAll()
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('clear'),
        click: () => {
          main.clearLogs()
          term.clear()
          term.focus()
        },
      },
    ]

    contextMenu(e, template)
  }

  const theme = getTheme(store.theme === 'dark')
  if (termRef.current) {
    termRef.current.options.theme = theme
  }

  return (
    <div className={Style.terminalContainer}>
      <div
        className={Style.terminal}
        ref={terminalRef}
        onContextMenu={onContextMenu}
      />
    </div>
  )
})

function getTheme(dark = false) {
  let theme: ITheme = {
    background: colorBgContainer,
    foreground: colorText,
  }

  if (dark) {
    theme = {
      background: colorBgContainerDark,
      foreground: colorTextDark,
    }
  }

  return {
    selectionForeground: '#fff',
    selectionBackground: colorPrimary,
    ...theme,
  }
}
