import type { ExportSettings } from '../types'
import { pageDimensions } from './export'

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const KEEP_TOGETHER = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'IMG', 'FIGURE',
])

function isKeepTogether(element: HTMLElement): boolean {
  if (KEEP_TOGETHER.has(element.tagName)) return true
  // markdown-it wraps images in <p>; a page break through that paragraph
  // slices the picture. Treat image-only wrappers as atomic blocks.
  const replaced = element.querySelector(':scope > img, :scope > svg, :scope > figure')
  if (!replaced) return false
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  return text.length <= 40
}

export function getContentHeight(settings: ExportSettings): number {
  const dimensions = pageDimensions[settings.paper]
  return dimensions.height - 2 * settings.margin
}

export function getContentWidth(settings: ExportSettings): number {
  const dimensions = pageDimensions[settings.paper]
  return dimensions.width - 2 * settings.margin
}

export interface PageSlice {
  pageIndex: number
  top: number
  bottom: number
  elements: HTMLElement[]
}

export interface PageBoundary {
  top: number
  bottom: number
  /** Source Y from which the rest of this page's content area must be painted over. */
  blankFrom?: number
}

interface ElementMetric {
  element: HTMLElement
  top: number
  bottom: number
  height: number
  keepTogether: boolean
  heading: boolean
}

interface SplitPoint {
  /** Last Y that still belongs on the current page (inclusive). */
  cutAfter: number
  /** Y where leftover content begins — next page content origin, and mask start. */
  nextStart: number
}

function getDocumentRoot(sourceElement: HTMLElement): Element | null {
  return sourceElement.querySelector('.export-document, .markdown-body')
}

function getElementMetrics(sourceElement: HTMLElement): ElementMetric[] {
  const documentElement = getDocumentRoot(sourceElement)
  if (!documentElement) return []

  const sourceRect = sourceElement.getBoundingClientRect()
  return Array.from(documentElement.children).map((child) => {
    const element = child as HTMLElement
    const rect = element.getBoundingClientRect()
    return {
      element,
      top: rect.top - sourceRect.top,
      bottom: rect.bottom - sourceRect.top,
      height: rect.height,
      keepTogether: isKeepTogether(element),
      heading: HEADINGS.has(element.tagName),
    }
  })
}

interface LineBox {
  top: number
  bottom: number
}

function getLineBoxes(element: HTMLElement, sourceElement: HTMLElement): LineBox[] {
  const sourceTop = sourceElement.getBoundingClientRect().top
  const boxes: LineBox[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()

  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0 && rect.height > 0) {
          boxes.push({ top: rect.top - sourceTop, bottom: rect.bottom - sourceTop })
        }
      }
      range.detach()
    }
    node = walker.nextNode()
  }

  boxes.sort((a, b) => a.top - b.top || a.bottom - b.bottom)
  const merged: LineBox[] = []
  for (const box of boxes) {
    const previous = merged[merged.length - 1]
    if (previous && box.top <= previous.bottom + 1) {
      previous.bottom = Math.max(previous.bottom, box.bottom)
      previous.top = Math.min(previous.top, box.top)
    } else {
      merged.push({ ...box })
    }
  }
  return merged
}

function rowBoxes(rows: Iterable<Element>, sourceTop: number): LineBox[] {
  const boxes: LineBox[] = []
  for (const row of rows) {
    const rect = (row as HTMLElement).getBoundingClientRect()
    if (rect.height > 0) boxes.push({ top: rect.top - sourceTop, bottom: rect.bottom - sourceTop })
  }
  return boxes
}

/**
 * Preferred split points: table rows, then list items, then real text line boxes.
 * Using the *next* box's top as nextStart avoids clipping descenders on the
 * last line of the current page.
 */
function getSplitPoint(element: HTMLElement, sourceElement: HTMLElement, limit: number): SplitPoint | null {
  const sourceTop = sourceElement.getBoundingClientRect().top
  let boxes: LineBox[] = []

  if (element.tagName === 'TABLE') {
    boxes = rowBoxes(element.querySelectorAll('tr'), sourceTop)
  } else if (element.tagName === 'UL' || element.tagName === 'OL') {
    boxes = rowBoxes(element.querySelectorAll(':scope > li'), sourceTop)
  }

  if (boxes.length === 0) boxes = getLineBoxes(element, sourceElement)
  if (boxes.length === 0) return null

  let last = -1
  for (let index = 0; index < boxes.length; index += 1) {
    if (boxes[index].bottom <= limit + 0.5) last = index
    else break
  }
  if (last < 0) return null

  const cutAfter = boxes[last].bottom
  const nextStart = last + 1 < boxes.length ? Math.max(cutAfter, boxes[last + 1].top) : cutAfter
  return { cutAfter, nextStart }
}

/**
 * Shrink replaced content that is taller or wider than a printable page so
 * pagination never has to slice through a picture.
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

/**
 * Compute page viewport offsets. Each offset is the top of the source document
 * that should be shown at the top of a physical page. Pages pack around real
 * element, row, and line boundaries so text is never clipped through a glyph.
 *
 * `blankFrom` marks source Y where the rest of that page's viewport must be
 * painted over: leftover content of a split block, or a keep-together block
 * that was moved to the next page.
 */
export function computePageBoundaries(
  sourceElement: HTMLElement,
  settings: ExportSettings,
): PageBoundary[] {
  const dimensions = pageDimensions[settings.paper]
  const pageHeight = dimensions.height
  const margin = settings.margin
  const contentHeight = getContentHeight(settings)
  const metrics = getElementMetrics(sourceElement)

  if (metrics.length === 0) return [{ top: 0, bottom: pageHeight }]

  const boundaries: PageBoundary[] = [{ top: 0, bottom: pageHeight }]
  let pageTop = 0
  let pageContentEnd = pageTop + margin + contentHeight
  let pageHasContent = false
  let metricIndex = 0
  let guard = 0

  const startNewPage = (nextPageTop: number, blankFrom: number) => {
    const current = boundaries[boundaries.length - 1]
    current.blankFrom = Math.max(pageTop + margin, blankFrom)
    if (nextPageTop <= pageTop + 1) nextPageTop = pageTop + pageHeight
    pageTop = nextPageTop
    pageContentEnd = pageTop + margin + contentHeight
    pageHasContent = false
    boundaries.push({ top: pageTop, bottom: pageTop + pageHeight })
  }

  while (metricIndex < metrics.length && guard < 10_000) {
    guard += 1
    const metric = metrics[metricIndex]
    const nextMetric = metrics[metricIndex + 1]
    const remainingAfterHeading = pageContentEnd - metric.bottom
    const headingWouldOrphan = metric.heading
      && pageHasContent
      && metric.bottom <= pageContentEnd + 0.5
      && Boolean(nextMetric)
      && remainingAfterHeading < 56

    if (metric.bottom <= pageContentEnd + 0.5 && !headingWouldOrphan) {
      pageHasContent = true
      metricIndex += 1
      continue
    }

    const fitsOnFreshPage = metric.height <= contentHeight
    if (pageHasContent && (metric.keepTogether || headingWouldOrphan) && (fitsOnFreshPage || headingWouldOrphan)) {
      startNewPage(Math.max(pageTop + 1, metric.top - margin), metric.top)
      continue
    }

    const split = getSplitPoint(metric.element, sourceElement, pageContentEnd)
    if (split && split.nextStart > pageTop + margin + 1 && split.cutAfter <= pageContentEnd + 0.5) {
      startNewPage(split.nextStart - margin, split.nextStart)
      continue
    }

    if (pageHasContent) {
      startNewPage(pageTop + pageHeight, pageContentEnd)
      continue
    }

    // First item on a page is taller than the content area and has no usable
    // split. Give it this page and move on so pagination cannot loop.
    pageHasContent = true
    metricIndex += 1
  }

  return boundaries
}

/**
 * Kept as a small compatibility helper for callers that want page slices. The
 * actual renderer uses computePageBoundaries because it preserves the original
 * DOM layout while clipping only the page viewport.
 */
export function computePageSlices(sourceElement: HTMLElement, settings: ExportSettings): PageSlice[] {
  return computePageBoundaries(sourceElement, settings).map((boundary, pageIndex) => ({
    pageIndex,
    top: boundary.top,
    bottom: boundary.bottom,
    elements: [],
  }))
}
