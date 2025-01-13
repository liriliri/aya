import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
} from 'luna-toolbar/react'
import LunaFileList from 'luna-file-list/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { useEffect, useState } from 'react'
import Style from './File.module.scss'
import store from '../../store'
import { t } from '../../../../common/util'
import { IFile } from 'luna-file-list'
import className from 'licia/className'

export default observer(function File() {
  const [fileList, setFileList] = useState([])
  const [path, setPath] = useState('/')
  const [filter, setFilter] = useState('')

  useEffect(() => getFiles('/'), [])

  function getFiles(path: string) {
    if (store.device) {
      main.readDir(store.device.id, path).then((files) => {
        setPath(path)
        setFileList(files)
        setFilter('')
      })
    }
  }

  function up() {
    getFiles(path.split('/').slice(0, -2).join('/') + '/')
  }

  function onDoubleClick(e: MouseEvent, file: IFile) {
    if (file.directory) {
      getFiles(path + file.name + '/')
    }
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon icon="arrow-left" title={t('back')} onClick={() => {}} />
        <ToolbarIcon
          icon="arrow-right"
          title={t('forward')}
          onClick={() => {}}
        />
        <ToolbarIcon
          icon="arrow-up"
          title={t('up')}
          onClick={up}
          disabled={path === '/'}
        />
        <LunaToolbarInput keyName="path" value={path} className={Style.path} />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={() => getFiles(path)}
        />
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="grid"
          title={t('iconView')}
          state={store.file.listView ? '' : 'hover'}
          onClick={() => {
            if (store.file.listView) {
              store.file.set('listView', false)
            }
          }}
        />
        <ToolbarIcon
          icon="list"
          title={t('listView')}
          state={store.file.listView ? 'hover' : ''}
          onClick={() => {
            if (!store.file.listView) {
              store.file.set('listView', true)
            }
          }}
        />
      </LunaToolbar>
      <LunaFileList
        className={className('panel-body', Style.fileList)}
        files={fileList}
        filter={filter}
        listView={store.file.listView}
        onDoubleClick={onDoubleClick}
      />
    </div>
  )
})
