import { observer } from 'mobx-react-lite'
import store from '../../store'
import { Terminal, ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebglAddon } from '@xterm/addon-webgl'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { LocalEchoAddon } from '@kobakazu0429/xterm-local-echo'
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
import nextTick from 'licia/nextTick'
import '@xterm/xterm/css/xterm.css'

export default observer(function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const fitAddonRef = useRef<FitAddon>()
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
    fitAddonRef.current = fitAddon
    const fit = () => fitAddon.fit()
    fit()
    window.addEventListener('resize', fit)

    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'

    try {
      term.loadAddon(new WebglAddon())
    } catch (e) {
      term.loadAddon(new CanvasAddon())
    }

    const localEcho = new LocalEchoAddon()
    term.loadAddon(localEcho)

    localEcho.read('~$ ').then((input) => {
      console.log(input)
    })

    term.open(terminalRef.current!)
    termRef.current = term

    return () => {
      term.dispose()
      window.removeEventListener('resize', fit)
    }
  }, [])

  nextTick(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  })

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
