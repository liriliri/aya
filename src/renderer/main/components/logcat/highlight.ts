import { getLogcatMatchRanges, LogcatSearchExpression } from './search'

export function highlightLogcat(
  container: HTMLElement,
  expression: LogcatSearchExpression | null
) {
  if (!expression) {
    return () => {}
  }

  const highlighted = new WeakMap<Element, string>()
  const selector = '.luna-logcat-message'

  function highlight(message: Element) {
    const text = message.textContent || ''
    if (highlighted.get(message) === text) {
      return
    }
    highlighted.set(message, text)

    const ranges = getLogcatMatchRanges(text, expression)
    if (!ranges.length) {
      return
    }

    const fragment = document.createDocumentFragment()
    let offset = 0
    for (const [start, end] of ranges) {
      fragment.append(text.slice(offset, start))
      const mark = document.createElement('mark')
      mark.dataset.logcatSearch = ''
      mark.textContent = text.slice(start, end)
      fragment.append(mark)
      offset = end
    }
    fragment.append(text.slice(offset))
    message.replaceChildren(fragment)
  }

  // Luna owns the row DOM. Observe newly visible rows so virtual scrolling,
  // incoming entries and view changes all receive the same safe text highlights.
  const observer = new MutationObserver((records) => {
    const messages = new Set<Element>()
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          if (node.matches(selector)) {
            messages.add(node)
          }
          node
            .querySelectorAll(selector)
            .forEach((message) => messages.add(message))
        }
      }
    }
    messages.forEach(highlight)
  })
  observer.observe(container, { childList: true, subtree: true })
  container.querySelectorAll(selector).forEach(highlight)

  return () => {
    observer.disconnect()
    container
      .querySelectorAll('mark[data-logcat-search]')
      .forEach((mark) => mark.replaceWith(mark.textContent || ''))
  }
}
