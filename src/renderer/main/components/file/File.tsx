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
  const listContainerRef = useRef<HTMLDivElement>(null)

  const { device, file } = store

  useEffect(() => {
    go('/')
  }, [])

  const iconCacheRef = useRef<Map<string, string>>(new Map())

  async function getFiles(targetPath: string) {
    if (device) {
      const files: IFile[] = await main.readDir(device.id, targetPath)
      for (let i = 0, len = files.length; i < len; i++) {
        const item = files[i]
        if (!item.directory) {
          const ext = splitPath(item.name).ext
          const type = item.mime
          if (
            !type ||
            (!startWith(type, 'image') &&
              !startWith(type, 'text') &&
              !startWith(type, 'video') &&
              !startWith(type, 'audio'))
          ) {
            if (iconCacheRef.current.has(ext)) {
              item.thumbnail = iconCacheRef.current.get(ext)
            } else {
              const icon = await main.getFileIcon(ext)
              iconCacheRef.current.set(ext, icon)
              item.thumbnail = icon
            }
          }
        }
      }
      setPath(targetPath)
      setCustomPath(targetPath)
      setFileList([...files])
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

  async function checkFileExist(targetPath: string) {
    if (!device) {
      return false
    }
    try {
      await main.statFile(device.id, targetPath)
      return true
    } catch {
      return false
    }
  }

  async function getAvailableCopyName(
    name: string,
    isDir: boolean,
    targetDir: string
  ): Promise<string> {
    let ext = ''
    let base = name
    if (!isDir) {
      if (endWith(name.toLowerCase(), '.tar.gz')) {
        base = name.slice(0, -7)
        ext = '.tar.gz'
      } else {
        const parts = splitPath(name)
        base = parts.name
        ext = parts.ext
      }
    }

    const copyRegex = /^(.*?)\s\(copy(?:\s(\d+))?\)$/
    const match = base.match(copyRegex)
    let prefix = base
    let num = 1
    if (match) {
      prefix = match[1]
      num = match[2] ? parseInt(match[2], 10) + 1 : 2
    }

    while (true) {
      const suffix = num === 1 ? ' (copy)' : ` (copy ${num})`
      const candidate = `${prefix}${suffix}${ext}`
      const exists =
        targetDir === path
          ? fileExist(candidate)
          : await checkFileExist(targetDir + candidate)
      if (!exists) {
        return candidate
      }
      num++
    }
  }

  function stageClipboard(action: 'copy' | 'cut', targetFile: IFile) {
    file.setClipboard({
      action,
      file: targetFile,
      srcPath: path + targetFile.name,
      parentPath: path,
    })
    notify(
      t(action === 'copy' ? 'fileCopied' : 'fileCut', {
        name: targetFile.name,
      }),
      { icon: 'success' }
    )
  }

  function promptFileConflict(
    name: string
  ): Promise<'overwrite' | 'rename' | 'cancel'> {
    return new Promise((resolve) => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const modal = new LunaModal(container, {
        title: t('fileConflict'),
        content: t('fileConflictMsg', { name }),
        showClose: false,
      })

      const footer = document.createElement('div')
      footer.className = 'luna-modal-button-group'

      let resolved = false
      function cleanup(result: 'overwrite' | 'rename' | 'cancel') {
        if (resolved) return
        resolved = true
        modal.hide()
        modal.destroy()
        container.remove()
        resolve(result)
      }

      const cancelBtn = document.createElement('div')
      cancelBtn.className = 'luna-modal-button luna-modal-secondary'
      cancelBtn.textContent = t('cancel')
      cancelBtn.onclick = () => cleanup('cancel')

      const renameBtn = document.createElement('div')
      renameBtn.className = 'luna-modal-button luna-modal-secondary'
      renameBtn.textContent = t('rename')
      renameBtn.onclick = () => cleanup('rename')

      const overwriteBtn = document.createElement('div')
      overwriteBtn.className = 'luna-modal-button luna-modal-primary'
      overwriteBtn.textContent = t('overwrite')
      overwriteBtn.onclick = () => cleanup('overwrite')

      footer.appendChild(cancelBtn)
      footer.appendChild(renameBtn)
      footer.appendChild(overwriteBtn)

      modal.setOption('footer', footer)
      modal.show()
    })
  }

  async function pasteFiles(targetDir: string) {
    if (!device || !file.clipboard) {
      return
    }

    const { action, file: clipFile, srcPath, parentPath } = file.clipboard
    const sourceName = clipFile.name

    if (!endWith(targetDir, '/')) {
      targetDir = targetDir + '/'
    }

    if (clipFile.directory) {
      const srcDir = endWith(srcPath, '/') ? srcPath : srcPath + '/'
      if (startWith(targetDir, srcDir)) {
        notify(t('invalidPasteTarget'), { icon: 'error' })
        return
      }
    }

    if (action === 'cut' && targetDir === parentPath) {
      notify(t('sameLocationErr'), { icon: 'info' })
      return
    }

    let finalDestName = sourceName

    const destPath = targetDir + finalDestName
    let targetExists = false
    if (targetDir === path) {
      targetExists = fileExist(finalDestName)
    } else {
      targetExists = await checkFileExist(destPath)
    }

    if (targetExists) {
      const conflictAction = await promptFileConflict(finalDestName)
      if (conflictAction === 'cancel') {
        return
      }
      if (conflictAction === 'rename') {
        const defaultCopyName = await getAvailableCopyName(
          finalDestName,
          clipFile.directory,
          targetDir
        )
        const newName = await LunaModal.prompt(
          t(clipFile.directory ? 'newFolderName' : 'newFileName'),
          defaultCopyName
        )
        if (!newName || newName === finalDestName) {
          return
        }
        const newExists =
          targetDir === path
            ? fileExist(newName)
            : await checkFileExist(targetDir + newName)
        if (newExists) {
          notify(t('fileExistErr', { name: newName }), { icon: 'error' })
          return
        }
        finalDestName = newName
      }
    }

    try {
      const finalDestPath = targetDir + finalDestName
      if (action === 'copy') {
        await main.copyFile(device.id, srcPath, finalDestPath)
      } else if (action === 'cut') {
        await main.moveFile(device.id, srcPath, finalDestPath)
        file.setClipboard(null)
      }
      notify(t('filePasted', { name: finalDestName }), { icon: 'success' })
    } catch {
      notify(t('pasteErr'), { icon: 'error' })
    } finally {
      await getFiles(path)
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (!modifier) {
        return
      }

      if (e.key === 'c' || e.key === 'C') {
        if (selected) {
          e.preventDefault()
          stageClipboard('copy', selected)
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (selected) {
          e.preventDefault()
          stageClipboard('cut', selected)
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (file.clipboard) {
          e.preventDefault()
          pasteFiles(path)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected, path, file.clipboard, device])

  useEffect(() => {
    const container = listContainerRef.current
    if (!container) {
      return
    }

    const cutClass = Style.cutItem || 'cut-item'
    const prevDimmed = container.querySelectorAll(`.${cutClass}`)
    prevDimmed.forEach((el) => el.classList.remove(cutClass))

    if (
      file.clipboard &&
      file.clipboard.action === 'cut' &&
      file.clipboard.parentPath === path
    ) {
      const cutName = file.clipboard.file.name
      const items = container.querySelectorAll(
        '.luna-icon-list-item, .luna-data-grid-node'
      )
      items.forEach((item) => {
        const nameEl =
          item.querySelector('.luna-icon-list-name') ||
          item.querySelector('.luna-data-grid-cell') ||
          item
        if (nameEl && nameEl.textContent?.trim() === cutName) {
          item.classList.add(cutClass)
        }
      })
    }
  }, [file.clipboard, fileList, path, file.listView])

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

  function onContextMenu(e: MouseEvent, fileItem?: IFile) {
    if (!device) {
      return
    }

    if (fileItem) {
      const template: any[] = [
        {
          label: t('open'),
          click: () => open(fileItem),
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
            const dest = filePaths[0] + '/' + fileItem.name
            notify(t('fileDownloading', { path: path + fileItem.name }), {
              icon: 'info',
            })
            await main.pullFile(device.id, path + fileItem.name, dest)
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
          label: t('copy'),
          click: () => stageClipboard('copy', fileItem),
        },
        {
          label: t('cut'),
          click: () => stageClipboard('cut', fileItem),
        },
      ]

      if (fileItem.directory && file.clipboard) {
        template.push({
          label: t('paste'),
          click: () => pasteFiles(path + fileItem.name + '/'),
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
              t('deleteFileConfirm', { name: fileItem.name })
            )
            if (result) {
              const filePath = path + fileItem.name
              if (fileItem.directory) {
                await main.deleteDir(device.id, filePath)
              } else {
                await main.deleteFile(device.id, filePath)
              }
              await getFiles(path)
            }
          },
        },
        {
          label: t('rename'),
          click: async () => {
            const name = await LunaModal.prompt(
              t(fileItem.directory ? 'newFolderName' : 'newFileName'),
              fileItem.name
            )
            if (name && name !== fileItem.name) {
              if (fileExist(name)) {
                notify(t('fileExistErr', { name }), { icon: 'error' })
                return
              }
              await main.moveFile(device.id, path + fileItem.name, path + name)
              await getFiles(path)
            }
          },
        }
      )
      contextMenu(e, template)
    } else {
      const template: any[] = []

      if (file.clipboard) {
        template.push({
          label: t('paste'),
          click: () => pasteFiles(path),
        })
        template.push({
          type: 'separator',
        })
      }

      template.push(
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
              await getFiles(path)
            }
          },
        },
        {
          label: t('refresh'),
          click: () => getFiles(path),
        }
      )
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
                ref={listContainerRef}
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
                    const url = await main.getFileUrl(
                      device!.id,
                      path + file.name
                    )
                    setSelectedUrl(url)
                    setSelected(file)
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
