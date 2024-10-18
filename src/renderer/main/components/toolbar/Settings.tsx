import LunaToolbar from 'luna-toolbar/react'
import { t } from '../../../lib/util'
import ToolbarIcon from '../../../components/ToolbarIcon'

export default function Settings() {
  return (
    <LunaToolbar>
      <ToolbarIcon icon="setting" title={t('settings')} onClick={() => {}} />
    </LunaToolbar>
  )
}
