import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWebviewUrl } from '../src/renderer/main/components/webview/urlParser.ts'

test('parses hash route params and keeps token at the end', () => {
  const parsed = parseWebviewUrl(
    'http://192.168.1.163:8080/#/customer/index?env=uat&token=very-long-token&statusBarHeight=52&safeAreaBottom=32'
  )

  assert.equal(parsed.error, '')
  assert.equal(parsed.basic.protocol, 'http:')
  assert.equal(parsed.basic.hostname, '192.168.1.163')
  assert.equal(parsed.basic.port, '8080')
  assert.equal(parsed.basic.origin, 'http://192.168.1.163:8080')
  assert.equal(parsed.basic.pathname, '/')
  assert.equal(parsed.basic.hashPath, '/customer/index')
  assert.equal(parsed.basic.hashQuery, 'env=uat&token=very-long-token&statusBarHeight=52&safeAreaBottom=32')

  assert.deepEqual(
    parsed.params.map(({ key, value }) => [key, value]),
    [
      ['env', 'uat'],
      ['statusBarHeight', '52'],
      ['safeAreaBottom', '32'],
      ['token', 'very-long-token'],
    ]
  )
})

test('reports invalid urls', () => {
  const parsed = parseWebviewUrl('http:///example.com/path')

  assert.notEqual(parsed.error, '')
  assert.equal(parsed.params.length, 0)
})

test('adds warnings for suspicious paths and empty query segments', () => {
  const parsed = parseWebviewUrl('https://example.com/foo//bar?a=1&&b=2')

  assert.equal(parsed.error, '')
  assert.equal(parsed.warnings.length, 2)
  assert.match(parsed.warnings[0], /slash/i)
  assert.match(parsed.warnings[1], /empty/i)
})
