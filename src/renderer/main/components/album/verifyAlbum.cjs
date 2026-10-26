/* 通过 CDP 验证相册插件在应用内加载无报错且 UI 正常渲染 */
const DEBUG_URL = 'http://127.0.0.1:9229'

async function main() {
  const list = await (await fetch(`${DEBUG_URL}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) {
    throw new Error('未找到页面目标')
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  let msgId = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('异常: ' + (msg.params.exceptionDetails.text || ''))
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(
        'console.error: ' + msg.params.args.map((a) => a.value || a.description).join(' ')
      )
    }
  }

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++msgId
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.result && res.result.exceptionDetails) {
      throw new Error('evaluate 失败: ' + JSON.stringify(res.result.exceptionDetails))
    }
    return res.result ? res.result.result.value : undefined
  }

  await send('Runtime.enable')

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  await sleep(3000)

  // 1. 相册标签是否渲染
  const hasTab = await evaluate(`document.body.innerText.includes('相册')`)
  console.log(`${hasTab ? 'PASS' : 'FAIL'}: 标签栏包含「相册」`)

  // 2. 点击相册标签
  const clicked = await evaluate(`(() => {
    const els = [...document.querySelectorAll('*')].filter(el => el.childElementCount === 0 && el.textContent.trim() === '相册')
    if (!els.length) return false
    const target = els[els.length - 1]
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return true
  })()`)
  console.log(`${clicked ? 'PASS' : 'FAIL'}: 点击相册标签`)
  await sleep(5000)

  // 3. 相册面板是否渲染(扫描按钮或扫描进度文案)
  const panelText = await evaluate(`document.body.innerText`)
  const panelOk =
    panelText.includes('扫描 / 增量刷新') ||
    panelText.includes('扫描中') ||
    panelText.includes('相册插件设置') ||
    panelText.includes('个相册')
  console.log(`${panelOk ? 'PASS' : 'FAIL'}: 相册面板已渲染`)

  // 4. 面板进一步状态
  if (panelOk) {
    const scanning = panelText.includes('扫描中')
    const found = panelText.match(/发现 (\d+) 个相册/)
    console.log(`INFO: ${scanning ? '正在扫描' : '未在扫描'}${found ? `, 已发现 ${found[1]} 个相册` : ''}`)
    if (found) {
      const countOk = parseInt(found[1], 10) >= 2
      console.log(`${countOk ? 'PASS' : 'FAIL'}: 相册数量 ≥ 2(测试目录 album1/album2 应被发现)`)
    }
  }

  // 5. 加载错误汇总
  const relevant = errors.filter((e) => !e.includes('favicon'))
  console.log(
    relevant.length === 0
      ? 'PASS: 无渲染进程异常 / console.error'
      : `FAIL: ${relevant.length} 条错误:\n  ` + relevant.slice(0, 10).join('\n  ')
  )

  ws.close()
}

main().catch((err) => {
  console.error('验证脚本失败:', err.message)
  process.exit(1)
})
