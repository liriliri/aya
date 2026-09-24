export const MAX_LOGCAT_SEARCH_HISTORY = 20

export type LogcatSearchHistoryKey = 'package' | 'tag' | 'keyword'

export interface LogcatSearchHistory {
  package: string[]
  tag: string[]
  keyword: string[]
}

export function createEmptyLogcatSearchHistory(): LogcatSearchHistory {
  return {
    package: [],
    tag: [],
    keyword: [],
  }
}

export function normalizeLogcatSearchHistory(
  value: unknown
): LogcatSearchHistory {
  const history = createEmptyLogcatSearchHistory()
  if (!value || typeof value !== 'object') {
    return history
  }

  for (const key of Object.keys(history) as LogcatSearchHistoryKey[]) {
    const items = (value as Record<string, unknown>)[key]
    if (!Array.isArray(items)) {
      continue
    }
    history[key] = Array.from(
      new Set(
        items.filter(
          (item): item is string => typeof item === 'string' && !!item.trim()
        )
      )
    ).slice(0, MAX_LOGCAT_SEARCH_HISTORY)
  }
  return history
}

export function addLogcatSearchHistory(
  history: LogcatSearchHistory,
  key: LogcatSearchHistoryKey,
  value: string
): LogcatSearchHistory {
  const item = value.trim()
  if (!item) {
    return history
  }
  return {
    ...history,
    [key]: [item, ...history[key].filter((value) => value !== item)].slice(
      0,
      MAX_LOGCAT_SEARCH_HISTORY
    ),
  }
}

export function mergeLogcatSearchHistory(
  primary: LogcatSearchHistory,
  secondary: LogcatSearchHistory
): LogcatSearchHistory {
  return {
    package: mergeItems(primary.package, secondary.package),
    tag: mergeItems(primary.tag, secondary.tag),
    keyword: mergeItems(primary.keyword, secondary.keyword),
  }
}

function mergeItems(primary: string[], secondary: string[]) {
  return Array.from(new Set([...primary, ...secondary])).slice(
    0,
    MAX_LOGCAT_SEARCH_HISTORY
  )
}
