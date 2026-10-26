/* CDP 验证隐私空间相册:数据源切换、根目录探测、扫描浏览、缩略图、选择、复制/粘贴/删除(自清理)。
   前提:启动 AYA 时加 --remote-debugging-port=9229,设备已连接。
   助手未安装/未运行时仅验证错误提示并整体 SKIP(环境问题不算失败)。 */
const DEBUG_URL = 'http://127.0.0.1:9229'

let ws,
  msgId = 0
const pending = new Map()
const errors = []
let passed = 0,
  failed = 0,
  skipped = 0

function ok(cond, msg) {
  if (cond) {
    passed++
    console.log('PASS: ' + msg)
  } else {
    failed++
    console.error('FAIL: ' + msg)
  }
}

function skip(msg) {
  skipped++
  console.log('SKIP: ' + msg)
}

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (r.result && r.result.exceptionDetails) {
    throw new Error(
      'evaluate 失败: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)
    )
  }
  return r.result ? r.result.result.value : undefined
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HELPERS = `
  window.__activePanel = () => {
    // AYA 的面板一旦访问过就常驻挂载(隐藏时透明度 0),必须限定在激活面板内查找元素
    const panels = [...document.querySelectorAll('[class*=panels] > [class*=panel]')]
    return panels.find((el) => el.style.opacity !== '0') || document.body
  }
  window.__click = (el) => {
    if (!el) return false
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return true
  }
  window.__btnByText = (text, exact = true) =>
    [...window.__activePanel().querySelectorAll('button')].filter((b) =>
      exact ? b.textContent.trim() === text : b.textContent.includes(text)
    ).pop() || null
  window.__key = (key, modifiers = {}) => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })
    )
  }
  window.__thumbs = () => [...window.__activePanel().querySelectorAll('[class*=cell] [class*=thumb]')]
`

const meta = (text) => {
  const m = (text || '').match(/共 (\d+) 张(?:,已选 (\d+) 张)?/)
  return m ? { total: +m[1], selected: +(m[2] || 0) } : null
}

async function state() {
  const text = await evaluate(
    'window.__activePanel ? window.__activePanel().innerText : document.body.innerText'
  )
  return { text, m: meta(text) }
}

async function waitScanEnd(timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { text } = await state()
    if (!text.includes('扫描中')) {
      return text
    }
    await sleep(2000)
  }
  return (await state()).text
}

async function enterAlbum(cardText) {
  await evaluate(`__click(__btnByText('返回相册列表', false))`)
  await sleep(1200)
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await evaluate(`(() => {
      const cards = [...window.__activePanel().querySelectorAll('[class*=albumCard]')].filter(el =>
        el.textContent.includes(${JSON.stringify(cardText)})
      )
      if (!cards.length) return 'notfound'
      cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      return 'ok'
    })()`)
    await sleep(4000)
    const inView = await evaluate(`window.__activePanel().innerText.includes('返回相册列表')`)
    if (r === 'ok' && inView) {
      return 'ok'
    }
  }
  return 'failed'
}

async function confirmDeleteModal() {
  return evaluate(`(() => {
    const modals = [...window.__activePanel().querySelectorAll('[class*=modalMask]')]
    const modal = modals[modals.length - 1]
    if (!modal) return false
    const btn = [...modal.querySelectorAll('button')].find((b) => b.textContent.trim() === '删除')
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  })()`)
}

function expectedCopyName(sourceName, existingNames) {
  if (!existingNames.includes(sourceName)) {
    return sourceName
  }
  const dot = sourceName.lastIndexOf('.')
  const stem = dot > 0 ? sourceName.slice(0, dot) : sourceName
  const ext = dot > 0 ? sourceName.slice(dot) : ''
  let i = 2
  while (existingNames.includes(`${stem} (${i})${ext}`)) {
    i++
  }
  return `${stem} (${i})${ext}`
}

async function main() {
  const list = await (await fetch(DEBUG_URL + '/json/list')).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) {
    throw new Error('未找到页面目标')
  }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    } else if (m.method === 'Runtime.exceptionThrown') {
      errors.push('异常: ' + (m.params.exceptionDetails.text || ''))
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(
        'console.error: ' +
          m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200)
      )
    }
  }
  await send('Runtime.enable')
  await evaluate(HELPERS)
  await sleep(2000)

  // 1. 切到相册面板(若上次停在相册内部视图,先返回列表)
  await evaluate(`(() => {
    const els = [...document.querySelectorAll('*')].filter(
      el => el.childElementCount === 0 && el.textContent.trim() === '相册'
    )
    els[els.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  await sleep(1500)
  await evaluate(`__click(__btnByText('返回相册列表', false))`)
  await sleep(1500)
  let st = await state()
  ok(
    st.text.includes('主空间') && st.text.includes('隐私空间'),
    '相册面板渲染且包含数据源切换按钮'
  )

  // 2. 切换到隐私空间(应用工具栏可能也有同名按钮,面板按钮在 DOM 靠后,取最后一个)
  const switched = await evaluate(`__click(__btnByText('隐私空间'))`)
  ok(switched, '点击「隐私空间」切换按钮')

  // 3. 等待探测/扫描结果:助手不可用应出现红色横幅提示
  await sleep(6000)
  let text = await waitScanEnd(180000)
  const helperDown =
    text.includes('隐私空间助手') &&
    (text.includes('还没有安装') || text.includes('没有在运行') || text.includes('令牌'))
  if (helperDown) {
    ok(true, '助手不可用时展示中文提示横幅(未静默显示「没有发现相册」)')
    const noMislead = !text.includes('可尝试降低阈值')
    ok(noMislead, '助手不可用时不再显示误导性的「没有发现相册」空态文案')
    const relevant = errors.filter((e) => !e.includes('favicon'))
    ok(
      relevant.length === 0,
      relevant.length === 0
        ? '无渲染进程异常'
        : '有错误: ' + relevant.slice(0, 5).join(' | ')
    )
    skip('助手未安装/未运行,隐私空间浏览与编辑流程未验证')
    console.log(`\n结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过`)
    ws.close()
    process.exit(failed === 0 ? 0 : 1)
  }

  // 4. 助手在线:主动触发一次增量扫描,覆盖在线扫描路径
  const scanned = await evaluate(`__click(__btnByText('扫描', false))`)
  if (scanned) {
    text = await waitScanEnd(180000)
  } else {
    skip('未找到「扫描 / 增量刷新」按钮,跳过在线增量扫描')
  }

  // 5. 核对扫描根目录:首次进入时自动探测的卷根(应非主空间默认 /sdcard)
  const opened = await evaluate(`__click(__btnByText('设置'))`)
  await sleep(600)
  const scanRoot = opened
    ? await evaluate(`(() => {
        // 注意 [class*=modal] 会同时命中 modalTitle/modalActions 等子元素,必须定位 modalMask 容器
        const modal = window.__activePanel().querySelector('[class*=modalMask]')
        if (!modal) return ''
        const input = [...modal.querySelectorAll('input')].find(i => (i.value || '').startsWith('/'))
        return input ? input.value : ''
      })()`)
    : ''
  await evaluate(`__click([...window.__activePanel().querySelectorAll('[class*=modalMask] button')].find(b => b.textContent.trim() === '取消') || null)`)
  await sleep(400)
  if (scanRoot) {
    ok(
      scanRoot !== '/sdcard' && /^\/storage\/emulated\/\d+/.test(scanRoot),
      `扫描根已自动探测为隐私空间卷(${scanRoot})`
    )
  } else {
    skip('未能读取设置中的扫描根目录(可能非首次使用,已有配置)')
  }

  // 6. 相册发现
  const found = text.match(/发现 (\d+) 个相册/)
  if (!found) {
    skip('隐私空间未发现相册(空间内可能确实没有成册目录),浏览/编辑流程跳过')
    finish()
    return
  }
  const albumCount = parseInt(found[1], 10)
  ok(albumCount >= 1, `隐私空间发现 ${albumCount} 个相册`)

  // 7. 进入第一个相册:浏览与缩略图
  const firstCard = await evaluate(`(() => {
    const cards = [...window.__activePanel().querySelectorAll('[class*=albumCard]')]
    if (!cards.length) return null
    const name = cards[0].querySelector('[class*=cardPath]')
    return name ? name.textContent : null
  })()`)
  ok(await enterAlbum(firstCard || ''), `进入相册 ${firstCard}`)
  st = await state()
  ok(!!st.m && st.m.total >= 1, `相册内图片列表加载(共 ${st.m && st.m.total} 张)`)

  let thumbOk = false
  for (let i = 0; i < 15 && !thumbOk; i++) {
    await sleep(2000)
    thumbOk =
      (await evaluate(
        `window.__activePanel().querySelectorAll('[class*=thumbImg]').length`
      )) >= 1
  }
  ok(thumbOk, '缩略图渲染(经助手 /v1/raw 拉取原图并降采样)')

  // 7. 选择与快捷键
  await evaluate(`__click(__thumbs()[0])`)
  await sleep(300)
  st = await state()
  ok(st.m && st.m.selected === 1, `单击选中 1 张(实际 ${st.m && st.m.selected})`)
  await evaluate(`__key('a', { ctrlKey: true })`)
  await sleep(300)
  st = await state()
  ok(st.m && st.m.selected === st.m.total, `Ctrl+A 全选(实际 ${st.m && st.m.selected})`)
  await evaluate(`__key('Escape')`)
  await sleep(300)
  st = await state()
  ok(st.m && st.m.selected === 0, 'Esc 取消选择')

  // 8. 复制 1 张(记录源文件名用于粘贴后的清理)
  const sourceTitle = await evaluate(`__thumbs()[0] ? __thumbs()[0].getAttribute('title') : ''`)
  ok(!!sourceTitle, `读取所选图片路径(${sourceTitle})`)
  const sourceName = sourceTitle ? sourceTitle.split('/').pop() : ''
  await evaluate(`__click(__thumbs()[0])`)
  await sleep(200)
  await evaluate(`__key('c', { ctrlKey: true })`)
  await sleep(500)
  await evaluate(`__click(__btnByText('返回相册列表', false))`)
  await sleep(1500)
  st = await state()
  ok(st.text.includes('剪贴板中有 1 张图片'), '返回列表后显示剪贴板提示(1 张)')

  // 9. 若还有第二个相册:粘贴(设备端 copy)→ 核对 → 删除粘贴文件(自清理)
  const secondCard = await evaluate(`(() => {
    const cards = [...window.__activePanel().querySelectorAll('[class*=albumCard]')]
    return cards.length >= 2 ? cards[1].querySelector('[class*=cardPath]').textContent : null
  })()`)
  if (!secondCard) {
    skip('只有一个相册,跳过粘贴/删除往返验证')
    finish()
    return
  }
  ok(await enterAlbum(secondCard), `进入第二个相册 ${secondCard}`)
  st = await state()
  const beforeTotal = st.m ? st.m.total : 0
  const existingNames = await evaluate(`__thumbs().map(t => (t.getAttribute('title') || '').split('/').pop())`)
  const destName = expectedCopyName(sourceName, existingNames)
  const pasteBtn = await evaluate(`!!__btnByText('粘贴', false)`)
  ok(pasteBtn, '显示「粘贴 1 张」按钮')
  await evaluate(`__click(__btnByText('粘贴', false))`)
  let pasted = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    const t = await state()
    if (t.m && t.m.total === beforeTotal + 1) {
      pasted = true
      break
    }
  }
  st = await state()
  ok(pasted && st.m && st.m.total === beforeTotal + 1, `粘贴后共 ${beforeTotal + 1} 张(实际 ${st.m && st.m.total})`)

  // 选中粘贴生成的那个文件并删除,恢复原状
  await evaluate(`__click(__thumbs().find(t => (t.getAttribute('title') || '').endsWith('/' + ${JSON.stringify(destName)})))`)
  await sleep(300)
  st = await state()
  ok(st.m && st.m.selected === 1, `选中粘贴的文件 ${destName}`)
  await evaluate(`__key('Delete')`)
  await sleep(500)
  st = await state()
  ok(
    st.text.includes('删除确认') && st.text.includes('无法恢复'),
    'Delete 键弹出删除确认框'
  )
  ok(await confirmDeleteModal(), '确认删除')
  let restored = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    const t = await state()
    if (t.m && t.m.total === beforeTotal) {
      restored = true
      break
    }
  }
  st = await state()
  ok(
    restored && st.m && st.m.total === beforeTotal,
    `删除后恢复 ${beforeTotal} 张(实际 ${st.m && st.m.total})`
  )

  finish()
}

function finish() {
  // 错误汇总(unhandled rejection 等会以 console.error 形式出现)
  const relevant = errors.filter((e) => !e.includes('favicon'))
  ok(
    relevant.length === 0,
    relevant.length === 0
      ? '无渲染进程异常 / console.error'
      : '有错误: ' + relevant.slice(0, 5).join(' | ')
  )
  console.log(`\n结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过`)
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('脚本失败:', e.message)
  process.exit(1)
})
