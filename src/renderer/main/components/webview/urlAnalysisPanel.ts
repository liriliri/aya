import type { WebviewUrlBasicInfo, WebviewUrlParam } from './urlParser'

export interface UrlAnalysisBasicItem {
  key: string
  value: string
}

export interface UrlAnalysisDisplayParam extends WebviewUrlParam {
  emphasis: 'featured' | 'normal' | 'long'
  collapsible: boolean
  preview: string
}

export interface UrlAnalysisViewModel {
  basicInfoCollapsedByDefault: boolean
  basicInfoItems: UrlAnalysisBasicItem[]
  params: UrlAnalysisDisplayParam[]
}

export function buildUrlAnalysisViewModel(
  basicInfo: WebviewUrlBasicInfo,
  params: WebviewUrlParam[]
): UrlAnalysisViewModel {
  const basicInfoItems = [
    { key: 'protocol', value: basicInfo.protocol },
    { key: 'hostname', value: basicInfo.hostname },
    { key: 'port', value: basicInfo.port },
    { key: 'origin', value: basicInfo.origin },
    { key: 'pathname', value: basicInfo.pathname === '/' ? '' : basicInfo.pathname },
    { key: 'hashPath', value: basicInfo.hashPath },
  ].filter((item) => item.value)

  return {
    basicInfoCollapsedByDefault: true,
    basicInfoItems,
    params: params.map((param) => ({
      ...param,
      emphasis: getParamEmphasis(param),
      collapsible: isParamCollapsible(param),
      preview: getParamPreview(param),
    })),
  }
}

function isParamCollapsible(param: WebviewUrlParam) {
  return param.key.toLowerCase() === 'token'
}

function getParamPreview(param: WebviewUrlParam) {
  if (!isParamCollapsible(param)) {
    return param.value
  }

  if (param.value.length <= 88) {
    return param.value
  }

  return `${param.value.slice(0, 88)}...`
}

function getParamEmphasis(
  param: WebviewUrlParam
): UrlAnalysisDisplayParam['emphasis'] {
  if (param.key.toLowerCase() === 'token' || param.value.length > 80) {
    return 'long'
  }

  if (param.value.length <= 24) {
    return 'featured'
  }

  return 'normal'
}
