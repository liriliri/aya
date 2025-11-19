import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarHtml,
  LunaToolbarInput,
  LunaToolbarSeparator,
} from 'luna-toolbar/react'
import LunaFileList from 'luna-file-list/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { useEffect, useRef, useState } from 'react'
import Style from './File.module.scss'
import store from '../../store'
import { t } from 'common/util'
import { notify, isFileDrop } from 'share/renderer/lib/util'
import { IFile } from 'luna-file-list'
import className from 'licia/className'
import isEmpty from 'licia/isEmpty'
import splitPath from 'licia/splitPath'
import contextMenu from 'share/renderer/lib/contextMenu'
import LunaModal from 'luna-modal'
import endWith from 'licia/endWith'
import normalizePath from 'licia/normalizePath'
import LunaPathBar from 'luna-path-bar/react'
import mime from 'licia/mime'
import startWith from 'licia/startWith'
import LunaSplitPane, { LunaSplitPaneItem } from 'luna-split-pane/react'
import Transfer from './Transfer'

export default observer(function File() {
  const [fileList, setFileList] = useState<IFile[]>([])
  const [path, setPath] = useState('')
  const [customPath, setCustomPath] = useState('')
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const draggingRef = useRef(0)

  const { device } = store

  useEffect(() => {
    go('/')
  }, [])

  async function getFiles(path: string) {
    if (device) {
      const files: IFile[] = await main.readDir(device.id, path)
      for (let i = 0, len = files.length; i < len; i++) {
        const file = files[i]
        const ext = splitPath(file.name).ext
        const type = mime(ext.slice(1))
        if (
          !type ||
          (!startWith(type, 'image') &&
            !startWith(type, 'text') &&
            !startWith(type, 'video') &&
            !startWith(type, 'audio'))
        ) {
          file.thumbnail = await main.getFileIcon(ext)
        }
      }
      setPath(path)
      setCustomPath(path)
      setFileList(files)
      setFilter('')
    }
  }

  function fileExist(name: string) {
    for (let i = 0, len = fileList.length; i < len; i++) {
      if (fileList[i].name === name) {
        return true
      }
    }

    return false
  }

  async function back() {
    if (historyIdx <= 0) {
      return
    }
    await getFiles(history[historyIdx - 1])
    setHistoryIdx(historyIdx - 1)
  }

  async function forward() {
    if (historyIdx >= history.length - 1) {
      return
    }
    await getFiles(history[historyIdx + 1])
    setHistoryIdx(historyIdx + 1)
  }

  async function go(p: string) {
    await getFiles(p)
    setHistory([...history.slice(0, historyIdx + 1), p])
    setHistoryIdx(historyIdx + 1)
  }

  async function up() {
    await go(path.split('/').slice(0, -2).join('/') + '/')
  }

  function open(file: IFile) {
    if (!device) {
      return
    }

    if (file.directory) {
      go(path + file.name + '/')
    } else {
      notify(t('fileDownloading', { path: path + file.name }), { icon: 'info' })
      main.openFile(device.id, path + file.name)
    }
  }

  function onContextMenu(e: MouseEvent, file?: IFile) {
    if (!device) {
      return
    }

    if (file) {
      const template: any[] = [
        {
          label: t('open'),
          click: () => open(file),
        },
      ]
      if (!file.directory) {
        template.push({
          label: t('download'),
          click: async () => {
            const { canceled, filePath } = await main.showSaveDialog({
              defaultPath: file.name,
            })
            if (canceled) {
              return
            }
            notify(t('fileDownloading', { path: path + file.name }), {
              icon: 'info',
            })
            await main.pullFile(device.id, path + file.name, filePath)
            notify(t('fileDownloaded', { path: filePath }), {
              icon: 'success',
              duration: 5000,
            })
          },
        })
      }
      template.push(
        {
          type: 'separator',
        },
        {
          label: t('delete'),
          click: async () => {
            const result = await LunaModal.confirm(
              t('deleteFileConfirm', { name: file.name })
            )
            if (result) {
              const filePath = path + file.name
              if (file.directory) {
                await main.deleteDir(device.id, filePath)
              } else {
                await main.deleteFile(device.id, filePath)
              }
              getFiles(path)
            }
          },
        }
      )
      template.push({
        label: t('rename'),
        click: async () => {
          const name = await LunaModal.prompt(
            t(file.directory ? 'newFolderName' : 'newFileName'),
            file.name
          )
          if (name && name !== file.name) {
            if (fileExist(name)) {
              notify(t('fileExistErr', { name }), { icon: 'error' })
              return
            }
            await main.moveFile(device.id, path + file.name, path + name)
            getFiles(path)
          }
        },
      })
      contextMenu(e, template)
    } else {
      const template: any[] = [
        {
          label: t('upload'),
          click: uploadFiles,
        },
        {
          label: t('newFolder'),
          click: async () => {
            const name = await LunaModal.prompt(t('newFolderName'))
            if (name) {
              await main.createDir(device.id, path + name)
              getFiles(path)
            }
          },
        },
        {
          label: t('refresh'),
          click: () => getFiles(path),
        },
      ]
      contextMenu(e, template)
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
    if (!device) {
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
      notify(t('fileUploading', { path: file }), { icon: 'info' })
      try {
        await main.pushFile(device.id, file, path + name)
      } catch {
        notify(t('uploadFileErr'), { icon: 'error' })
      }
    }

    await getFiles(path)
  }

  async function goCustomPath(p: string) {
    if (!endWith(p, '/')) {
      p = p + '/'
    }
    p = normalizePath(p)
    if (p === customPath) {
      return
    }

    setCustomPath(p)

    try {
      const stat = await main.statFile(device!.id, p)
      if (stat.directory) {
        go(p)
      } else {
        setCustomPath(customPath)
      }
    } catch {
      setCustomPath(customPath)
      notify(t('folderNotExistErr'), { icon: 'error' })
    }
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="bidirection"
          title={t('transfer')}
          className={className({
            [Style.blink]: !isEmpty(store.file.transfers),
          })}
          state={store.file.showTransfer ? 'hover' : ''}
          onClick={() => {
            store.file.set('showTransfer', !store.file.showTransfer)
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="arrow-left"
          title={t('back')}
          onClick={back}
          disabled={historyIdx <= 0}
        />
        <ToolbarIcon
          icon="arrow-right"
          title={t('forward')}
          onClick={forward}
          disabled={historyIdx >= history.length - 1}
        />
        <ToolbarIcon
          icon="arrow-up"
          title={t('up')}
          onClick={up}
          disabled={path === '/' || !device}
        />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={() => getFiles(path)}
          disabled={!device}
        />
        <LunaToolbarHtml className={Style.pathContainer} disabled={!device}>
          <LunaPathBar
            className={Style.path}
            rootLabel={t('storage')}
            path={customPath}
            onChange={(path) => goCustomPath('/' + path)}
          />
        </LunaToolbarHtml>
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
      <LunaSplitPane direction="vertical">
        <LunaSplitPaneItem
          minSize={200}
          weight={100 - store.file.transferWeight}
        >
          <div
            onDrop={onDrop}
            onDragEnter={() => {
              draggingRef.current++
            }}
            onDragLeave={() => {
              draggingRef.current--
              if (draggingRef.current === 0) {
                setDropHighlight(false)
              }
            }}
            onDragOver={(e) => {
              if (!isFileDrop(e)) {
                return
              }
              e.preventDefault()
              if (device) {
                setDropHighlight(true)
              }
            }}
            className={className('panel-body', {
              [Style.highlight]: dropHighlight,
            })}
          >
            <LunaFileList
              className={Style.fileList}
              files={fileList}
              filter={filter}
              columns={['name', 'mode', 'mtime', 'type', 'size']}
              listView={store.file.listView}
              onDoubleClick={(e: MouseEvent, file: IFile) => open(file)}
              onContextMenu={onContextMenu}
            />
          </div>
        </LunaSplitPaneItem>
        <LunaSplitPaneItem
          className={Style.transfer}
          minSize={150}
          weight={store.file.transferWeight}
          visible={store.file.showTransfer}
        >
          <Transfer />
        </LunaSplitPaneItem>
      </LunaSplitPane>
    </div>
  )
})
