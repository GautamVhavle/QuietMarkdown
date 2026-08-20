import type { ExportSettings } from '../types'
import { pageDimensions } from './export'

/**
 * Elements that should never be split across pages.
 * These are block-level elements that should stay together.
 */
const UNBREAKABLE_SELECTORS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote',
  'pre',
  'table',
  'hr',
  'ul', 'ol',
  '.task-list-item',
  'img',
  'figure',
  'div[style*="page-break-inside"]', // in case someone uses it
].join(', ')

/**
 * Elements that can be split but should avoid breaking mid-line.
 * These are handled by allowing natural text flow.
 */
const SPLITTABLE_SELECTORS = [
  'p',
  'li',
].join(', ')

/**
 * Calculate the available content height for a page (excluding margins).
 */
export function getContentHeight(settings: ExportSettings): number {
  const dims = pageDimensions[settings.paper]
  return dims.height - 2 * settings.margin
}

/**
 * Calculate the available content width for a page (excluding margins).
 */
export function getContentWidth(settings: ExportSettings): number {
  const dims = pageDimensions[settings.paper]
  return dims.width - 2 * settings.margin
}

/**
 * Represents a single page's content area in the source document.
 */
export interface PageSlice {
  pageIndex: number
  top: number
  bottom: number
  elements: HTMLElement[]
}

/**
 * Analyzes the document and computes optimal page breaks that respect element boundaries.
 * Returns an array of PageSlice objects, each defining a page's content window.
 */
export function computePageSlices(
  sourceElement: HTMLElement,
  settings: ExportSettings
): PageSlice[] {
  const contentHeight = getContentHeight(settings)
  const dims = pageDimensions[settings.paper]
  const fullPageHeight = dims.height

  // Get all direct children of the document (block-level elements)
  const document = sourceElement.querySelector('.export-document')
  if (!document) return []

  const blockElements = Array.from(document.children) as HTMLElement[]
  if (blockElements.length === 0) {
    // Fallback: single page
    return [{ pageIndex: 0, top: 0, bottom: fullPageHeight, elements: [] }]
  }

  const slices: PageSlice[] = []
  let currentPageIndex = 0
  let currentPageTop = 0
  let currentPageBottom = contentHeight
  let currentElements: HTMLElement[] = []

  // Measure all elements' positions relative to the document
  const elementMetrics = blockElements.map((el) => {
    const rect = el.getBoundingClientRect()
    const docRect = document.getBoundingClientRect()
    return {
      element: el,
      top: rect.top - docRect.top,
      bottom: rect.bottom - docRect.top,
      height: rect.height,
      isUnbreakable: matchesSelector(el, UNBREAKABLE_SELECTORS),
      isSplittable: matchesSelector(el, SPLITTABLE_SELECTORS),
    }
  })

  for (const metric of elementMetrics) {
    const { element, top, bottom, height, isUnbreakable } = metric

    // If this is the first element on a page, always place it
    if (currentElements.length === 0) {
      currentElements.push(element)
      continue
    }

    // Check if element fits on current page
    const fitsOnCurrentPage = bottom <= currentPageBottom

    if (fitsOnCurrentPage) {
      // Element fits, add to current page
      currentElements.push(element)
    } else {
      // Element doesn't fit on current page
      if (isUnbreakable && height <= contentHeight) {
        // Unbreakable element that fits on a fresh page - start new page
        slices.push({
          pageIndex: currentPageIndex,
          top: currentPageTop,
          bottom: currentPageBottom,
          elements: currentElements,
        })
        currentPageIndex++
        currentPageTop = currentPageIndex * fullPageHeight
        currentPageBottom = currentPageTop + contentHeight
        currentElements = [element]
      } else if (isUnbreakable && height > contentHeight) {
        // Unbreakable element taller than a page - must split (e.g., huge table/code)
        // Put what we have on current page, then this element starts new page
        // but it will overflow - that's unavoidable
        slices.push({
          pageIndex: currentPageIndex,
          top: currentPageTop,
          bottom: currentPageBottom,
          elements: currentElements,
        })
        currentPageIndex++
        currentPageTop = currentPageIndex * fullPageHeight
        currentPageBottom = currentPageTop + contentHeight
        currentElements = [element]
      } else {
        // Splittable element (p, li) - try to avoid widow/orphan lines
        // For now, move to next page if it would leave less than 2 lines
        const spaceLeft = currentPageBottom - top
        const minLines = 2
        const lineHeight = 1.7 * 16 // approximate line height in px
        const minSpace = minLines * lineHeight

        if (spaceLeft < minSpace) {
          // Not enough space for meaningful content - start new page
          slices.push({
            pageIndex: currentPageIndex,
            top: currentPageTop,
            bottom: currentPageBottom,
            elements: currentElements,
          })
          currentPageIndex++
          currentPageTop = currentPageIndex * fullPageHeight
          currentPageBottom = currentPageTop + contentHeight
          currentElements = [element]
        } else {
          // Enough space - add to current page (will be split naturally by html-to-image)
          currentElements.push(element)
        }
      }
    }
  }

  // Add the last page
  if (currentElements.length > 0 || slices.length === 0) {
    slices.push({
      pageIndex: currentPageIndex,
      top: currentPageTop,
      bottom: Math.max(currentPageBottom, currentPageTop + contentHeight),
      elements: currentElements,
    })
  }

  return slices
}

/**
 * Simple selector matching for unbreakable/splittable classification.
 */
function matchesSelector(element: HTMLElement, selectors: string): boolean {
  try {
    return element.matches(selectors)
  } catch {
    return false
  }
}

/**
 * Creates a page-specific clone of the source element, showing only the elements
 * that belong on that page. Uses CSS clipping/hiding to achieve clean page breaks.
 */
export function createPageSource(
  sourceElement: HTMLElement,
  slice: PageSlice,
  settings: ExportSettings
): HTMLElement {
  const clone = sourceElement.cloneNode(true) as HTMLElement
  const document = clone.querySelector('.export-document') as HTMLElement
  if (!document) return clone

  const contentHeight = getContentHeight(settings)
  const dims = pageDimensions[settings.paper]
  const fullPageHeight = dims.height

  // For the page's content window, we need to:
  // 1. Position the document so the slice's top aligns with the content area top
  // 2. Clip/hide content outside the slice's page boundaries

  // The source element (export-page-capture) has padding = margin
  // Its content area starts at margin from top
  const margin = settings.margin
  const pageTopInSource = slice.pageIndex * fullPageHeight + margin

  // Strategy: Use CSS to clip the document to the page's content area
  // We'll set the document's position relative to the page slice
  document.style.position = 'relative'
  document.style.top = `-${pageTopInSource}px`
  document.style.maxHeight = `${contentHeight}px`
  document.style.overflow = 'hidden'

  // Also clip the export-page wrapper
  const pageWrapper = clone.querySelector('.export-page-live') as HTMLElement
  if (pageWrapper) {
    pageWrapper.style.height = `${fullPageHeight}px`
    pageWrapper.style.minHeight = `${fullPageHeight}px`
    pageWrapper.style.overflow = 'hidden'
  }

  return clone
}

/**
 * Alternative approach: Instead of cloning and clipping, use the existing translateY
 * but calculate page boundaries based on element metrics rather than fixed height.
 * This is simpler and leverages the existing html-to-image rendering.
 */
export function computePageBoundaries(
  sourceElement: HTMLElement,
  settings: ExportSettings
): { top: number; bottom: number }[] {
  const contentHeight = getContentHeight(settings)
  const dims = pageDimensions[settings.paper]
  const fullPageHeight = dims.height
  const margin = settings.margin

  const document = sourceElement.querySelector('.export-document')
  if (!document) return [{ top: 0, bottom: fullPageHeight }]

  const blockElements = Array.from(document.children) as HTMLElement[]
  if (blockElements.length === 0) return [{ top: 0, bottom: fullPageHeight }]

  const boundaries: { top: number; bottom: number }[] = []

  // Element metrics in PAGE-BOX coordinates (including margin offset)
  // The document sits at y=margin within the page box (due to padding on export-page-capture)
  const elementMetrics = blockElements.map((el) => {
    const rect = el.getBoundingClientRect()
    const docRect = document.getBoundingClientRect()
    return {
      element: el,
      top: rect.top - docRect.top + margin,
      bottom: rect.bottom - docRect.top + margin,
      height: rect.height,
      isUnbreakable: matchesSelector(el, UNBREAKABLE_SELECTORS),
    }
  })

  for (const metric of elementMetrics) {
    const { bottom, height, isUnbreakable } = metric

    if (boundaries.length === 0) {
      // First page: content area goes from margin to margin + contentHeight
      boundaries.push({ top: 0, bottom: margin + contentHeight })
    }

    const currentBoundary = boundaries[boundaries.length - 1]
    const fitsOnCurrentPage = bottom <= currentBoundary.bottom

    if (fitsOnCurrentPage) {
      // Extend current boundary to include this element
      currentBoundary.bottom = Math.max(currentBoundary.bottom, bottom)
    } else {
      // Start new page
      if (isUnbreakable && height <= contentHeight) {
        // Unbreakable element fits on fresh page
        const pageIndex = boundaries.length
        boundaries.push({ top: pageIndex * fullPageHeight, bottom: pageIndex * fullPageHeight + margin + contentHeight })
        // Update the new boundary to include this element
        const newBoundary = boundaries[boundaries.length - 1]
        newBoundary.bottom = Math.max(newBoundary.bottom, bottom)
      } else {
        // Either splittable or too tall - just start new page at fixed interval
        const pageIndex = boundaries.length
        boundaries.push({ top: pageIndex * fullPageHeight, bottom: pageIndex * fullPageHeight + margin + contentHeight })
        // And extend it
        const newBoundary = boundaries[boundaries.length - 1]
        newBoundary.bottom = Math.max(newBoundary.bottom, bottom)
      }
    }
  }

  // Ensure each boundary covers at least a full page height
  return boundaries.map((b, i) => ({
    top: i * fullPageHeight,
    bottom: Math.max(b.bottom, (i + 1) * fullPageHeight)
  }))
}