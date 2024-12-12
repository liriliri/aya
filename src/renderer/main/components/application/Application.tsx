import LunaToolbar from 'luna-toolbar/react'
import className from 'licia/className'
import Style from './Application.module.scss'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import store from '../../store'

export default observer(function Application() {
  const { device } = store

  useEffect(() => {
    getAllPackageInfos()
  }, [])

  async function getAllPackageInfos() {
    if (!device) {
      return
    }
    const packages = await main.getPackages(device.id, false)
    const packageInfos = await main.getPackageInfos(device.id, packages)
    console.log(packageInfos)
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar"></LunaToolbar>
      <div className={className('panel-body', Style.applications)}></div>
    </div>
  )
})
