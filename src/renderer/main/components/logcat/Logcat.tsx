import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarHtml,
  LunaToolbarSelect,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import LunaLogcat from 'luna-logcat/react'
import Logcat from 'luna-logcat'
import map from 'licia/map'
import rpad from 'licia/rpad'
import dateFormat from 'licia/dateFormat'
import toNum from 'licia/toNum'
import trim from 'licia/trim'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import store from '../../store'
import copy from 'licia/copy'
import download from 'licia/download'
import toStr from 'licia/toStr'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import contextMenu from 'share/renderer/lib/contextMenu'
import {
  createLogcatSearch,
  getLogcatSearchEntries,
  matchesLogcatSearch,
} from './search'
import type { LogcatSearchExpression } from './search'
import { highlightLogcat } from './highlight'
import HistoryInput from './HistoryInput'
import {
  addLogcatSearchHistory,
  createEmptyLogcatSearchHistory,
  LogcatSearchHistoryKey,
  mergeLogcatSearchHistory,
  normalizeLogcatSearchHistory,
} from './history'
import Style from './Logcat.module.scss'

const MAX_LOG_ENTRIES = 10000
const LOGCAT_SEARCH_HISTORY_STORE = 'logcatSearchHistory'

type LogcatEntry = Parameters<Logcat['append']>[0]

interface LogcatFilter {
  priority?: number
  package?: string
  tag?: string
}

interface LogcatRenderedEntry extends LogcatEntry {
  container: HTMLElement & { virtualListItem?: LogcatVirtualListItem }
}

interface LogcatVirtualListItem {
  el: HTMLElement
}

interface LogcatVirtualList {
  items: LogcatVirtualListItem[]
  displayItems: LogcatVirtualListItem[]
  render: () => void
}

interface LogcatInternals {
  entries: LogcatRenderedEntry[]
  displayEntries: LogcatRenderedEntry[]
  virtualList: LogcatVirtualList
}

export default observer(function Logcat() {
  const [view, setView] = useState<'compact' | 'standard'>('standard')
  const [softWrap, setSoftWrap] = useState(false)
  const [paused, setPaused] = useState(false)
  const [query, setQuery] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [matchCase, setMatchCase] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState(
    createEmptyLogcatSearchHistory
  )
  const [searchHistoryLoaded, setSearchHistoryLoaded] = useState(false)
  const search = useMemo(
    () => createLogcatSearch(searchQuery, useRegex, matchCase),
    [searchQuery, useRegex, matchCase]
  )
  const searchRef = useRef(search.expression)
  const searchErrorId = useId()
  const [filter, setFilter] = useState<LogcatFilter>({})
  const logcatRef = useRef<Logcat>(null)
  const entriesRef = useRef<LogcatEntry[]>([])
  const filterRef = useRef(filter)
  const highlightedSearchRef = useRef<{
    logcat: Logcat
    expression: LogcatSearchExpression | null
    filter: LogcatFilter
    stop: () => void
  } | null>(null)
  const logcatIdRef = useRef('')

  const { device } = store

  useEffect(() => {
    let active = true
    main.getMainStore(LOGCAT_SEARCH_HISTORY_STORE).then((value) => {
      if (active) {
        const stored = normalizeLogcatSearchHistory(value)
        setSearchHistory((current) =>
          mergeLogcatSearchHistory(current, stored)
        )
        setSearchHistoryLoaded(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (searchHistoryLoaded) {
      main.setMainStore(LOGCAT_SEARCH_HISTORY_STORE, searchHistory)
    }
  }, [searchHistory, searchHistoryLoaded])

  useEffect(() => {
    // Avoid rebuilding a large log buffer for every keystroke.
    if (!query) {
      setSearchQuery('')
      return
    }
    const timer = setTimeout(() => setSearchQuery(query), 150)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    searchRef.current = search.expression
    filterRef.current = filter
    if (logcatRef.current) {
      applyLogcatSearch(logcatRef.current, search.expression, filter)
    }
  }, [search.expression, filter])

  useEffect(() => {
    function onLogcatEntry(id, entry) {
      if (logcatIdRef.current !== id) {
        return
      }
      if (logcatRef.current) {
        entriesRef.current.push(entry)
        appendLogcatEntry(
          logcatRef.current,
          entry,
          searchRef.current,
          filterRef.current
        )
      }
    }
    const offLogcatEntry = main.on('logcatEntry', onLogcatEntry)
    if (device) {
      main.openLogcat(device.id).then((id) => {
        logcatIdRef.current = id
      })
    }

    return () => {
      offLogcatEntry()
      if (logcatIdRef.current) {
        main.closeLogcat(logcatIdRef.current)
      }
    }
  }, [])

  if (store.panel !== 'logcat') {
    if (!paused && logcatIdRef.current) {
      main.pauseLogcat(logcatIdRef.current)
    }
  } else {
    if (!paused && logcatIdRef.current) {
      main.resumeLogcat(logcatIdRef.current)
    }
  }

  function save() {
    const data = map(entriesRef.current, (entry) => {
      return trim(
        `${dateFormat(new Date(entry.date), 'mm-dd HH:MM:ss.l')} ${rpad(
          toStr(entry.pid),
          5,
          ' '
        )} ${rpad(toStr(entry.tid), 5, ' ')} ${toLetter(
          entry.priority
        )} ${entry.tag}: ${entry.message}`
      )
    }).join('\n')
    const name = `${store.device ? store.device.name : 'logcat'}.${dateFormat(
      'yyyymmddHH'
    )}.txt`

    download(data, name, 'text/plain')
  }

  function clear() {
    if (logcatRef.current) {
      logcatRef.current.clear()
      // Luna's clear() leaves its displayed-entry cache intact.
      getLogcatInternals(logcatRef.current).displayEntries = []
    }
    entriesRef.current = []
  }

  function appendLogcatEntry(
    logcat: Logcat,
    entry: LogcatEntry,
    expression: LogcatSearchExpression | null,
    activeFilter: LogcatFilter
  ) {
    const internals = getLogcatInternals(logcat)
    const { virtualList } = internals
    const render = virtualList.render
    const previousEntryCount = internals.entries.length
    virtualList.render = () => {}
    try {
      logcat.append(entry)
    } finally {
      virtualList.render = render
    }

    const appended = internals.entries[internals.entries.length - 1]
    const visible = internals.displayEntries.at(-1) === appended
    const shouldDisplay = matchesLogcatEntry(
      appended,
      expression,
      activeFilter
    )
    if (visible && !shouldDisplay) {
      internals.displayEntries.pop()
      const item = appended.container.virtualListItem
      if (item && virtualList.items.at(-1) === item) {
        virtualList.items.pop()
      }
    }

    const entriesWereTrimmed =
      internals.entries.length < previousEntryCount + 1
    if (shouldDisplay || entriesWereTrimmed) {
      render()
    }
  }

  function applyLogcatSearch(
    logcat: Logcat,
    expression: LogcatSearchExpression | null,
    activeFilter: LogcatFilter
  ) {
    const highlightedSearch = highlightedSearchRef.current
    if (
      highlightedSearch?.logcat === logcat &&
      highlightedSearch.expression === expression &&
      sameLogcatFilter(highlightedSearch.filter, activeFilter)
    ) {
      return
    }

    let stop = highlightedSearch?.stop || (() => {})
    if (
      highlightedSearch?.logcat !== logcat ||
      highlightedSearch.expression !== expression
    ) {
      stop()
      stop = highlightLogcat(logcat.container, expression)
    }
    highlightedSearchRef.current = {
      logcat,
      expression,
      filter: { ...activeFilter },
      stop,
    }

    const internals = getLogcatInternals(logcat)
    internals.displayEntries = getLogcatSearchEntries(
      internals.entries,
      expression,
      MAX_LOG_ENTRIES
    ).filter((entry) => matchesLogcatEntry(entry, null, activeFilter))
    // Luna has no message-filter API. Reuse its already measured virtual-list
    // items so changing a query does not recreate thousands of DOM rows.
    const items = internals.displayEntries.flatMap(
      (entry) =>
        entry.container.virtualListItem
          ? [entry.container.virtualListItem]
          : []
    )
    if (!sameLogcatItems(internals.virtualList.items, items)) {
      internals.virtualList.items = items
      internals.virtualList.displayItems = []
      internals.virtualList.render()
    }
  }

  function commitHistory(key: LogcatSearchHistoryKey, value: string) {
    if (key === 'keyword' && createLogcatSearch(value, useRegex).error) {
      return
    }
    setSearchHistory((history) => addLogcatSearchHistory(history, key, value))
  }

  function deleteHistory(key: LogcatSearchHistoryKey, value: string) {
    setSearchHistory((history) => ({
      ...history,
      [key]: history[key].filter((item) => item !== value),
    }))
  }

  function clearHistory(key: LogcatSearchHistoryKey) {
    setSearchHistory((history) => ({ ...history, [key]: [] }))
  }

  const onContextMenu = (e: PointerEvent, entry: any) => {
    e.preventDefault()
    const logcat = logcatRef.current!
    const template: any[] = [
      {
        label: t('copy'),
        click: () => {
          if (logcat.hasSelection()) {
            copy(logcat.getSelection())
          } else if (entry) {
            copy(entry.message)
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('clear'),
        click: clear,
      },
    ]

    contextMenu(e, template)
  }

  return (
    <div className={Style.container}>
      <LunaToolbar
        className={Style.toolbar}
        onChange={(key, val) => {
          switch (key) {
            case 'view':
              setView(val)
              break
            case 'priority':
              setFilter({
                ...filter,
                priority: toNum(val),
              })
              break
            case 'package':
              setFilter({
                ...filter,
                package: val,
              })
              break
            case 'tag':
              setFilter({
                ...filter,
                tag: val,
              })
              break
          }
        }}
      >
        <LunaToolbarSelect
          keyName="view"
          disabled={!device}
          value={view}
          options={{
            [t('standardView')]: 'standard',
            [t('compactView')]: 'compact',
          }}
        />
        <LunaToolbarSeparator />
        <LunaToolbarSelect
          keyName="priority"
          disabled={!device}
          value={toStr(filter.priority || 2)}
          options={{
            VERBOSE: '2',
            DEBUG: '3',
            INFO: '4',
            WARNING: '5',
            ERROR: '6',
          }}
        />
        <LunaToolbarHtml className={Style.historyField}>
          <HistoryInput
            value={filter.package || ''}
            history={searchHistory.package}
            placeholder={t('package')}
            onChange={(value) => setFilter({ ...filter, package: value })}
            onCommit={(value) => commitHistory('package', value)}
            onDelete={(value) => deleteHistory('package', value)}
            onClear={() => clearHistory('package')}
          />
        </LunaToolbarHtml>
        <LunaToolbarHtml className={Style.historyField}>
          <HistoryInput
            value={filter.tag || ''}
            history={searchHistory.tag}
            placeholder={t('tag')}
            onChange={(value) => setFilter({ ...filter, tag: value })}
            onCommit={(value) => commitHistory('tag', value)}
            onDelete={(value) => deleteHistory('tag', value)}
            onClear={() => clearHistory('tag')}
          />
        </LunaToolbarHtml>
        <LunaToolbarHtml className={Style.search}>
          <HistoryInput
            type="search"
            className={Style.keywordHistoryInput}
            placeholder={t('searchLogMessages')}
            ariaLabel={t('searchLogMessages')}
            invalid={search.error}
            describedBy={search.error ? searchErrorId : undefined}
            maxLength={1000}
            value={query}
            history={searchHistory.keyword}
            onChange={setQuery}
            onCommit={(value) => commitHistory('keyword', value)}
            onDelete={(value) => deleteHistory('keyword', value)}
            onClear={() => clearHistory('keyword')}
            onEscape={() => setQuery('')}
          />
          <button
            type="button"
            className={Style.searchButton}
            title={t('useRegularExpression')}
            aria-label={t('useRegularExpression')}
            aria-pressed={useRegex}
            onClick={() => setUseRegex(!useRegex)}
          >
            .*
          </button>
          <button
            type="button"
            className={Style.searchButton}
            title={t('matchCase')}
            aria-label={t('matchCase')}
            aria-pressed={matchCase}
            onClick={() => setMatchCase(!matchCase)}
          >
            Aa
          </button>
        </LunaToolbarHtml>
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="save"
          title={t('save')}
          onClick={save}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="soft-wrap"
          state={softWrap ? 'hover' : ''}
          title={t('softWrap')}
          onClick={() => setSoftWrap(!softWrap)}
        />
        <ToolbarIcon
          icon="scroll-end"
          title={t('scrollToEnd')}
          onClick={() => logcatRef.current?.scrollToEnd()}
          disabled={!device}
        />
        <ToolbarIcon
          icon="reset"
          title={t('restart')}
          onClick={() => {
            if (logcatIdRef.current) {
              main.closeLogcat(logcatIdRef.current)
              clear()
            }
            if (device) {
              main.openLogcat(device.id).then((id) => {
                logcatIdRef.current = id
              })
            }
          }}
          disabled={!device}
        />
        <ToolbarIcon
          icon={paused ? 'play' : 'pause'}
          title={t(paused ? 'resume' : 'pause')}
          onClick={() => {
            if (paused) {
              main.resumeLogcat(logcatIdRef.current)
            } else {
              main.pauseLogcat(logcatIdRef.current)
            }
            setPaused(!paused)
          }}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="delete"
          title={t('clear')}
          onClick={clear}
          disabled={!device}
        />
      </LunaToolbar>
      {search.error && (
        <div className={Style.searchError} id={searchErrorId} role="status">
          {t('invalidLogSearchRegex')}
        </div>
      )}
      <LunaLogcat
        className={Style.body}
        maxNum={MAX_LOG_ENTRIES}
        wrapLongLines={softWrap}
        onContextMenu={onContextMenu}
        view={view}
        onCreate={(logcat) => {
          logcatRef.current = logcat
          applyLogcatSearch(logcat, search.expression, filter)
          logcat.on('destroy', () => {
            if (highlightedSearchRef.current?.logcat === logcat) {
              highlightedSearchRef.current.stop()
              highlightedSearchRef.current = null
            }
            if (logcatRef.current === logcat) {
              logcatRef.current = null
            }
          })
        }}
      />
    </div>
  )
})

function toLetter(priority: number) {
  return ['?', '?', 'V', 'D', 'I', 'W', 'E'][priority]
}

function getLogcatInternals(logcat: Logcat) {
  return logcat as unknown as LogcatInternals
}

function matchesLogcatEntry(
  entry: LogcatEntry,
  expression: LogcatSearchExpression | null,
  filter: LogcatFilter
) {
  if (filter.priority && entry.priority < filter.priority) {
    return false
  }
  const packageName = trim(filter.package || '').toLowerCase()
  if (packageName && !entry.package.toLowerCase().includes(packageName)) {
    return false
  }
  const tag = trim(filter.tag || '').toLowerCase()
  if (tag && !entry.tag.toLowerCase().includes(tag)) {
    return false
  }
  return matchesLogcatSearch(entry.message, expression)
}

function sameLogcatFilter(a: LogcatFilter, b: LogcatFilter) {
  return (
    a.priority === b.priority && a.package === b.package && a.tag === b.tag
  )
}

function sameLogcatItems(
  a: LogcatVirtualListItem[],
  b: LogcatVirtualListItem[]
) {
  return a.length === b.length && a.every((item, index) => item === b[index])
}
