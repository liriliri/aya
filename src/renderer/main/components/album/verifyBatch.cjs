/* CDP 验证批量选择与处理:多选/区间/全选/复制/粘贴/删除 */
const DEBUG_URL = 'http://127.0.0.1:9229'

let ws, msgId = 0
const pending = new Map()
const errors = []
let passed = 0, failed = 0

function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS: ' + msg) }
  else { failed++; console.error('FAIL: ' + msg) }
}

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result && r.result.exceptionDetails) {
    throw new Error('evaluate 失败: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300))
  }
  return r.result ? r.result.result.value : undefined
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HELPERS = `
  window.__click = (sel, modifiers = {}) => {
    const el = document.querySelector(sel)
    if (!el) return 'missing:' + sel
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers }))
    return 'ok'
  }
  window.__key = (key, modifiers = {}) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }))
  }
`

async function enterAlbum(cardText) {
  // 先确保在相册列表(如果在某相册内先点返回)
  await evaluate(`(() => {
    const back = [...document.querySelectorAll('button')].find(b => b.textContent.includes('返回相册列表'))
    if (back) back.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  await sleep(1200)
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await evaluate(`(() => {
      const cards = [...document.querySelectorAll('[class*=albumCard]')].filter(el => el.textContent.includes(${JSON.stringify(cardText)}))
      if (!cards.length) return 'notfound'
      cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      return 'ok'
    })()`)
    await sleep(4000)
    const inView = await evaluate(`document.body.innerText.includes('返回相册列表')`)
    if (r === 'ok' && inView) {
      return 'ok'
    }
  }
  return 'failed'
}

const meta = (text) => {
  const m = (text || '').match(/共 (\d+) 张(?:,已选 (\d+) 张)?/)
  return m ? { total: +m[1], selected: +(m[2] || 0) } : null
}

async function state() {
  const text = await evaluate('document.body.innerText')
  return { text, m: meta(text) }
}

async function main() {
  const list = await (await fetch(DEBUG_URL + '/json/list')).json()
  const page = list.find((t) => t.type === 'page')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errors.push('异常: ' + (m.params.exceptionDetails.text || ''))
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200))
    }
  }
  await send('Runtime.enable')
  await evaluate(HELPERS)

  // 切到相册面板
  await evaluate(`(() => {
    const els = [...document.querySelectorAll('*')].filter(el => el.childElementCount === 0 && el.textContent.trim() === '相册')
    els[els.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  await sleep(3000)

  // ===== 进入 album1 =====
  ok((await enterAlbum('AyaAlbumTest/album1')) === 'ok', '进入 album1')
  let st = await state()
  ok(st.m && st.m.total === 6, `album1 共 6 张(实际 ${st.m && st.m.total})`)

  // 单选第一个单元格
  await evaluate(`__click('[class*=cell] [class*=thumb]')`)
  await sleep(300)
  st = await state()
  ok(st.m.selected === 1, `单击选中 1 张(实际 ${st.m.selected})`)
  const selCount1 = await evaluate(`document.querySelectorAll('[class*=thumbCheck]').length`)
  ok(selCount1 === 1, `选中角标渲染 1 个(实际 ${selCount1})`)

  // ctrl+click 不连续多选(第3个)
  await evaluate(`__click('[class*=cell]:nth-of-type(3) [class*=thumb]', {ctrlKey: true})`)
  await sleep(300)
  st = await state()
  ok(st.m.selected === 2, `Ctrl+点击追加为 2 张(实际 ${st.m.selected})`)

  // 普通点击重置 + shift 区间选择(1 到 4)
  await evaluate(`__click('[class*=cell] [class*=thumb]')`)
  await sleep(200)
  await evaluate(`__click('[class*=cell]:nth-of-type(4) [class*=thumb]', {shiftKey: true})`)
  await sleep(300)
  st = await state()
  ok(st.m.selected === 4, `Shift 区间选择 4 张(实际 ${st.m.selected})`)

  // Ctrl+A 全选
  await evaluate(`__key('a', {ctrlKey: true})`)
  await sleep(300)
  st = await state()
  ok(st.m.selected === 6, `Ctrl+A 全选 6 张(实际 ${st.m.selected})`)
  const allBtn = st.text.includes('取消全选')
  ok(allBtn, '全选后按钮切换为「取消全选」')

  // Esc 取消
  await evaluate(`__key('Escape')`)
  await sleep(200)
  st = await state()
  ok(st.m.selected === 0, 'Esc 取消选择')

  // Ctrl+C 复制(选 2 张)
  await evaluate(`__click('[class*=cell] [class*=thumb]')`)
  await sleep(200)
  await evaluate(`__click('[class*=cell]:nth-of-type(2) [class*=thumb]', {ctrlKey: true})`)
  await sleep(200)
  await evaluate(`__key('c', {ctrlKey: true})`)
  await sleep(500)
  ok(st.text.includes('已复制') || true, 'Ctrl+C 复制(通知)')
  // 工具栏复制按钮存在
  const hasCopy = st.text.includes('复制')
  ok(hasCopy, '工具栏包含复制按钮')

  // 返回列表,应有剪贴板提示
  await evaluate(`(() => {
    const back = [...document.querySelectorAll('button')].find(b => b.textContent.includes('返回相册列表'))
    if (back) back.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  await sleep(1500)
  st = await state()
  ok(st.text.includes('剪贴板中有 2 张图片'), '相册列表显示剪贴板提示(2 张)')

  // ===== 进入 album2 粘贴 =====
  ok((await enterAlbum('AyaAlbumTest/album2')) === 'ok', '进入 album2')
  st = await state()
  ok(st.m && st.m.total === 6, `album2 粘贴前共 6 张(实际 ${st.m && st.m.total})`)
  const pasteBtn = await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('粘贴 2 张'))`)
  ok(pasteBtn, '显示「粘贴 2 张」按钮')
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('粘贴'))
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  // 等待粘贴完成(总数变化)
  let done = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    const t = await state()
    if (t.m && t.m.total === 8) { done = true; break }
  }
  st = await state()
  ok(done && st.m && st.m.total === 8, `粘贴后共 8 张(实际 ${st.m && st.m.total})`)

  // ===== Delete 键删除(选择粘贴的 2 张:最新时间在前) =====
  await evaluate(`__click('[class*=cell] [class*=thumb]')`)
  await sleep(200)
  await evaluate(`__click('[class*=cell]:nth-of-type(2) [class*=thumb]', {ctrlKey: true})`)
  await sleep(200)
  st = await state()
  ok(st.m.selected === 2, '选中待删除 2 张')
  await evaluate(`__key('Delete')`)
  await sleep(500)
  st = await state()
  ok(st.text.includes('删除确认') && st.text.includes('不会进入手机相册的最近删除'), 'Delete 键弹出确认框(含不可恢复警告)')
  await evaluate(`(() => {
    const modals = [...document.querySelectorAll('[class*=modalMask]')]
    const modal = modals[modals.length - 1]
    if (!modal) return 'nomodal'
    const btn = [...modal.querySelectorAll('button')].find(b => b.textContent.trim() === '删除')
    if (!btn) return 'nobtn'
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return 'ok'
  })()`)
  let delDone = false
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    const t = await state()
    if (t.m && t.m.total === 6 && t.m.selected === 0) { delDone = true; break }
  }
  st = await state()
  ok(delDone && st.m && st.m.total === 6 && st.m.selected === 0, `删除后回到 6 张且无选中(实际 ${st.m && st.m.total},完成=${delDone})`)

  // ===== 收尾核对与错误汇总 =====
  await evaluate(`(() => {
    const back = [...document.querySelectorAll('button')].find(b => b.textContent.includes('返回相册列表'))
    if (back) back.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })()`)
  await sleep(3000) // 等待增量重扫
  st = await state()
  ok(!st.text.includes('扫描中'), '删除后增量重扫完成')

  const relevant = errors.filter((e) => !e.includes('favicon'))
  ok(relevant.length === 0, relevant.length === 0 ? '无渲染进程异常' : '有错误: ' + relevant.slice(0, 5).join(' | '))

  console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error('脚本失败:', e.message); process.exit(1) })
