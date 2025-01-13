import { observer } from 'mobx-react-lite'
import LunaToolbar from 'luna-toolbar/react'
import LunaFileList from 'luna-file-list/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { useEffect, useState } from 'react'
import store from '../../store'

export default observer(function File() {
  const [fileList, setFileList] = useState([])
  const [path, setPath] = useState('/')

  useEffect(() => getFiles(), [])

  function getFiles() {
    if (store.device) {
      main.readDir(store.device.id, path).then(setFileList)
    }
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon icon="arrow-left" title={'Back'} onClick={() => {}} />
        <ToolbarIcon icon="arrow-right" title={'Forward'} onClick={() => {}} />
        <ToolbarIcon icon="arrow-up" title={'Up'} onClick={() => {}} />
      </LunaToolbar>
      <LunaFileList className="panel-body" files={fileList} />
    </div>
  )
})
