import type { ExportSettings } from '../types'
import { pageDimensions } from './export'

const KEEP_TOGETHER = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'IMG', 'FIGURE',
])

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

interface ElementMetric {
  element: HTMLElement
  top: number
  bottom: number
  height: number
  keepTogether: boolean
}

function getElementMetrics(sourceElement: HTMLElement): ElementMetric[] {
  const documentElement = sourceElement.querySelector('.export-document')
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
      keepTogether: KEEP_TOGETHER.has(element.tagName),
    }
  })
}

/**
 * Return the bottoms of the actual rendered text lines in an element. A Range
 * gives us browser line boxes, which is much safer than guessing from a font
 * size or cutting at an arbitrary pixel row.
 */
function getLineBottoms(element: HTMLElement, sourceElement: HTMLElement): number[] {
  const sourceTop = sourceElement.getBoundingClientRect().top
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const bottoms: number[] = []
  let node = walker.nextNode()

  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0 && rect.height > 0) bottoms.push(rect.bottom - sourceTop)
      }
      range.detach()
    }
    node = walker.nextNode()
  }

  return [...new Set(bottoms.map((bottom) => Math.ceil(bottom)))].sort((a, b) => a - b)
}

function getSafeBreak(element: HTMLElement, sourceElement: HTMLElement, limit: number): number | null {
  const lineBottoms = getLineBottoms(element, sourceElement)
  const safeLines = lineBottoms.filter((bottom) => bottom <= limit + 0.5)
  return safeLines.length > 0 ? safeLines[safeLines.length - 1] : null
}

/**
 * Compute page viewport offsets. Each offset is the top of the source document
 * that should be shown at the top of a physical page. Pages are packed around
 * real element and line boundaries, so text is never clipped halfway through a
 * rendered line just because a fixed page-height boundary happened to land there.
 */
export function computePageBoundaries(
  sourceElement: HTMLElement,
  settings: ExportSettings,
): { top: number; bottom: number }[] {
  const dimensions = pageDimensions[settings.paper]
  const pageHeight = dimensions.height
  const margin = settings.margin
  const contentHeight = getContentHeight(settings)
  const metrics = getElementMetrics(sourceElement)

  if (metrics.length === 0) return [{ top: 0, bottom: pageHeight }]

  const boundaries: { top: number; bottom: number }[] = [{ top: 0, bottom: pageHeight }]
  let pageTop = 0
  let pageContentEnd = pageTop + margin + contentHeight
  let pageHasContent = false
  let metricIndex = 0

  while (metricIndex < metrics.length) {
    const metric = metrics[metricIndex]
    if (metric.bottom <= pageContentEnd + 0.5) {
      pageHasContent = true
      metricIndex += 1
      continue
    }

    // A complete block gets moved to the next page when it fits there. This
    // prevents headings, images, code, tables, and quotes from being stranded.
    const fitsOnFreshPage = metric.height <= contentHeight
    let nextPageTop: number
    if (pageHasContent && metric.keepTogether && fitsOnFreshPage) {
      nextPageTop = Math.max(pageTop + 1, metric.top - margin)
    } else {
      // For flowing text (and oversized blocks), break at the last complete
      // rendered line that fits. The following page starts at that line's end.
      const safeBreak = getSafeBreak(metric.element, sourceElement, pageContentEnd)
      if (safeBreak !== null && safeBreak > pageTop + margin + 1) {
        nextPageTop = safeBreak - margin
      } else if (pageHasContent) {
        // Extremely unusual content (for example a replaced element with no
        // text range) still gets a deterministic page break without looping.
        nextPageTop = pageTop + pageHeight
      } else {
        // The first item on a page can be taller than the content area. Let it
        // occupy this page and continue from the next safe line if possible.
        pageHasContent = true
        metricIndex += 1
        continue
      }
    }

    if (nextPageTop <= pageTop + 1) nextPageTop = pageTop + pageHeight
    pageTop = nextPageTop
    pageContentEnd = pageTop + margin + contentHeight
    pageHasContent = false
    boundaries.push({ top: pageTop, bottom: pageTop + pageHeight })
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
