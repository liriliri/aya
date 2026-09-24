import { RE2JS } from 're2js'

const MAX_REGEX_LENGTH = 1000

export type LogcatSearchExpression = RE2JS

export function createLogcatSearch(
  query: string,
  useRegex = false,
  matchCase = false
): { expression: LogcatSearchExpression | null; error: boolean } {
  if (!query) {
    return { expression: null, error: false }
  }

  try {
    const source = useRegex
      ? query
      : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (useRegex && query.length > MAX_REGEX_LENGTH) {
      return { expression: null, error: true }
    }
    return {
      expression: RE2JS.compile(
        source,
        matchCase ? 0 : RE2JS.CASE_INSENSITIVE
      ),
      error: false,
    }
  } catch {
    return { expression: null, error: true }
  }
}

export function matchesLogcatSearch(
  message: string,
  expression: LogcatSearchExpression | null
) {
  return !expression || expression.test(message.trim())
}

export function getLogcatMatchRanges(
  message: string,
  expression: LogcatSearchExpression | null
): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  if (expression) {
    for (const match of expression.matchAll(message)) {
      if (match[0].length) {
        ranges.push([match.index!, match.index! + match[0].length])
      }
    }
  }
  return ranges
}

export function getLogcatSearchEntries<T extends { message: string }>(
  entries: T[],
  expression: LogcatSearchExpression | null,
  maxNum: number
): T[] {
  if (!expression) {
    return entries.slice(-maxNum)
  }

  const matches: T[] = []
  const start = Math.max(0, entries.length - maxNum)
  for (let i = entries.length - 1; i >= start; i--) {
    if (matchesLogcatSearch(entries[i].message, expression)) {
      matches.push(entries[i])
    }
  }
  return matches.reverse()
}
