import LunaToolbar from 'luna-toolbar/react'
import { t } from '../../../../common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { useState } from 'react'
import SettingsModal from './SettingsModal'

export default function Settings() {
  const [settingsModalVisiable, setSettingsModalVisiable] = useState(false)

  return (
    <>
      <LunaToolbar>
        <ToolbarIcon
          icon="setting"
          title={t('settings')}
          onClick={() => setSettingsModalVisiable(true)}
        />
      </LunaToolbar>
      <SettingsModal
        visible={settingsModalVisiable}
        onClose={() => setSettingsModalVisiable(false)}
      />
    </>
  )
}
