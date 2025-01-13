import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
} from 'luna-toolbar/react'
import LunaFileList from 'luna-file-list/react'
import ToolbarIcon from '../../../components/ToolbarIcon'
import { useEffect, useRef, useState } from 'react'
import Style from './File.module.scss'
import store from '../../store'
import { t } from '../../../../common/util'
import { notify, isFileDrop } from '../../../lib/util'
import { IFile } from 'luna-file-list'
import className from 'licia/className'
import isEmpty from 'licia/isEmpty'
import splitPath from 'licia/splitPath'

export default observer(function File() {
  const [fileList, setFileList] = useState([])
  const [path, setPath] = useState('/')
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const dragging = useRef(0)

  useEffect(() => {
    getFiles('/')
  }, [])

  async function getFiles(path: string) {
    if (store.device) {
      const files = await main.readDir(store.device.id, path)
      setPath(path)
      setFileList(files)
      setFilter('')
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

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(false)
    const files = e.dataTransfer.files
    const apkPaths: string[] = []
    for (let i = 0, len = files.length; i < len; i++) {
      apkPaths.push(preload.getPathForFile(files[i]))
    }
    await uploadFiles(apkPaths)
  }

  async function uploadFiles(files?: string[]) {
    if (!store.device) {
      return
    }

    if (!files) {
      const { filePaths } = await main.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
      })
      if (isEmpty(filePaths)) {
        return
      }
      files = filePaths
    }

    for (let i = 0, len = files!.length; i < len; i++) {
      const file = files![i]
      const { name } = splitPath(file)
      notify(t('fileUploading', { path: name }), { icon: 'info' })
      try {
        await main.pushFile(store.device.id, file, path + name)
        // eslint-disable-next-line
      } catch (e) {
        notify(t('uploadFileErr'), { icon: 'error' })
      }
    }

    await getFiles(path)
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
        <LunaToolbarInput
          keyName="path"
          value={path}
          className={Style.path}
          disabled={!store.device}
        />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={() => getFiles(path)}
          disabled={!store.device}
        />
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="upload"
          title={t('upload')}
          onClick={() => uploadFiles()}
          disabled={!store.device}
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
      <div
        onDrop={onDrop}
        onDragEnter={() => {
          dragging.current++
        }}
        onDragLeave={() => {
          dragging.current--
          if (dragging.current === 0) {
            setDropHighlight(false)
          }
        }}
        onDragOver={(e) => {
          if (!isFileDrop(e)) {
            return
          }
          e.preventDefault()
          setDropHighlight(true)
        }}
        className={className('panel-body', {
          [Style.highlight]: dropHighlight,
        })}
      >
        <LunaFileList
          className={Style.fileList}
          files={fileList}
          filter={filter}
          listView={store.file.listView}
          onDoubleClick={onDoubleClick}
        />
      </div>
    </div>
  )
})
