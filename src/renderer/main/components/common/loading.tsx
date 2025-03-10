import { ILoadingProps, LoadingBar } from 'share/renderer/components/loading'

export const PannelLoading = function (props: ILoadingProps) {
  return (
    <div className="panel-loading" onClick={props.onClick}>
      <LoadingBar />
    </div>
  )
}
