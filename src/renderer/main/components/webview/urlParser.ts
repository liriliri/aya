export interface WebviewUrlBasicInfo {
  protocol: string
  hostname: string
  port: string
  origin: string
  pathname: string
  search: string
  hash: string
  hashPath: string
  hashQuery: string
}

export interface WebviewUrlParam {
  key: string
  value: string
  source: 'query' | 'hash'
}

export interface ParsedWebviewUrl {
  basic: WebviewUrlBasicInfo
  params: WebviewUrlParam[]
  warnings: string[]
  error: string
}

const emptyBasicInfo: WebviewUrlBasicInfo = {
  protocol: '',
  hostname: '',
  port: '',
  origin: '',
  pathname: '',
  search: '',
  hash: '',
  hashPath: '',
  hashQuery: '',
}

export function parseWebviewUrl(rawUrl: string): ParsedWebviewUrl {
  const trimmedUrl = rawUrl.trim()

  if (!trimmedUrl) {
    return {
      basic: emptyBasicInfo,
      params: [],
      warnings: [],
      error: 'URL is empty.',
    }
  }

  if (/^(https?|wss?):\/\/\/+/.test(trimmedUrl)) {
    return {
      basic: emptyBasicInfo,
      params: [],
      warnings: [],
      error: 'URL has too many slashes after the protocol.',
    }
  }

  try {
    const url = new URL(trimmedUrl)
    const search = trimQuestionMark(url.search)
    const hash = trimHashMark(url.hash)
    const { path: hashPath, query: hashQuery } = parseHashRoute(hash)
    const warnings = collectWarnings(url.pathname, search, hashPath, hashQuery)

    return {
      basic: {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        origin: url.origin,
        pathname: url.pathname,
        search,
        hash,
        hashPath,
        hashQuery,
      },
      params: sortParams([
        ...collectParams(url.searchParams, 'query'),
        ...collectParams(new URLSearchParams(hashQuery), 'hash'),
      ]),
      warnings,
      error: '',
    }
  } catch (error) {
    return {
      basic: emptyBasicInfo,
      params: [],
      warnings: [],
      error: error instanceof Error ? error.message : 'Invalid URL.',
    }
  }
}

function trimQuestionMark(search: string) {
  return search.startsWith('?') ? search.slice(1) : search
}

function trimHashMark(hash: string) {
  return hash.startsWith('#') ? hash.slice(1) : hash
}

function parseHashRoute(hash: string) {
  if (!hash.startsWith('/')) {
    return {
      path: '',
      query: '',
    }
  }

  const queryIndex = hash.indexOf('?')

  if (queryIndex === -1) {
    return {
      path: hash,
      query: '',
    }
  }

  return {
    path: hash.slice(0, queryIndex),
    query: hash.slice(queryIndex + 1),
  }
}

function collectParams(
  params: URLSearchParams,
  source: WebviewUrlParam['source']
): WebviewUrlParam[] {
  const result: WebviewUrlParam[] = []

  params.forEach((value, key) => {
    result.push({
      key,
      value,
      source,
    })
  })

  return result
}

function sortParams(params: WebviewUrlParam[]) {
  return params
    .map((param, index) => ({ ...param, index }))
    .sort((a, b) => {
      const groupOrder = getParamGroupOrder(a) - getParamGroupOrder(b)

      if (groupOrder !== 0) {
        return groupOrder
      }

      return a.index - b.index
    })
    .map((param) => ({
      key: param.key,
      value: param.value,
      source: param.source,
    }))
}

function getParamGroupOrder(param: WebviewUrlParam) {
  if (param.key.toLowerCase() === 'token') {
    return 2
  }

  return param.value.length > 80 ? 1 : 0
}

function collectWarnings(
  pathname: string,
  search: string,
  hashPath: string,
  hashQuery: string
) {
  const warnings: string[] = []

  if (hasRepeatedSlashes(pathname) || hasRepeatedSlashes(hashPath)) {
    warnings.push('Path contains repeated slashes.')
  }

  if (hasEmptyQuerySegments(search) || hasEmptyQuerySegments(hashQuery)) {
    warnings.push('Query contains empty parameter segments.')
  }

  return warnings
}

function hasRepeatedSlashes(path: string) {
  return /\/{2,}/.test(path)
}

function hasEmptyQuerySegments(query: string) {
  if (!query) {
    return false
  }

  return query.startsWith('&') || query.endsWith('&') || query.includes('&&')
}
