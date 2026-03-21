import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUrlAnalysisViewModel } from '../src/renderer/main/components/webview/urlAnalysisPanel.ts'
import type { WebviewUrlBasicInfo, WebviewUrlParam } from '../src/renderer/main/components/webview/urlParser.ts'

test('builds a compact panel view model with featured and long params', () => {
  const basic: WebviewUrlBasicInfo = {
    protocol: 'http:',
    hostname: '192.168.1.163',
    port: '8080',
    origin: 'http://192.168.1.163:8080',
    pathname: '/',
    search: '',
    hash: '/customer/index?statusBarHeight=52&safeAreaBottom=32&token=very-long-token-value',
    hashPath: '/customer/index',
    hashQuery: 'statusBarHeight=52&safeAreaBottom=32&token=very-long-token-value',
  }
  const params: WebviewUrlParam[] = [
    { key: 'statusBarHeight', value: '52', source: 'hash' },
    { key: 'safeAreaBottom', value: '32', source: 'hash' },
    { key: 'env', value: 'uat', source: 'hash' },
    { key: 'token', value: 'very-long-token-value', source: 'hash' },
  ]

  const viewModel = buildUrlAnalysisViewModel(basic, params)

  assert.equal(viewModel.basicInfoCollapsedByDefault, true)
  assert.deepEqual(
    viewModel.basicInfoItems.map((item) => item.key),
    ['protocol', 'hostname', 'port', 'origin', 'hashPath']
  )
  assert.deepEqual(
    viewModel.params.map((param) => [
      param.key,
      param.emphasis,
      param.collapsible,
      param.preview,
    ]),
    [
      ['statusBarHeight', 'featured', false, '52'],
      ['safeAreaBottom', 'featured', false, '32'],
      ['env', 'featured', false, 'uat'],
      ['token', 'long', true, 'very-long-token-value'],
    ]
  )
})
