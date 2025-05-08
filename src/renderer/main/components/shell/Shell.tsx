import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import Term from './Term'
import LunaTab, { LunaTabItem } from 'luna-tab/react'
import { t } from '../../../../common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import store from '../../store'
import Style from './Shell.module.scss'
import className from 'licia/className'
import { useEffect, useRef, useState } from 'react'
import uuid from 'licia/uuid'
import map from 'licia/map'
import filter from 'licia/filter'

export default observer(function Shell() {
  const [shells, setShells] = useState<Array<{ id: string; name: string }>>([])
  const [selectedShell, setSelectedShell] = useState('')
  const numRef = useRef(1)
  const { device } = store

  useEffect(() => add(), [])

  function add() {
    const id = uuid()
    setShells([
      ...shells,
      {
        id,
        name: `${t('shell')} ${numRef.current++}`,
      },
    ])
    setSelectedShell(id)
  }

  function close() {
    let selectedIdx = shells.findIndex((shell) => shell.id === selectedShell)
    const newShells = filter(shells, (shell) => shell.id !== selectedShell)
    setShells(newShells)
    if (selectedIdx >= newShells.length) {
      selectedIdx = newShells.length - 1
    }
    setSelectedShell(newShells[selectedIdx].id)
  }

  const tabItems = map(shells, (shell) => {
    return (
      <LunaTabItem
        key={shell.id}
        id={shell.id}
        title={shell.name}
        selected={selectedShell === shell.id}
      />
    )
  })

  const terms = map(shells, (shell) => {
    return (
      <Term
        key={shell.id}
        visible={selectedShell === shell.id && store.panel === 'shell'}
      />
    )
  })

  return (
    <div className="panel-with-toolbar">
      <div className={className('panel-toolbar', Style.toolbar)}>
        <LunaTab
          className={Style.tabs}
          height={31}
          onSelect={(id) => setSelectedShell(id)}
        >
          {tabItems}
        </LunaTab>
        <LunaToolbar className={Style.controls}>
          <ToolbarIcon
            icon="add"
            title={t('add')}
            onClick={add}
            disabled={!device}
          />
          <LunaToolbarSpace />
          <LunaToolbarSeparator />
          <ToolbarIcon
            icon="delete"
            title={t('close')}
            onClick={close}
            disabled={!device || shells.length <= 1}
          />
        </LunaToolbar>
      </div>
      <div className="panel-body">{terms}</div>
    </div>
  )
})
