import { LunaToolbarButton } from 'luna-toolbar/react'
import { PropsWithChildren } from 'react'

interface IProps {
  icon: string
  title?: string
  disabled?: boolean
  state?: '' | 'hover' | 'active'
  onClick: () => void
}

export default function (props: PropsWithChildren<IProps>) {
  return (
    <LunaToolbarButton
      disabled={props.disabled}
      state={props.state || ''}
      onClick={props.onClick}
    >
      <div className="icon toolbar-icon">
        <span className={`icon-${props.icon}`} title={props.title || ''}></span>
      </div>
    </LunaToolbarButton>
  )
}
