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
import Style from './Shell.module.scss'
import '@xterm/xterm/css/xterm.css'

export default observer(function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>()

  useEffect(() => {
    const term = new Terminal({
      allowProposedApi: true,
      fontSize: 14,
      fontFamily: fontFamilyCode,
      theme: getTheme(store.theme === 'dark'),
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    const fit = () => fitAddon.fit()
    window.addEventListener('resize', fit)

    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'

    try {
      term.loadAddon(new WebglAddon())
    } catch (e) {
      term.loadAddon(new CanvasAddon())
    }

    term.open(terminalRef.current!)
    termRef.current = term

    let sessionId = ''
    function onShellData(_, id, data) {
      if (sessionId !== id) {
        return
      }
      term.write(data)
    }

    if (store.device) {
      main.createShell(store.device.id).then((id) => {
        sessionId = id
        term.onData((data) => main.writeShell(sessionId, data))
        term.onResize((size) => {
          main.resizeShell(sessionId, size.cols, size.rows)
        })
        fit()
        main.on('shellData', onShellData)
      })
    }

    return () => {
      if (sessionId) {
        main.off('shellData', onShellData)
        main.killShell(sessionId)
      }
      term.dispose()
      window.removeEventListener('resize', fit)
    }
  }, [])

  const theme = getTheme(store.theme === 'dark')
  if (termRef.current) {
    termRef.current.options.theme = theme
  }

  return (
    <div
      className={Style.container}
      ref={terminalRef}
      style={{
        display: store.panel === 'shell' ? 'block' : 'none',
      }}
    ></div>
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
