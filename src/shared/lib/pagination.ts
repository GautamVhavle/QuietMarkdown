import { orientedDimensions, tuneMarginPx } from '../../shared/export/geometry'
import type { ExportSettings } from '../../shared/settings/exportSettings'

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const EPSILON = 0.75

export function getContentHeight(settings: ExportSettings): number {
  const dimensions = orientedDimensions(settings.fineTune.paper, settings.fineTune.orientation)
  return dimensions.height - 2 * tuneMarginPx(settings.fineTune)
}

export function getContentWidth(settings: ExportSettings): number {
  const dimensions = orientedDimensions(settings.fineTune.paper, settings.fineTune.orientation)
  return dimensions.width - 2 * tuneMarginPx(settings.fineTune)
}

/**
 * Shrink replaced content that is taller or wider than a printable page so
 * a picture never has to be sliced across two sheets.
 */
export function fitReplacedElementsToPage(
  container: HTMLElement,
  maxHeight: number,
  maxWidth: number,
): number {
  let fitted = 0
  const availableHeight = Math.max(80, maxHeight - 8)
  const availableWidth = Math.max(80, maxWidth - 4)
  for (const node of Array.from(container.querySelectorAll<HTMLElement>('img, svg'))) {
    const rect = node.getBoundingClientRect()
    if (!(rect.width > 0) || !(rect.height > 0)) continue
    if (rect.height <= availableHeight && rect.width <= availableWidth) continue
    const scale = Math.min(availableHeight / rect.height, availableWidth / rect.width)
    node.style.maxWidth = `${Math.floor(rect.width * scale)}px`
    node.style.maxHeight = `${Math.floor(rect.height * scale)}px`
    node.style.width = 'auto'
    node.style.height = 'auto'
    fitted += 1
  }
  return fitted
}

function hasContent(element: HTMLElement): boolean {
  return Boolean(element.textContent?.trim() || element.querySelector('img, svg, tr, hr, canvas'))
}

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.textContent) nodes.push(node as Text)
    node = walker.nextNode()
  }
  return nodes
}

/**
 * Largest character offset in `root` whose selected prefix stays fully above
 * `limitBottom`. Uses the browser's own line boxes (Range client rects), so a
 * split never lands inside a glyph.
 */
function lastFittingPoint(root: HTMLElement, limitBottom: number): { node: Text; offset: number } | null {
  const texts = collectTextNodes(root)
  if (texts.length === 0) return null

  const starts: number[] = []
  let total = 0
  for (const text of texts) {
    starts.push(total)
    total += text.length
  }
  if (total === 0) return null

  const at = (index: number): { node: Text; offset: number } => {
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      if (index >= starts[i]) return { node: texts[i], offset: index - starts[i] }
    }
    return { node: texts[0], offset: 0 }
  }

  const prefixFits = (index: number): boolean => {
    if (index <= 0) return true
    const point = at(index)
    const range = document.createRange()
    range.setStart(texts[0], 0)
    try {
      range.setEnd(point.node, point.offset)
    } catch {
      return false
    }
    const rects = range.getClientRects()
    if (rects.length === 0) return true
    return rects[rects.length - 1].bottom <= limitBottom + EPSILON
  }

  if (!prefixFits(1)) return null

  let low = 0
  let high = total
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    if (prefixFits(mid)) low = mid
    else high = mid - 1
  }
  if (low <= 0) return null
  return at(low)
}

function splitRichText(block: HTMLElement, limitBottom: number): HTMLElement | null {
  const point = lastFittingPoint(block, limitBottom)
  if (!point || !block.lastChild) return null

  const tail = block.cloneNode(false) as HTMLElement
  const range = document.createRange()
  range.setStart(point.node, point.offset)
  range.setEndAfter(block.lastChild)
  try {
    tail.append(range.extractContents())
  } catch {
    return null
  }
  if (!hasContent(tail)) return null
  if (!hasContent(block)) {
    block.append(...Array.from(tail.childNodes))
    return null
  }
  return tail
}

function splitTable(table: HTMLElement, limitBottom: number): HTMLElement | null {
  const rows = Array.from(table.querySelectorAll('tr'))
  let lastFit = -1
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].getBoundingClientRect().bottom <= limitBottom + EPSILON) lastFit = index
    else break
  }
  if (lastFit < 0 || lastFit >= rows.length - 1) return null

  const tail = table.cloneNode(false) as HTMLElement
  const head = table.querySelector('thead')
  if (head) tail.append(head.cloneNode(true))
  const body = table.querySelector('tbody')
  const tailBody = body ? document.createElement('tbody') : tail
  if (body) tail.append(tailBody)

  for (const row of rows.slice(lastFit + 1)) {
    if (row.closest('thead')) continue
    tailBody.append(row)
  }
  return hasContent(tail) ? tail : null
}

function splitList(list: HTMLElement, limitBottom: number): HTMLElement | null {
  const items = Array.from(list.children) as HTMLElement[]
  if (items.length === 0) return null

  let lastFit = -1
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].getBoundingClientRect().bottom <= limitBottom + EPSILON) lastFit = index
    else break
  }

  if (lastFit < 0) {
    const itemTail = splitRichText(items[0], limitBottom)
    if (!itemTail) return null
    const tail = list.cloneNode(false) as HTMLElement
    tail.append(itemTail)
    return tail
  }
  if (lastFit >= items.length - 1) return null

  const tail = list.cloneNode(false) as HTMLElement
  for (const item of items.slice(lastFit + 1)) tail.append(item)
  return tail
}

function splitOverflowingBlock(block: HTMLElement, limitBottom: number): HTMLElement | null {
  if (block.tagName === 'TABLE') return splitTable(block, limitBottom)
  if (block.tagName === 'UL' || block.tagName === 'OL') return splitList(block, limitBottom)
  return splitRichText(block, limitBottom)
}

function overflows(article: HTMLElement): boolean {
  return article.scrollHeight > article.clientHeight + EPSILON
}

/**
 * Lay the HTML out as real pages. Each page is filled until the browser
 * reports overflow, then the overflowing block is split at the last complete
 * line / row / list item. Nothing is windowed or clipped through a glyph.
 *
 * `measurePage` must already be in the document with export-page styles.
 * It is restored before this function returns; the result is innerHTML for
 * each `.export-document`.
 */
export function paginateHtml(
  html: string,
  settings: ExportSettings,
  measurePage: HTMLElement,
): string[] {
  const article = measurePage.querySelector<HTMLElement>('.export-document')
  if (!article) return [html]

  const dimensions = orientedDimensions(settings.fineTune.paper, settings.fineTune.orientation)
  const contentHeight = getContentHeight(settings)
  const saved = {
    pageHeight: measurePage.style.height,
    pageMaxHeight: measurePage.style.maxHeight,
    pageMinHeight: measurePage.style.minHeight,
    pageOverflow: measurePage.style.overflow,
    articleHeight: article.style.height,
    articleOverflow: article.style.overflow,
  }

  measurePage.style.height = `${dimensions.height}px`
  measurePage.style.maxHeight = `${dimensions.height}px`
  measurePage.style.minHeight = `${dimensions.height}px`
  measurePage.style.overflow = 'hidden'
  article.style.height = `${contentHeight}px`
  article.style.overflow = 'hidden'

  try {
    article.innerHTML = html
    fitReplacedElementsToPage(measurePage, contentHeight, getContentWidth(settings))
    const queue = Array.from(article.children).map((child) => child.cloneNode(true) as HTMLElement)
    article.replaceChildren()

    const pages: string[] = []
    const flush = () => {
      const last = article.lastElementChild as HTMLElement | null
      if (last) last.style.marginBottom = '0'
      if (article.innerHTML.trim()) pages.push(article.innerHTML)
      article.replaceChildren()
    }

    let guard = 0
    while (queue.length > 0 && guard < 10_000) {
      guard += 1
      const block = queue.shift()!
      article.append(block)
      if (overflows(article)) {
        const previousMargin = block.style.marginBottom
        block.style.marginBottom = '0'
        if (overflows(article)) block.style.marginBottom = previousMargin
      }
      if (!overflows(article)) continue

      article.removeChild(block)
      const last = article.lastElementChild as HTMLElement | null
      const carryHeading = Boolean(last && HEADINGS.has(last.tagName))
      if (carryHeading && last) last.remove()

      if (article.childElementCount > 0) {
        flush()
        if (carryHeading && last) queue.unshift(last, block)
        else queue.unshift(block)
        continue
      }

      if (carryHeading && last) article.append(last)
      article.append(block)
      const limitBottom = article.getBoundingClientRect().bottom - 2
      const tail = splitOverflowingBlock(block, limitBottom)
      if (tail) {
        flush()
        queue.unshift(tail)
        continue
      }

      // Unsplittable (image, huge cell). Keep it on this page rather than loop.
      flush()
    }

    if (article.childElementCount > 0) flush()
    return pages.length > 0 ? pages : ['']
  } finally {
    measurePage.style.height = saved.pageHeight
    measurePage.style.maxHeight = saved.pageMaxHeight
    measurePage.style.minHeight = saved.pageMinHeight
    measurePage.style.overflow = saved.pageOverflow
    article.style.height = saved.articleHeight
    article.style.overflow = saved.articleOverflow
  }
}
