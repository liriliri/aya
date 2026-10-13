import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarHtml,
  LunaToolbarInput,
  LunaToolbarSeparator,
} from 'luna-toolbar/react'
import LunaFileList from 'luna-file-list/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { useEffect, useState } from 'react'
import Style from './Xspace.module.scss'
import store from '../../store'
import { t } from 'common/util'
import { notify } from 'share/renderer/lib/util'
import { IFile } from 'luna-file-list'
import LunaPathBar from 'luna-path-bar/react'
import LunaSplitPane, { LunaSplitPaneItem } from 'luna-split-pane/react'
import FilePreview from 'share/renderer/components/FilePreview'
import startWith from 'licia/startWith'
import contextMenu from 'share/renderer/lib/contextMenu'
import LunaModal from 'luna-modal'

export default observer(function Xspace() {
  const [fileList, setFileList] = useState<IFile[]>([])
  const [root, setRoot] = useState('')
  const [path, setPath] = useState('')
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [selected, setSelected] = useState<IFile>()
  const [selectedUrl, setSelectedUrl] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [weights, setWeights] = useState([70, 30])
  const [clip, setClip] = useState<ClipboardItem | null>(null)

  const { device } = store

  useEffect(() => {
    if (device) {
      void enter('')
    }
  }, [])

  async function load(target: string) {
    if (!device) {
      return null
    }
    try {
      const result = await main.xspaceList(device.id, target)
      setRoot(result.root)
      setPath(result.path)
      setFileList(result.entries)
      setFilter('')
      setMessage('')
      setSelected(undefined)
      setSelectedUrl('')
      return result
    } catch (err) {
      setMessage(explain(err))
      return null
    }
  }

  async function enter(target: string) {
    const result = await load(target)
    if (!result) {
      return
    }
    setHistory((prev) => [...prev.slice(0, historyIdx + 1), result.path])
    setHistoryIdx(historyIdx + 1)
  }

  async function back() {
    if (historyIdx <= 0) {
      return
    }
    const result = await load(history[historyIdx - 1])
    if (result) {
      setHistoryIdx(historyIdx - 1)
    }
  }

  async function forward() {
    if (historyIdx >= history.length - 1) {
      return
    }
    const result = await load(history[historyIdx + 1])
    if (result) {
      setHistoryIdx(historyIdx + 1)
    }
  }

  function parentOf(current: string) {
    if (!root || current === root || !current.startsWith(root + '/')) {
      return root
    }
    const parent = current.slice(0, current.lastIndexOf('/'))
    return parent.length < root.length ? root : parent
  }

  function resolve(input: string) {
    const text = input.trim()
    if (!root) {
      return ''
    }
    if (!text) {
      return root
    }
    let next = text.startsWith('/') ? text : `${root}/${text.replace(/^\/+/, '')}`
    next = next.replace(/\/+$/, '')
    if (next !== root && !next.startsWith(`${root}/`)) {
      return ''
    }
    if (next.includes('/../') || next.endsWith('/..')) {
      return ''
    }
    return next
  }

  async function fileUrl(file: IFile) {
    if (!device) {
      return ''
    }
    return main.xspaceFileUrl(device.id, `${path}/${file.name}`)
  }

  async function open(file: IFile) {
    if (!device) {
      return
    }
    if (file.directory) {
      await enter(`${path}/${file.name}`)
      return
    }
    const url = await fileUrl(file)
    if (file.mime === 'application/pdf') {
      main.openWindow(url, 'pdf', {
        minHeight: 640,
        minWidth: 450,
        width: 450,
        height: 640,
      })
    } else if (file.mime && startWith(file.mime, 'video')) {
      main.showVideo(url)
    }
  }

  function fileExist(name: string) {
    return fileList.some((item) => item.name === name)
  }

  function uniqueName(name: string) {
    if (!fileExist(name)) {
      return name
    }
    const dot = name.lastIndexOf('.')
    const base = dot > 0 ? name.slice(0, dot) : name
    const ext = dot > 0 ? name.slice(dot) : ''
    for (let i = 1; i < 100; i++) {
      const candidate = i === 1 ? `${base} 副本${ext}` : `${base} 副本 ${i}${ext}`
      if (!fileExist(candidate)) {
        return candidate
      }
    }
    return ''
  }

  async function runEdit(op: string, source: string, dest = '') {
    if (!device) {
      return false
    }
    try {
      await main.xspaceEdit(device.id, op, source, dest)
      return true
    } catch (err) {
      notify(explain(err), { icon: 'error' })
      return false
    }
  }

  async function pasteInto(dir: string) {
    if (!clip) {
      return
    }
    let name = clip.name
    if (clip.op === 'move' && `${dir}/${name}` === clip.path) {
      setClip(null)
      return
    }
    if (dir === path) {
      if (clip.op === 'copy' || name !== clip.name) {
        const next = uniqueName(clip.op === 'move' ? clip.name : name)
        if (!next) {
          notify(t('fileExistErr', { name }), { icon: 'error' })
          return
        }
        name = clip.op === 'move' && !fileExist(clip.name) ? clip.name : next
      }
    }
    const ok = await runEdit(clip.op, clip.path, `${dir}/${name}`)
    if (!ok) {
      return
    }
    if (clip.op === 'move') {
      setClip(null)
    }
    await load(path)
    notify(t('xspaceDone'), { icon: 'success' })
  }

  async function transferTo(file: IFile, op: 'copy' | 'move') {
    const input = await LunaModal.prompt(
      t(op === 'move' ? 'xspaceMoveTo' : 'xspaceCopyTo')
    )
    if (!input) {
      return
    }
    const dir = resolve(input)
    if (!dir) {
      notify(t('xspaceOutside'), { icon: 'error' })
      return
    }
    const ok = await runEdit(op, `${path}/${file.name}`, `${dir}/${file.name}`)
    if (!ok) {
      return
    }
    if (op === 'move' && clip?.path === `${path}/${file.name}`) {
      setClip(null)
    }
    await load(path)
    notify(t('xspaceDone'), { icon: 'success' })
  }

  async function remove(file: IFile) {
    const confirmed = await LunaModal.confirm(
      t('deleteFileConfirm', { name: file.name })
    )
    if (!confirmed) {
      return
    }
    const source = `${path}/${file.name}`
    const ok = await runEdit('delete', source)
    if (!ok) {
      return
    }
    if (clip?.path === source) {
      setClip(null)
    }
    await load(path)
  }

  async function rename(file: IFile) {
    const name = await LunaModal.prompt(
      t(file.directory ? 'newFolderName' : 'newFileName'),
      file.name
    )
    if (!name || name === file.name) {
      return
    }
    if (fileExist(name)) {
      notify(t('fileExistErr', { name }), { icon: 'error' })
      return
    }
    const ok = await runEdit('move', `${path}/${file.name}`, `${path}/${name}`)
    if (ok) {
      await load(path)
    }
  }

  async function createFolder() {
    const name = await LunaModal.prompt(t('newFolderName'))
    if (!name) {
      return
    }
    if (fileExist(name)) {
      notify(t('fileExistErr', { name }), { icon: 'error' })
      return
    }
    const ok = await runEdit('mkdir', `${path}/${name}`)
    if (ok) {
      await load(path)
    }
  }

  function onContextMenu(e: MouseEvent, file?: IFile) {
    if (!device || !path) {
      return
    }
    if (file) {
      const source = `${path}/${file.name}`
      contextMenu(e, [
        { label: t('open'), click: () => open(file) },
        { type: 'separator' },
        {
          label: t('copy'),
          click: () =>
            setClip({ op: 'copy', path: source, name: file.name }),
        },
        {
          label: t('copyTo'),
          click: () => transferTo(file, 'copy'),
        },
        {
          label: t('cut'),
          click: () =>
            setClip({ op: 'move', path: source, name: file.name }),
        },
        {
          label: t('moveTo'),
          click: () => transferTo(file, 'move'),
        },
        {
          label: t('paste'),
          enabled: !!clip && !!file.directory,
          click: () => pasteInto(`${path}/${file.name}`),
        },
        { type: 'separator' },
        { label: t('delete'), click: () => remove(file) },
        { label: t('rename'), click: () => rename(file) },
      ])
      return
    }
    contextMenu(e, [
      {
        label: t('paste'),
        enabled: !!clip,
        click: () => pasteInto(path),
      },
      { label: t('newFolder'), click: () => createFolder() },
      { label: t('refresh'), click: () => load(path) },
    ])
  }

  async function goRelative(input: string) {
    const next = resolve(input)
    if (!next) {
      notify(t('xspaceOutside'), { icon: 'error' })
      return
    }
    if (next === path) {
      return
    }
    await enter(next)
  }

  const relative = root && path.startsWith(root) ? path.slice(root.length) : path

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="arrow-left"
          title={t('back')}
          onClick={back}
          disabled={historyIdx <= 0 || !device}
        />
        <ToolbarIcon
          icon="arrow-right"
          title={t('forward')}
          onClick={forward}
          disabled={historyIdx >= history.length - 1 || !device}
        />
        <ToolbarIcon
          icon="arrow-up"
          title={t('up')}
          onClick={() => enter(parentOf(path))}
          disabled={!device || !path || path === root}
        />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={() => load(path)}
          disabled={!device}
        />
        <LunaToolbarHtml className={Style.pathContainer} disabled={!device}>
          <LunaPathBar
            className={Style.path}
            rootLabel={t('xspace')}
            path={relative}
            onChange={(value) => goRelative(value)}
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
          icon="eye"
          title={t('preview')}
          state={showPreview ? 'hover' : ''}
          onClick={() => setShowPreview(!showPreview)}
        />
      </LunaToolbar>
      <LunaSplitPane onResize={(next) => setWeights(next)}>
        <LunaSplitPaneItem minSize={400} weight={weights[0]}>
          <div className="panel-body">
            {message ? (
              <div className={Style.message}>{message}</div>
            ) : (
              <LunaFileList
                className={Style.fileList}
                files={fileList}
                filter={filter}
                columns={['name', 'mtime', 'type', 'size']}
                listView={true}
                onDoubleClick={(e: MouseEvent, file: IFile) => open(file)}
                onContextMenu={onContextMenu}
                onSelect={async (file: IFile) => {
                  setSelected(file)
                  if (file.directory) {
                    setSelectedUrl('')
                    return
                  }
                  setSelectedUrl(await fileUrl(file))
                }}
                onDeselect={() => {
                  setSelected(undefined)
                  setSelectedUrl('')
                }}
              />
            )}
          </div>
        </LunaSplitPaneItem>
        <LunaSplitPaneItem
          minSize={180}
          weight={weights[1]}
          visible={showPreview}
        >
          <FilePreview file={showPreview ? selected : undefined} url={selectedUrl} />
        </LunaSplitPaneItem>
      </LunaSplitPane>
    </div>
  )
})

interface ClipboardItem {
  op: 'copy' | 'move'
  path: string
  name: string
}

function explain(err: unknown) {
  const code = err instanceof Error ? err.message : String(err)
  if (code.includes('helper_missing')) {
    return t('xspaceMissing')
  }
  if (code.includes('helper_token_missing') || code.includes('helper_offline')) {
    return t('xspaceOffline')
  }
  if (code.includes('privacy_volume_hidden') || code.includes('still_on_owner')) {
    return t('xspaceHidden')
  }
  if (code.includes('outside')) {
    return t('xspaceOutside')
  }
  if (code.includes('is_root') || code.includes('into_self')) {
    return t('xspaceEditErr')
  }
  if (code.includes('exists')) {
    return t('fileExistErr', { name: '' })
  }
  if (
    code.includes('delete_failed') ||
    code.includes('copy_failed') ||
    code.includes('mkdir_failed') ||
    code.includes('edit_failed')
  ) {
    return t('xspaceEditErr')
  }
  return t('xspaceReadErr')
}
