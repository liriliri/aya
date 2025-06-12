import { observer } from 'mobx-react-lite'
import DeviceManager from './components/DeviceManager'
import Screenshot from './components/Screenshot'
import Toolbar from './components/Toolbar'
import LunaSplitPane, { LunaSplitPaneItem } from 'luna-split-pane/react'
import Style from './App.module.scss'
import store from './store'

export default observer(function App() {
  return (
    <>
      <Toolbar />
      <LunaSplitPane
        direction="vertical"
        className={Style.splitPane}
        onResize={(weights) => {
          const [deviceManagerWeight, screenshotWeight] = weights
          store.setScreenshotWeight(
            Math.round(
              (screenshotWeight / (deviceManagerWeight + screenshotWeight)) *
                100
            )
          )
        }}
      >
        <LunaSplitPaneItem minSize={200} weight={100 - store.screenshotWeight}>
          <DeviceManager />
        </LunaSplitPaneItem>
        <LunaSplitPaneItem minSize={200} weight={store.screenshotWeight}>
          <Screenshot />
        </LunaSplitPaneItem>
      </LunaSplitPane>
    </>
  )
})
