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
import startWith from 'licia/startWith'
import LunaSplitPane, { LunaSplitPaneItem } from 'luna-split-pane/react'
import Transfer from './Transfer'
import FilePreview from 'share/renderer/components/FilePreview'

export default observer(function File() {
  const [fileList, setFileList] = useState<IFile[]>([])
  const [path, setPath] = useState('')
  const [customPath, setCustomPath] = useState('')
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [selected, setSelected] = useState<IFile | undefined>()
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const draggingRef = useRef(0)
  const fileListContainerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<IFile | undefined>(undefined)
  selectedRef.current = selected

  const { device, file } = store

  useEffect(() => {
    go('/')
  }, [])

  useEffect(() => {
    const container = fileListContainerRef.current
    if (!container) {
      return
    }
    const scrollables = container.querySelectorAll<HTMLElement>(
      '.luna-data-grid-data-container, .luna-icon-list'
    )
    for (const el of scrollables) {
      el.scrollTop = 0
    }
  }, [path])

  useEffect(() => {
    if (!device) {
      return
    }
    const filterLower = filter.trim().toLowerCase()
    const filteredFileList = filterLower
      ? fileList.filter((f) => f.name.toLowerCase().includes(filterLower))
      : fileList

    let lastKey = ''
    let lastIdx = -1

    function clickMatchedRow(container: HTMLElement, target: IFile) {
      const rows = container.querySelectorAll<HTMLElement>(
        '.luna-data-grid-node'
      )
      for (const el of rows) {
        if (el.offsetParent === null) {
          continue
        }
        const node = (el as any).dataGridNode
        if (node?.data?.file === target) {
          el.scrollIntoView({ block: 'nearest' })
          el.click()
          return true
        }
      }
      return false
    }

    function selectFile(container: HTMLElement, target: IFile): boolean {
      const icons = container.querySelectorAll<HTMLElement>(
        '.luna-icon-list-item'
      )
      for (const el of icons) {
        if (el.offsetParent === null) {
          continue
        }
        const icon = (el as any).icon
        if (icon?.data?.file === target) {
          el.scrollIntoView({ block: 'nearest' })
          el.click()
          return true
        }
      }
      if (clickMatchedRow(container, target)) {
        return true
      }
      // LunaDataGrid virtualizes off-screen rows; scroll the target into view
      // first (ROW_HEIGHT is 20px in luna-data-grid), then retry after rAF.
      const dataContainer = container.querySelector<HTMLElement>(
        '.luna-data-grid-data-container'
      )
      if (dataContainer) {
        const idx = filteredFileList.indexOf(target)
        if (idx >= 0) {
          dataContainer.scrollTop = idx * 20
          requestAnimationFrame(() => {
            clickMatchedRow(container, target)
          })
          return true
        }
      }
      return false
    }

    async function deleteSelected(target: IFile) {
      const result = await LunaModal.confirm(
        t('deleteFileConfirm', { name: target.name })
      )
      if (!result) {
        return
      }
      const filePath = path + target.name
      if (target.directory) {
        await main.deleteDir(device!.id, filePath)
      } else {
        await main.deleteFile(device!.id, filePath)
      }
      await getFiles(path)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return
      }
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'Delete') {
        const sel = selectedRef.current
        if (!sel) {
          return
        }
        e.preventDefault()
        void deleteSelected(sel)
        return
      }
      if (e.key === 'Backspace') {
        if (!device || path === '/') {
          return
        }
        e.preventDefault()
        void up()
        return
      }
      if (e.key === 'Enter') {
        const sel = selectedRef.current
        if (!sel || !sel.directory) {
          return
        }
        e.preventDefault()
        void open(sel)
        return
      }
      const key = e.key
      if (key.length !== 1 || !/[a-z]/i.test(key)) {
        return
      }
      const lower = key.toLowerCase()
      const len = filteredFileList.length
      if (len === 0) {
        return
      }
      // Pressing the same key repeatedly cycles to the next matching file
      // (wrapping around at the end); a different key restarts from the top.
      let startIdx: number
      if (lower === lastKey && lastIdx >= 0) {
        startIdx = lastIdx + 1
      } else {
        lastKey = lower
        startIdx = 0
      }
      let matchIdx = -1
      let match: IFile | undefined
      for (let i = 0; i < len; i++) {
        const idx = (startIdx + i) % len
        const f = filteredFileList[idx]
        if (f.name.toLowerCase().startsWith(lower)) {
          match = f
          matchIdx = idx
          break
        }
      }
      if (!match) {
        lastIdx = -1
        return
      }
      lastIdx = matchIdx
      const container = fileListContainerRef.current
      if (!container) {
        return
      }
      if (selectFile(container, match)) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [device, fileList, filter, path])

  async function getFiles(path: string) {
    if (device) {
      const files: IFile[] = await main.readDir(device.id, path)
      for (let i = 0, len = files.length; i < len; i++) {
        const file = files[i]
        if (!file.directory) {
          const ext = splitPath(file.name).ext
          const type = file.mime
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

  async function open(file: IFile) {
    if (!device) {
      return
    }

    if (file.directory) {
      go(path + file.name + '/')
      return
    }

    if (file.mime) {
      const url = await main.getFileUrl(device.id, path + file.name)
      if (file.mime === 'application/pdf') {
        main.openWindow(url, 'pdf', {
          minHeight: 640,
          minWidth: 450,
          width: 450,
          height: 640,
        })
        return
      } else if (startWith(file.mime, 'video')) {
        main.showVideo(url)
        return
      }
    }

    notify(t('fileDownloading', { path: path + file.name }), { icon: 'info' })
    main.openFile(device.id, path + file.name)
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
        {
          label: t('download'),
          click: async () => {
            const { canceled, filePaths } = await main.showOpenDialog({
              properties: ['openDirectory'],
            })
            if (canceled) {
              return
            }
            const dest = filePaths[0] + '/' + file.name
            notify(t('fileDownloading', { path: path + file.name }), {
              icon: 'info',
            })
            await main.pullFile(device.id, path + file.name, dest)
            notify(t('fileDownloaded', { path: dest }), {
              icon: 'success',
              duration: 5000,
            })
          },
        },
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
        },
        {
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
        },
      ]
      contextMenu(e, template)
    } else {
      const template: any[] = [
        {
          label: t('upload'),
          click: uploadFiles,
        },
        {
          label: t('uploadFolder'),
          click: uploadFolder,
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
  async function uploadFolder(files?: string[]) {
    if (!device) {
      return
    }

    if (!files) {
      const { filePaths } = await main.showOpenDialog({
        properties: ['openDirectory', 'multiSelections'],
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
            [Style.blink]: !isEmpty(file.transfers),
          })}
          state={file.showTransfer ? 'hover' : ''}
          onClick={() => {
            file.set('showTransfer', !file.showTransfer)
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
          state={file.listView ? '' : 'hover'}
          onClick={() => {
            if (file.listView) {
              file.set('listView', false)
            }
          }}
        />
        <ToolbarIcon
          icon="list"
          title={t('listView')}
          state={file.listView ? 'hover' : ''}
          onClick={() => {
            if (!file.listView) {
              file.set('listView', true)
            }
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="eye"
          title={t('preview')}
          state={file.showPreview ? 'hover' : ''}
          onClick={() => {
            file.set('showPreview', !file.showPreview)
          }}
        />
      </LunaToolbar>
      <LunaSplitPane
        direction="vertical"
        onResize={(weights) => {
          const [fileListWeight, transferWeight] = weights
          file.set(
            'transferWeight',
            (transferWeight / (fileListWeight + transferWeight)) * 100
          )
        }}
      >
        <LunaSplitPaneItem minSize={200} weight={100 - file.transferWeight}>
          <LunaSplitPane onResize={(weights) => file.set('weights', weights)}>
            <LunaSplitPaneItem minSize={400} weight={file.weights[0]}>
              <div
                ref={fileListContainerRef}
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
                  listView={file.listView}
                  onDoubleClick={(e: MouseEvent, file: IFile) => open(file)}
                  onContextMenu={onContextMenu}
                  onSelect={async (file: IFile) => {
                    setSelected(file)
                    try {
                      const url = await main.getFileUrl(
                        device!.id,
                        path + file.name
                      )
                      setSelectedUrl(url)
                    } catch {
                      setSelectedUrl('')
                    }
                  }}
                  onDeselect={() => {
                    setSelectedUrl('')
                    setSelected(undefined)
                  }}
                />
              </div>
            </LunaSplitPaneItem>
            <LunaSplitPaneItem
              minSize={180}
              weight={file.weights[1]}
              visible={file.showPreview}
            >
              <FilePreview
                file={file.showPreview ? selected : undefined}
                url={selectedUrl}
              />
            </LunaSplitPaneItem>
          </LunaSplitPane>
        </LunaSplitPaneItem>
        <LunaSplitPaneItem
          className={Style.transfer}
          minSize={150}
          weight={file.transferWeight}
          visible={file.showTransfer}
        >
          <Transfer />
        </LunaSplitPaneItem>
      </LunaSplitPane>
    </div>
  )
})
