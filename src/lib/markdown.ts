import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLanguage from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdownLanguage)
hljs.registerLanguage('md', markdownLanguage)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

/* ------------------------------------------------------------------ */
/* Mermaid real-time rendering                                         */
/*                                                                     */
/* Design goals for a great "as you type" experience:                  */
/*  1. Never re-render an unchanged diagram — finished SVGs live in a  */
/*     cache keyed by (theme + source), so untouched diagrams are      */
/*     restored instantly after React rebuilds the preview HTML.       */
/*  2. Never destroy a good diagram while its source is temporarily    */
/*     invalid (mid-edit). Each mermaid fence has a stable slot index; */
/*     while the new source fails to parse, the last good render stays */
/*     visible with a small inline error note.                         */
/*  3. Validate with mermaid.parse() first — it is much cheaper than   */
/*     render and returns precise error messages.                      */
/* ------------------------------------------------------------------ */

type MermaidTheme = 'light' | 'dark'
type MermaidApi = typeof import('mermaid')['default']

let mermaidSlotCounter = 0
let mermaidRenderCounter = 0
let mermaidModulePromise: Promise<MermaidApi> | null = null
let initializedMermaidTheme: MermaidTheme | null = null
const mermaidRunIds = new WeakMap<HTMLElement, number>()

/** Finished renders: `${theme}\u0000${source}` -> svg markup. */
const mermaidSvgCache = new Map<string, string>()
/** Known-bad sources: same key -> short error message (skips re-parsing). */
const mermaidFailureCache = new Map<string, string>()
/** Per-slot memory of the last successful render, for graceful mid-edit states. */
interface MermaidSlotMemory { code: string; theme: MermaidTheme; svg: string }
const mermaidSlotMemory = new Map<number, MermaidSlotMemory>()

const MERMAID_CACHE_LIMIT = 160

function lruGet<V>(map: Map<string, V>, key: string): V | undefined {
  const value = map.get(key)
  if (value !== undefined) {
    map.delete(key)
    map.set(key, value)
  }
  return value
}

function lruSet<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key)
  map.set(key, value)
  if (map.size > MERMAID_CACHE_LIMIT) {
    const oldest = map.keys().next().value
    if (oldest !== undefined) map.delete(oldest)
  }
}

const mermaidCacheKey = (theme: MermaidTheme, code: string) => `${theme}\u0000${code}`

/**
 * Safe identifier for the "this element already shows this diagram" marker.
 * Never put the cache key itself in the DOM: it contains a NUL separator,
 * and control characters make any serialized export invalid XML.
 */
function hashString(value: string): number {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
  }
  return hash >>> 0
}
const mermaidRenderTag = (theme: MermaidTheme, code: string) => `${theme}:${code.length}:${hashString(code)}`

/* ------------------------------------------------------------------ */
/* Self-healing preview                                                */
/*                                                                     */
/* React can rebuild the preview article's DOM wholesale even when the  */
/* rendered HTML is unchanged (e.g. an unrelated state update), which   */
/* wipes freshly rendered diagrams. Because `rendered` itself did not   */
/* change, no effect re-runs — so we watch the container and restore    */
/* wiped diagrams from cache ourselves. Restores are idempotent, so the */
/* observer always converges to a quiet state.                          */
/* ------------------------------------------------------------------ */

const mermaidContainerThemes = new WeakMap<HTMLElement, MermaidTheme>()
const mermaidObservers = new WeakMap<HTMLElement, MutationObserver>()
const mermaidRepairTimers = new WeakMap<HTMLElement, number>()

function mutationTouchesDiagrams(record: MutationRecord): boolean {
  for (const node of record.addedNodes) {
    if (node instanceof Element
      && (node.matches('.mermaid, .mermaid-figure, svg, .mermaid-note') || node.querySelector('.mermaid'))) {
      return true
    }
  }
  for (const node of record.removedNodes) {
    if (node instanceof Element && node.matches('.mermaid-figure, svg')) return true
  }
  return false
}

function scheduleMermaidRepair(container: HTMLElement): void {
  const existing = mermaidRepairTimers.get(container)
  if (existing !== undefined) window.clearTimeout(existing)
  const theme = mermaidContainerThemes.get(container) ?? 'light'
  const timer = window.setTimeout(() => {
    mermaidRepairTimers.delete(container)
    void initMermaid(container, theme)
  }, 60)
  mermaidRepairTimers.set(container, timer)
}

function watchMermaidContainer(container: HTMLElement): void {
  if (mermaidObservers.has(container)) return
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (mutationTouchesDiagrams(record)) {
        scheduleMermaidRepair(container)
        return
      }
    }
  })
  observer.observe(container, { childList: true, subtree: true })
  mermaidObservers.set(container, observer)
}

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Serialize one rendered Mermaid SVG into a self-contained data URL with
 * explicit pixel dimensions (cloned, so the live diagram is untouched).
 */
function serializeMermaidSvg(svgElement: SVGSVGElement): { url: string; width: number; height: number } | null {
  const viewBox = (svgElement.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  const box = svgElement.getBoundingClientRect()
  const width = Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : box.width
  const height = Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : box.height
  if (!(width > 0) || !(height > 0)) return null

  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement
    // Intrinsic size must be explicit — width="100%" collapses outside layout.
    clone.setAttribute('width', String(Math.round(width)))
    clone.setAttribute('height', String(Math.round(height)))
    clone.removeAttribute('style')
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
    return { url, width, height }
  } catch {
    return null
  }
}

/**
 * Replace a live Mermaid SVG with a vector <img> data URL. Used for the
 * standalone HTML export: fully self-contained file, stays crisp at any zoom,
 * renders everywhere with no JavaScript.
 */
export function freezeMermaidDiagrams(container: HTMLElement): number {
  let frozen = 0
  for (const svg of Array.from(container.querySelectorAll<SVGSVGElement>('.mermaid-figure > svg'))) {
    const figure = svg.parentElement
    if (!figure) continue
    const packed = serializeMermaidSvg(svg)
    if (!packed) continue
    const img = document.createElement('img')
    img.className = 'mermaid-img'
    img.width = Math.round(packed.width)
    img.height = Math.round(packed.height)
    img.alt = 'Mermaid diagram'
    img.setAttribute('role', 'img')
    img.src = packed.url
    figure.replaceChildren(img)
    frozen += 1
  }
  return frozen
}

/**
 * Shrink any rendered diagram that is taller/wider than a printable page
 * content area so it fits entirely on one page (Word-style fit-to-page).
 * Run this BEFORE page boundaries are computed so pagination sees the final
 * layout. Returns how many diagrams were scaled.
 */
export function fitMermaidDiagramsToPage(
  container: HTMLElement,
  maxHeight: number,
  maxWidth: number,
): number {
  let fitted = 0
  // Leave a little slack so page-margin masks never touch the diagram edge.
  const availableHeight = Math.max(80, maxHeight - 8)
  const availableWidth = Math.max(80, maxWidth - 4)
  for (const node of Array.from(container.querySelectorAll<HTMLElement>('.mermaid-figure > svg, .mermaid-figure > img'))) {
    const rect = node.getBoundingClientRect()
    const naturalWidth = rect.width
    const naturalHeight = rect.height
    if (!(naturalWidth > 0) || !(naturalHeight > 0)) continue
    if (naturalHeight <= availableHeight && naturalWidth <= availableWidth) continue

    const scale = Math.min(availableHeight / naturalHeight, availableWidth / naturalWidth)
    node.style.width = `${Math.floor(naturalWidth * scale)}px`
    node.style.height = `${Math.floor(naturalHeight * scale)}px`
    fitted += 1
  }
  return fitted
}

/**
 * Remove renderer bookkeeping (source placeholders, slot indexes, error
 * chips) so exported markup ships only clean content.
 */
export function stripMermaidRuntimeMarkup(container: HTMLElement): void {
  for (const element of Array.from(container.querySelectorAll<HTMLElement>('.mermaid'))) {
    element.removeAttribute('data-mermaid')
    element.removeAttribute('data-slot')
    element.removeAttribute('data-mermaid-rendered')
    element.removeAttribute('data-mermaid-error')
    element.classList.remove('mermaid-pending', 'mermaid-invalid', 'mermaid-empty')
  }
  for (const note of Array.from(container.querySelectorAll('.mermaid-note'))) note.remove()
}

/**
 * Replace live Mermaid SVGs with pre-rasterized PNG <img> data URLs.
 *
 * Whole-page SVG serialization (html-to-image's foreignObject route) is
 * unreliable once nested inline SVG trees enter the clone, so export
 * pipelines in other tools pre-rasterize diagrams instead. Rendering here —
 * one isolated SVG per canvas — is fully deterministic, and plain raster
 * images survive the capture path untouched. Default scale keeps diagrams
 * sharp at print resolution.
 */
export async function rasterizeMermaidDiagrams(container: HTMLElement, scale = 3): Promise<number> {
  let rasterized = 0
  for (const svg of Array.from(container.querySelectorAll<SVGSVGElement>('.mermaid-figure > svg'))) {
    const figure = svg.parentElement
    if (!figure) continue
    const packed = serializeMermaidSvg(svg)
    if (!packed) continue

    const decoded = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = packed.url
    })
    if (!decoded) continue

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(packed.width * scale))
    canvas.height = Math.max(1, Math.round(packed.height * scale))
    const context = canvas.getContext('2d')
    if (!context) continue
    context.drawImage(decoded, 0, 0, canvas.width, canvas.height)

    const img = document.createElement('img')
    img.className = 'mermaid-img'
    img.width = Math.round(packed.width)
    img.height = Math.round(packed.height)
    img.alt = 'Mermaid diagram'
    img.src = canvas.toDataURL('image/png')
    figure.replaceChildren(img)
    rasterized += 1
  }
  return rasterized
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`
      } catch {
        // Fall back to escaped source.
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`
  },
})

// Custom fence renderer for mermaid diagrams.
// `data-slot` gives every mermaid block in the document a stable index so the
// renderer can fall back to that slot's last good render while its source is
// temporarily invalid mid-typing. The counter resets at the start of render().
const defaultFence = markdown.renderer.rules.fence ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
markdown.renderer.rules.fence = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim().split(/\s+/)[0].toLowerCase() : ''
  if (info === 'mermaid') {
    const code = token.content.trim()
    // Encode the source so quotes/newlines cannot interfere with the HTML
    // attribute. It is decoded immediately before Mermaid renders the node.
    return `<div class="mermaid" data-mermaid="${encodeURIComponent(code)}" data-slot="${mermaidSlotCounter++}"></div>`
  }
  return defaultFence(tokens, idx, options, _env, self)
}

markdown.use(taskLists, { enabled: false, label: true })

const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noreferrer noopener')
  return defaultLinkOpen(tokens, index, options, env, self)
}

export function renderMarkdown(source: string): string {
  mermaidSlotCounter = 0
  return DOMPurify.sanitize(markdown.render(source), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'data-mermaid', 'data-slot'],
    ADD_TAGS: ['div'],
  })
}

/** Load the (large) Mermaid chunk once; later calls resolve immediately. */
function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((module) => module.default)
  }
  return mermaidModulePromise
}

function shortErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.replace(/^Error:\s*/i, '').replace(/\s+/g, ' ').trim()
  return message.length > 160 ? `${message.slice(0, 157)}…` : message || 'Invalid diagram syntax'
}

/** Write a finished SVG into the diagram node (idempotent — skips identical writes). */
function commitMermaidSvg(element: HTMLElement, svg: string, cacheKey: string): void {
  let figure = element.querySelector<HTMLElement>(':scope > .mermaid-figure')
  if (!figure) {
    figure = document.createElement('div')
    figure.className = 'mermaid-figure'
    element.replaceChildren(figure)
  }
  if (!figure.querySelector('svg') || element.dataset.mermaidRendered !== cacheKey) {
    figure.innerHTML = svg
  }
  delete element.dataset.mermaidError
  element.dataset.mermaidRendered = cacheKey
  element.classList.remove('mermaid-pending', 'mermaid-invalid', 'mermaid-empty')
  element.querySelector(':scope > .mermaid-note')?.remove()
}

function markMermaidInvalid(element: HTMLElement, message: string): void {
  // Keep whatever is already on screen (the last good render); only flag it.
  element.classList.remove('mermaid-pending')
  element.classList.add('mermaid-invalid')
  element.dataset.mermaidError = message
  const hasDiagram = Boolean(element.querySelector('.mermaid-figure svg'))
  element.classList.toggle('mermaid-empty', !hasDiagram)

  let note = element.querySelector<HTMLElement>(':scope > .mermaid-note')
  if (!note) {
    note = document.createElement('div')
    note.className = 'mermaid-note'
    element.append(note)
  }
  const text = `⚠ ${message}`
  if (note.textContent !== text) note.textContent = text
}

/**
 * Render every mermaid diagram inside `container`.
 *
 * Safe to call as often as the preview changes: cached diagrams are restored
 * synchronously, unchanged ones are skipped, and only genuinely new or edited
 * sources go through Mermaid. Stale async runs (fast typing, theme flips)
 * can never overwrite newer results.
 *
 * Pass `{ watch: false }` for scratch/capture containers that must not
 * self-heal (their content gets intentionally replaced before export).
 */
export async function initMermaid(
  container: HTMLElement,
  theme: MermaidTheme = 'light',
  options: { watch?: boolean } = {},
): Promise<void> {
  const runId = (mermaidRunIds.get(container) ?? 0) + 1
  mermaidRunIds.set(container, runId)
  mermaidContainerThemes.set(container, theme)
  if (options.watch !== false) watchMermaidContainer(container)

  let mermaid: MermaidApi
  try {
    mermaid = await loadMermaid()
  } catch {
    // Keep the preview understandable if the optional Mermaid chunk fails to load.
    if (mermaidRunIds.get(container) !== runId) return
    for (const element of Array.from(container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid]'))) {
      markMermaidInvalid(element, 'Mermaid could not be loaded. The source stays in the editor.')
    }
    return
  }
  if (mermaidRunIds.get(container) !== runId) return

  if (initializedMermaidTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'base',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    })
    initializedMermaidTheme = theme
  }

  interface PendingDiagram {
    element: HTMLElement
    encoded: string
    code: string
    slot: number
    key: string
  }

  const pending: PendingDiagram[] = []
  const elements = Array.from(container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid]'))

  // Pass 1: instant restores from cache + graceful placeholders for the rest.
  for (const element of elements) {
    const encoded = element.getAttribute('data-mermaid')
    if (!encoded) continue
    const code = decodeURIComponent(encoded)
    const slot = Number.parseInt(element.getAttribute('data-slot') ?? '-1', 10)
    const key = mermaidCacheKey(theme, code)

    const failure = lruGet(mermaidFailureCache, key)
    const cached = lruGet(mermaidSvgCache, key)
    if (cached) {
      commitMermaidSvg(element, cached, mermaidRenderTag(theme, code))
      continue
    }

    const memory = slot >= 0 ? mermaidSlotMemory.get(slot) : undefined
    if (memory && memory.theme === theme && memory.code !== code && !element.querySelector('.mermaid-figure svg')) {
      // Show this slot's last good render (dimmed) while the new source renders.
      commitMermaidSvg(element, memory.svg, `stale:${slot}`)
      element.classList.remove('mermaid-empty')
    }

    if (failure) {
      // This exact source already failed before — flag it immediately.
      markMermaidInvalid(element, failure)
      continue
    }
    element.classList.add('mermaid-pending')
    pending.push({ element, encoded, code, slot, key })
  }

  if (pending.length === 0 || mermaidRunIds.get(container) !== runId) return

  // Pass 2: validate + render sequentially. Mermaid shares global state, so
  // serial keeps output deterministic; the caches make repeats cheap.
  for (const { element, encoded, code, slot, key } of pending) {
    if (mermaidRunIds.get(container) !== runId) return
    if (!element.isConnected || element.getAttribute('data-mermaid') !== encoded) continue

    const knownFailure = lruGet(mermaidFailureCache, key)
    if (knownFailure) {
      markMermaidInvalid(element, knownFailure)
      continue
    }

    const renderId = `quietmarkdown-m-${++mermaidRenderCounter}`
    try {
      try {
        await mermaid.parse(code)
      } catch (parseError) {
        throw parseError instanceof Error ? parseError : new Error(String(parseError))
      }
      if (mermaidRunIds.get(container) !== runId) return
      if (!element.isConnected || element.getAttribute('data-mermaid') !== encoded) continue

      const { svg, bindFunctions } = await mermaid.render(renderId, code)
      if (mermaidRunIds.get(container) !== runId) return
      if (!element.isConnected || element.getAttribute('data-mermaid') !== encoded) continue

      lruSet(mermaidSvgCache, key, svg)
      if (slot >= 0) mermaidSlotMemory.set(slot, { code, theme, svg })
      commitMermaidSvg(element, svg, mermaidRenderTag(theme, code))
      bindFunctions?.(element)
    } catch (error) {
      if (!element.isConnected || element.getAttribute('data-mermaid') !== encoded) continue
      const message = shortErrorMessage(error)
      lruSet(mermaidFailureCache, key, message)
      markMermaidInvalid(element, message)
    } finally {
      // Mermaid leaves scratch nodes in <body> on failures. Careful: the
      // rendered SVG itself carries this same id once inserted, so only
      // remove matches that live OUTSIDE the preview container.
      for (const scratchId of [renderId, `d${renderId}`]) {
        const scratch = document.getElementById(scratchId)
        if (scratch && !container.contains(scratch)) scratch.remove()
      }
    }
  }
}

export function countDocument(source: string) {
  const words = source.trim() ? source.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.ceil(words / 220))
  return { words, minutes, characters: source.length }
}
