import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Check,
  Code2,
  CodeXml,
  Columns2,
  Copy,
  Download,
  Eraser,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  Files,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  ImageDown,
  ImagePlus,
  Italic,
  Keyboard,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Moon,
  PenLine,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Sun,
  Table2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  createExportHtml,
  downloadBlob,
  getExportStyle,
  pageDimensions,
  paperSizeOptions,
  safeFilename,
} from './lib/export'
import { paginateHtml } from './lib/pagination'
import { createMarkdownPdf } from './lib/pdf-document'
import { PDF_TEMPLATES, getPdfTemplate } from './lib/pdf-templates'
import { PagedPreview } from './components/PagedPreview'
import { WelcomeTour } from './components/WelcomeTour'
import { readStorageJson, writeStorageJson } from './lib/storage'
import { countDocument, renderMarkdown } from './lib/markdown'
import {
  defaultExportSettings,
  normalizeExportSettings,
  type ExportSettings,
  type PdfTemplateId,
  type Theme,
  type ViewMode,
  type WatermarkPosition,
} from './types'

import { STARTER_TITLE, starterMarkdown } from './lib/starter'

const WELCOME_KEY = 'quietmarkdown:welcome:v1'
const LIBRARY_KEY = 'quietmarkdown:library:v1'
const LEGACY_DOCUMENT_KEY = 'quietmarkdown:document:v1'
const SETTINGS_KEY = 'quietmarkdown:export:v2'
const LEGACY_SETTINGS_KEY = 'quietmarkdown:export:v1'
const THEME_KEY = 'quietmarkdown:theme:v1'
const PAGE_PREVIEW_KEY = 'quietmarkdown:page-preview:v1'

type SaveState = 'saved' | 'saving' | 'error'

interface LibraryDoc {
  id: string
  title: string
  markdown: string
  updatedAt: number
}

interface Library {
  activeId: string
  docs: LibraryDoc[]
}

const MAX_LIBRARY_DOCS = 100

const createDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function normalizeStoredDoc(value: unknown): LibraryDoc | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as Partial<LibraryDoc>
  if (typeof doc.markdown !== 'string') return null
  return {
    id: typeof doc.id === 'string' && doc.id ? doc.id : createDocId(),
    title: typeof doc.title === 'string' ? doc.title : 'Untitled document',
    markdown: doc.markdown,
    updatedAt: typeof doc.updatedAt === 'number' ? doc.updatedAt : Date.now(),
  }
}

/**
 * Load the document library. Reads the current schema first; falls back to
 * migrating an older single-document save; finally to the starter note.
 * Corrupt or hostile payloads never crash the editor.
 */
const loadLibrary = (): Library => {
  try {
    const stored = readStorageJson<Partial<Library>>(LIBRARY_KEY).value
    if (stored && Array.isArray(stored.docs)) {
      const seenIds = new Set<string>()
      const docs = stored.docs
        .map(normalizeStoredDoc)
        .filter((doc): doc is LibraryDoc => Boolean(doc))
        .map((doc) => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id)
            return doc
          }
          const next = { ...doc, id: createDocId() }
          seenIds.add(next.id)
          return next
        })
        .slice(0, MAX_LIBRARY_DOCS)
      if (docs.length > 0) {
        const activeId = docs.some((doc) => doc.id === stored.activeId)
          ? (stored.activeId as string)
          : docs[0].id
        return { activeId, docs }
      }
    }
  } catch {
    // Fall through to legacy migration.
  }

  // Migrate the pre-library single-document format.
  let migrated: LibraryDoc | null = null
  try {
    const raw = localStorage.getItem(LEGACY_DOCUMENT_KEY) ?? localStorage.getItem('quietmarkdown:document:v2')
    if (raw) {
      const parsed = JSON.parse(raw) as { title?: unknown; markdown?: unknown }
      if (typeof parsed.markdown === 'string') {
        migrated = normalizeStoredDoc({ title: parsed.title, markdown: parsed.markdown })
      }
    }
  } catch {
    // Ignore malformed legacy data.
  }
  if (!migrated) {
    migrated = { id: createDocId(), title: STARTER_TITLE, markdown: starterMarkdown, updatedAt: Date.now() }
  }
  return { activeId: migrated.id, docs: [migrated] }
}
type FormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'link'
  | 'code'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'bullet'
  | 'number'
  | 'task'
  | 'table'
  | 'image'
  | 'divider'

interface EditorState {
  markdown: string
  history: string[]
  historyIndex: number
  coalescing: boolean
}

type EditorAction =
  | { type: 'UPDATE'; markdown: string; coalesce?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; markdown: string }

const MAX_HISTORY = 100

/**
 * Consecutive inserts or deletes of a short run (typing, IME, backspace)
 * collapse into one undo step. Large replacements (paste, format, fill)
 * always start a new entry.
 */
function isCoalesceableChange(previous: string, next: string): boolean {
  let prefix = 0
  const limit = Math.min(previous.length, next.length)
  while (prefix < limit && previous.charCodeAt(prefix) === next.charCodeAt(prefix)) prefix += 1
  let suffix = 0
  const prevTail = previous.length - prefix
  const nextTail = next.length - prefix
  while (
    suffix < prevTail
    && suffix < nextTail
    && previous.charCodeAt(previous.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix)
  ) suffix += 1
  const deleted = prevTail - suffix
  const inserted = nextTail - suffix
  return (deleted === 0 && inserted > 0 && inserted <= 8)
    || (inserted === 0 && deleted > 0 && deleted <= 8)
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // Canonical history model: history[i] IS the state at position i and
    // historyIndex always points at the current entry. UPDATE appends the
    // new state; UNDO/REDO move the pointer. Consecutive typing coalesces
    // into the current tip so a 100-entry cap is 100 edits, not 100 keys.
    case 'UPDATE': {
      if (action.markdown === state.markdown) return state
      const atTip = state.historyIndex === state.history.length - 1
      const canCoalesce = Boolean(action.coalesce)
        && state.coalescing
        && atTip
        && isCoalesceableChange(state.markdown, action.markdown)
      if (canCoalesce) {
        const history = [...state.history.slice(0, -1), action.markdown]
        return {
          markdown: action.markdown,
          history,
          historyIndex: history.length - 1,
          coalescing: true,
        }
      }
      const history = [...state.history.slice(0, state.historyIndex + 1), action.markdown]
      const trimmed = history.slice(-MAX_HISTORY)
      return {
        markdown: action.markdown,
        history: trimmed,
        historyIndex: trimmed.length - 1,
        coalescing: Boolean(action.coalesce),
      }
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
        coalescing: false,
      }
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
        coalescing: false,
      }
    }
    case 'RESET': {
      return {
        markdown: action.markdown,
        history: [action.markdown],
        historyIndex: 0,
        coalescing: false,
      }
    }
    default:
      return state
  }
}

const loadSettings = () => {
  const current = readStorageJson<Partial<ExportSettings>>(SETTINGS_KEY)
  const stored = current.value ?? readStorageJson<Partial<ExportSettings>>(LEGACY_SETTINGS_KEY).value
  if (stored && typeof stored === 'object') {
    const parsed = stored
    const legacyWatermark = parsed.watermark
    // One-time refresh of watermark defaults that shipped in an early version.
    const shouldRefreshLegacyDefaults = !current.value && legacyWatermark
      && typeof legacyWatermark === 'object'
      && legacyWatermark.position === 'center'
      && legacyWatermark.size === 42
      && legacyWatermark.rotation === -28
    return normalizeExportSettings({
      ...parsed,
      watermark: shouldRefreshLegacyDefaults ? undefined : parsed.watermark,
    })
  }
  return defaultExportSettings
}

const getInitialTheme = (): Theme => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(THEME_KEY)
  } catch {
    // Hardened storage just means we fall back to the system theme.
  }
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function GitHubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.35 9.35 0 0 1 12 6.2c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.35 4.81-4.58 5.06.36.32.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

function Watermark({ settings }: { settings: ExportSettings }) {
  const watermark = settings.watermark
  if (!watermark.enabled || !watermark.text.trim()) return null

  const style = {
    '--watermark-color': watermark.color,
    '--watermark-opacity': watermark.opacity,
    '--watermark-size': `${watermark.size}px`,
    '--watermark-rotation': `${watermark.rotation}deg`,
  } as CSSProperties

  if (watermark.position === 'tiled') {
    return (
      <div className="live-watermark-grid" style={style} aria-hidden="true">
        {Array.from({ length: 15 }, (_, index) => (
          <span key={index}>{watermark.text}</span>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`live-watermark live-watermark-${watermark.position}`}
      style={style}
      aria-hidden="true"
    >
      {watermark.text}
    </div>
  )
}

interface ExportPageProps {
  pageStyle: CSSProperties
  rendered: string
  settings: ExportSettings
  capture?: boolean
  captureRef?: RefObject<HTMLDivElement | null>
  showWatermark?: boolean
}

function ExportPage({
  pageStyle,
  rendered,
  settings,
  capture = false,
  captureRef,
  showWatermark = true,
}: ExportPageProps) {
  return (
    <div
      ref={capture ? captureRef : undefined}
      className={`export-page-live export-preset-${settings.preset}${capture ? ' export-page-capture' : ''}`}
      style={pageStyle}
    >
      {showWatermark && <Watermark settings={settings} />}
      <article className="export-document" dangerouslySetInnerHTML={{ __html: rendered }} />
    </div>
  )
}

function pdfFontStack(font: ExportSettings['font']): string {
  if (font === 'mono' || font === 'typewriter') return '"Courier New", Courier, monospace'
  if (font === 'sans' || font === 'humanist') return 'Helvetica, Arial, sans-serif'
  return 'Times, "Times New Roman", Georgia, serif'
}

function plainPreviewText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

interface ExportStudioProps {
  open: boolean
  title: string
  rendered: string
  settings: ExportSettings
  onSettingsChange: (settings: ExportSettings) => void
  onClose: () => void
  onToast: (message: string) => void
}

function ExportStudio({
  open,
  title,
  rendered,
  settings,
  onSettingsChange,
  onClose,
  onToast,
}: ExportStudioProps) {
  const captureRef = useRef<HTMLDivElement>(null)
  const exportPreviewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null)
  const [exportTab, setExportTab] = useState<'pdf' | 'html' | 'png'>('pdf')
  const pdfTemplate = getPdfTemplate(settings.pdfTemplate)
  const closeStudio = () => {
    if (exporting) return
    setExportTab('pdf')
    onClose()
  }
  const dimensions = pageDimensions[settings.paper]
  const exportStyle = getExportStyle(settings)
  const pageStyle = {
    '--export-bg': exportStyle.background,
    '--export-body': exportStyle.body,
    '--export-heading': exportStyle.heading,
    '--export-muted': exportStyle.muted,
    '--export-rule': exportStyle.rule,
    '--export-accent': settings.accent,
    '--export-font': exportStyle.fontFamily,
    '--export-line-height': exportStyle.lineHeight,
    '--export-heading-weight': exportStyle.headingWeight,
    '--export-margin': `${settings.margin}px`,
    '--page-content-height': `${dimensions.height - 2 * settings.margin}px`,
    width: `${dimensions.width}px`,
    minHeight: `${dimensions.height}px`,
  } as CSSProperties

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || exporting) return
      setExportTab('pdf')
      onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose, exporting])

  if (!open) return null

  const updateSettings = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const choosePdfTemplate = (id: PdfTemplateId) => {
    const template = getPdfTemplate(id)
    onSettingsChange({
      ...settings,
      pdfTemplate: template.id,
      paper: template.paper,
      margin: template.margin,
    })
  }

  const choosePreset = (preset: ExportSettings['preset']) => {
    const defaults = {
      editorial: { font: 'serif' as const, accent: '#d85b3f', background: '#ffffff', margin: 64 },
      minimal: { font: 'sans' as const, accent: '#2f6f68', background: '#ffffff', margin: 76 },
      academic: { font: 'classic' as const, accent: '#243b5a', background: '#ffffff', margin: 70 },
      manuscript: { font: 'typewriter' as const, accent: '#8a5c3d', background: '#fffdf8', margin: 72 },
      swiss: { font: 'sans' as const, accent: '#e33d2e', background: '#ffffff', margin: 66 },
      letterpress: { font: 'classic' as const, accent: '#9b4d35', background: '#fffaf2', margin: 72 },
      executive: { font: 'humanist' as const, accent: '#285f91', background: '#ffffff', margin: 66 },
      notebook: { font: 'mono' as const, accent: '#d69b31', background: '#fffdf5', margin: 68 },
    }[preset]
    onSettingsChange({ ...settings, preset, ...defaults })
  }

  const updateWatermark = <K extends keyof ExportSettings['watermark']>(
    key: K,
    value: ExportSettings['watermark'][K],
  ) => {
    onSettingsChange({
      ...settings,
      watermark: { ...settings.watermark, [key]: value },
    })
  }

  const exportHtml = async () => {
    try {
      await document.fonts.ready
      downloadBlob(
        createExportHtml(title, rendered, settings),
        `${safeFilename(title)}.html`,
        'text/html;charset=utf-8',
      )
      onToast('HTML file downloaded without watermark')
    } catch {
      onToast('Could not prepare the HTML export')
    }
  }

  const exportPdf = async () => {
    setExporting('pdf')
    try {
      const bytes = await createMarkdownPdf(title, rendered, settings)
      if (bytes.byteLength < 8) throw new Error('PDF export produced no pages')
      const pdfBytes = new Uint8Array(bytes.byteLength)
      pdfBytes.set(bytes)
      downloadBlob(pdfBytes.buffer, `${safeFilename(title)}.pdf`, 'application/pdf')
      onToast(
        settings.watermark.enabled && settings.watermark.text.trim()
          ? 'PDF downloaded as a real document with a watermark on every page'
          : 'PDF downloaded as a real document',
      )
    } catch (error) {
      console.error('PDF export failed', error)
      onToast('This document could not be rendered as a PDF')
    } finally {
      setExporting(null)
    }
  }

  const exportPng = async () => {
    if (!captureRef.current) return
    setExporting('png')
    try {
      const blobs: Blob[] = []
      let pageCount = 0
      await renderExportPages(async (canvas, index, total) => {
        pageCount = total
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PNG encoding failed'))), 'image/png')
        })
        blobs.push(blob)
        canvas.width = 1
        canvas.height = 1
        if (index % 2 === 1) await new Promise((resolve) => requestAnimationFrame(resolve))
      })
      const filename = safeFilename(title)
      if (blobs.length === 0) throw new Error('PNG export produced no pages')
      if (blobs.length === 1) {
        downloadBlob(blobs[0], `${filename}.png`, 'image/png')
        onToast('High-resolution PNG page downloaded')
        return
      }

      const { default: JSZip } = await import('jszip')
      const archive = new JSZip()
      blobs.forEach((blob, index) => {
        archive.file(`${filename}-page-${String(index + 1).padStart(2, '0')}.png`, blob)
      })
      const zip = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      downloadBlob(zip, `${filename}-png-pages.zip`, 'application/zip')
      onToast(`${pageCount} high-resolution PNG pages downloaded as ZIP`)
    } catch (error) {
      console.error('PNG export failed', error)
      onToast('This document could not be rendered as PNG pages')
    } finally {
      setExporting(null)
    }
  }

  const drawExportWatermark = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelRatio: number,
  ) => {
    const watermark = settings.watermark
    if (!watermark.enabled || !watermark.text.trim()) return

    context.save()
    context.globalAlpha = watermark.opacity
    context.fillStyle = watermark.color
    context.textBaseline = 'middle'
    const padding = 54 * pixelRatio
    const text = watermark.text.trim()
    let size = watermark.size * pixelRatio
    context.font = `700 ${size}px DM Sans, Arial, sans-serif`
    const maxWidth = width * 0.82
    const measuredWidth = context.measureText(text).width
    if (measuredWidth > maxWidth) {
      size *= maxWidth / measuredWidth
      context.font = `700 ${size}px DM Sans, Arial, sans-serif`
    }

    const draw = (x: number, y: number, align: CanvasTextAlign = 'center') => {
      context.save()
      context.textAlign = align
      context.translate(x, y)
      context.rotate((watermark.rotation * Math.PI) / 180)
      context.fillText(text, 0, 0)
      context.restore()
    }

    if (watermark.position === 'tiled') {
      context.textAlign = 'center'
      context.translate(width / 2, height / 2)
      context.rotate((watermark.rotation * Math.PI) / 180)
      const stepX = Math.max(180, watermark.size * 2.8) * pixelRatio
      const stepY = Math.max(130, watermark.size * 2) * pixelRatio
      for (let y = -height; y <= height; y += stepY) {
        for (let x = -width; x <= width; x += stepX) context.fillText(text, x, y)
      }
    } else {
      const positions = {
        center: [width / 2, height / 2, 'center'],
        'top-left': [padding, padding, 'left'],
        'top-right': [width - padding, padding, 'right'],
        'bottom-left': [padding, height - padding, 'left'],
        'bottom-right': [width - padding, height - padding, 'right'],
      } as const
      const [x, y, align] = positions[watermark.position]
      draw(x, y, align)
    }
    context.restore()
  }

  const renderExportPages = async (
    processPage: (canvas: HTMLCanvasElement, index: number, total: number) => Promise<void> | void,
    includeWatermark = true,
  ) => {
    if (!captureRef.current) return
    await document.fonts.ready
    const pageHtmls = paginateHtml(rendered, settings, captureRef.current)
    const article = captureRef.current.querySelector<HTMLElement>('.export-document')
    if (!article || pageHtmls.length === 0) return
    const pixelRatio = 2
    const { toCanvas } = await import('html-to-image')
    const page = captureRef.current
    page.style.height = `${dimensions.height}px`
    page.style.maxHeight = `${dimensions.height}px`
    page.style.overflow = 'hidden'

    try {
      for (let index = 0; index < pageHtmls.length; index += 1) {
        article.innerHTML = pageHtmls[index]
        const images = Array.from(captureRef.current.querySelectorAll('img'))
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
        const canvas = await toCanvas(captureRef.current, {
          cacheBust: false,
          pixelRatio,
          backgroundColor: exportStyle.background,
          width: dimensions.width,
          height: dimensions.height,
          canvasWidth: dimensions.width,
          canvasHeight: dimensions.height,
          skipAutoScale: true,
        })
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is unavailable')
        if (includeWatermark) drawExportWatermark(context, canvas.width, canvas.height, pixelRatio)
        await processPage(canvas, index, pageHtmls.length)
      }
    } finally {
      article.innerHTML = rendered
      page.style.height = ''
      page.style.maxHeight = ''
      page.style.overflow = ''
    }
  }

  const presetOptions: Array<{ value: ExportSettings['preset']; label: string; detail: string }> = [
    { value: 'editorial', label: 'Editorial', detail: 'Warm feature' },
    { value: 'minimal', label: 'Minimal', detail: 'Quiet clarity' },
    { value: 'academic', label: 'Academic', detail: 'Formal paper' },
    { value: 'manuscript', label: 'Manuscript', detail: 'Writer draft' },
    { value: 'swiss', label: 'Swiss', detail: 'Graphic modern' },
    { value: 'letterpress', label: 'Letterpress', detail: 'Classic craft' },
    { value: 'executive', label: 'Executive', detail: 'Sharp report' },
    { value: 'notebook', label: 'Notebook', detail: 'Personal notes' },
  ]

  const positionOptions: Array<{ value: WatermarkPosition; label: string }> = [
    { value: 'center', label: 'Center' },
    { value: 'tiled', label: 'Tiled' },
    { value: 'top-left', label: 'Top left' },
    { value: 'top-right', label: 'Top right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'bottom-right', label: 'Bottom right' },
  ]

  const previewPlain = plainPreviewText(rendered)
  const pdfExcerpt = previewPlain.slice(0, 280) || 'The downloaded file is a real PDF typeset from this template: selectable text, true paper size, and page breaks between complete lines.'

  const watermarkSection = (step: string) => (
    <section className="control-section watermark-section" aria-label="Watermark options">
      <div className="section-heading">
        <div className="section-title">
          <span className="step-badge" aria-hidden="true">{step}</span>
          <div>
            <h3>Watermark</h3>
            <p>{exportTab === 'pdf' ? 'Printed as real PDF text' : 'Drawn on PNG pages only'}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Toggle watermark"
          aria-checked={settings.watermark.enabled}
          className={`switch ${settings.watermark.enabled ? 'on' : ''}`}
          onClick={() => updateWatermark('enabled', !settings.watermark.enabled)}
        >
          <i />
        </button>
      </div>

      {settings.watermark.enabled ? (
        <div className="watermark-body">
          <label className="text-field">
            <span>Text</span>
            <input
              type="text"
              maxLength={42}
              value={settings.watermark.text}
              placeholder="DRAFT, CONFIDENTIAL…"
              onChange={(event) => updateWatermark('text', event.target.value)}
            />
          </label>

          <div className="option-group">
            <span className="option-label" id="watermark-position-label">Position</span>
            <div className="position-grid" role="group" aria-labelledby="watermark-position-label">
              {positionOptions.map((position) => (
                <button
                  key={position.value}
                  type="button"
                  aria-pressed={settings.watermark.position === position.value}
                  className={settings.watermark.position === position.value ? 'selected' : ''}
                  onClick={() => updateWatermark('position', position.value)}
                >
                  <span className={`position-icon position-${position.value}`} aria-hidden="true"><i /></span>
                  {position.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row two-up">
            <label className="range-field">
              <span><span>Opacity</span><output>{Math.round(settings.watermark.opacity * 100)}%</output></span>
              <input
                type="range"
                min="0.03"
                max="0.35"
                step="0.01"
                value={settings.watermark.opacity}
                onChange={(event) => updateWatermark('opacity', Number(event.target.value))}
                aria-label="Watermark opacity"
              />
            </label>
            <label className="range-field">
              <span><span>Size</span><output>{settings.watermark.size}px</output></span>
              <input
                type="range"
                min="24"
                max="120"
                value={settings.watermark.size}
                onChange={(event) => updateWatermark('size', Number(event.target.value))}
                aria-label="Watermark size"
              />
            </label>
          </div>

          <div className="field-row two-up">
            <label className="range-field">
              <span><span>Rotation</span><output>{settings.watermark.rotation}°</output></span>
              <input
                type="range"
                min="-60"
                max="60"
                value={settings.watermark.rotation}
                onChange={(event) => updateWatermark('rotation', Number(event.target.value))}
                aria-label="Watermark rotation"
              />
            </label>
            <label>
              <span>Color</span>
              <span className="color-field">
                <input
                  type="color"
                  value={settings.watermark.color}
                  onChange={(event) => updateWatermark('color', event.target.value)}
                  aria-label="Watermark color"
                />
                <span>{settings.watermark.color}</span>
              </span>
            </label>
          </div>
        </div>
      ) : (
        <p className="watermark-off-note">Watermark is off. Turn it on to stamp every page.</p>
      )}
    </section>
  )

  return (
    <div className="modal-backdrop" onMouseDown={closeStudio}>
      <section
        className="export-studio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="export-header">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> Export studio</span>
            <h2 id="export-title">Finish it beautifully.</h2>
          </div>
          <button
            className="icon-button"
            onClick={closeStudio}
            aria-label="Close export studio"
            disabled={exporting !== null}
            title={exporting ? 'Export in progress' : 'Close export studio'}
          >
            <X size={18} />
          </button>
        </header>

        <div className="export-tabs" role="tablist" aria-label="Export format">
          {([
            ['pdf', 'PDF', 'Typeset document'],
            ['html', 'HTML', 'Styled webpage'],
            ['png', 'PNG', 'Page images'],
          ] as const).map(([id, label, hint], index, tabs) => (
            <button
              key={id}
              type="button"
              id={`export-tab-${id}`}
              role="tab"
              aria-selected={exportTab === id}
              aria-controls={`export-panel-${id}`}
              tabIndex={exportTab === id ? 0 : -1}
              className={`export-tab ${exportTab === id ? 'on' : ''}`}
              onClick={() => setExportTab(id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0]
                setExportTab(next)
                document.getElementById(`export-tab-${next}`)?.focus()
              }}
            >
              <strong>{label}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </div>

        <div className="export-body">
          <div className="export-controls scrollable">
            {exportTab === 'pdf' && (
              <div role="tabpanel" id="export-panel-pdf" aria-labelledby="export-tab-pdf">
              <section className="control-section">
                <div className="section-heading">
                  <div className="section-title">
                    <span className="step-badge" aria-hidden="true">1</span>
                    <div>
                      <h3>Template</h3>
                      <p>A real typeset PDF, separate from the HTML page</p>
                    </div>
                  </div>
                  <span className="section-current">{pdfTemplate.label}</span>
                </div>
                <div className="pdf-template-grid" role="list" aria-label="PDF templates">
                  {PDF_TEMPLATES.map((template) => {
                    const selected = settings.pdfTemplate === template.id
                    return (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={selected}
                        className={`pdf-template-card ${selected ? 'selected' : ''}`}
                        onClick={() => choosePdfTemplate(template.id)}
                      >
                        <span
                          className={`pdf-mini pdf-mini-${template.chrome}`}
                          style={{
                            background: template.background,
                            color: template.body,
                            ['--mini-accent' as string]: template.accent,
                            ['--mini-rule' as string]: template.rule,
                          }}
                          aria-hidden="true"
                        >
                          <b
                            style={{
                              background: template.heading,
                              width: template.h1Align === 'center' ? '56%' : '80%',
                              alignSelf: template.h1Align === 'center' ? 'center' : 'flex-start',
                            }}
                          />
                          <i style={{ background: template.body }} />
                          <i style={{ background: template.body }} />
                          <i style={{ width: '62%', background: template.muted }} />
                          <em style={{ background: template.accent }} />
                        </span>
                        <span className="preset-copy">
                          <strong>{template.label}</strong>
                          <small>{template.detail}</small>
                        </span>
                        <span className={`card-check ${selected ? 'visible' : ''}`} aria-hidden="true">
                          <Check size={13} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
              <section className="control-section">
                <div className="section-heading">
                  <div className="section-title">
                    <span className="step-badge" aria-hidden="true">2</span>
                    <div>
                      <h3>Page setup</h3>
                      <p>Paper size and margins for this template</p>
                    </div>
                  </div>
                </div>
                <div className="field-row two-up">
                  <label>
                    <span>Paper</span>
                    <select
                      value={settings.paper}
                      onChange={(event) => updateSettings('paper', event.target.value as ExportSettings['paper'])}
                    >
                      {paperSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="range-field">
                    <span><span>Margin</span><output>{settings.margin}px</output></span>
                    <input
                      type="range"
                      min="36"
                      max="104"
                      value={settings.margin}
                      onChange={(event) => updateSettings('margin', Number(event.target.value))}
                      aria-label="PDF margin"
                    />
                  </label>
                </div>
                <p className="field-hint">Switching templates resets paper and margins. Adjust them after picking.</p>
              </section>
              {watermarkSection('3')}
              </div>
            )}

            {exportTab === 'html' && (
              <div role="tabpanel" id="export-panel-html" aria-labelledby="export-tab-html">
              <section className="control-section">
                <div className="section-heading">
                  <div className="section-title">
                    <span className="step-badge" aria-hidden="true">1</span>
                    <div>
                      <h3>Page style</h3>
                      <p>Shared by the HTML file and PNG pages</p>
                    </div>
                  </div>
                  <span className="section-current">{presetOptions.find((preset) => preset.value === settings.preset)?.label}</span>
                </div>
                <div className="preset-row" role="list" aria-label="Document styles">
                  {presetOptions.map((preset) => {
                    const selected = settings.preset === preset.value
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        aria-pressed={selected}
                        className={`preset-card ${selected ? 'selected' : ''}`}
                        onClick={() => choosePreset(preset.value)}
                      >
                        <span className={`preset-swatch ${preset.value}`} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span className="preset-copy">
                          <strong>{preset.label}</strong>
                          <small>{preset.detail}</small>
                        </span>
                        <span className={`card-check ${selected ? 'visible' : ''}`} aria-hidden="true">
                          <Check size={13} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
              <section className="control-section">
                <div className="section-heading">
                  <div className="section-title">
                    <span className="step-badge" aria-hidden="true">2</span>
                    <div>
                      <h3>Fine-tune</h3>
                      <p>Applies to HTML and PNG, never to PDF</p>
                    </div>
                  </div>
                </div>
                <div className="field-row two-up">
                  <label>
                    <span>Typeface</span>
                    <select
                      value={settings.font}
                      onChange={(event) => updateSettings('font', event.target.value as ExportSettings['font'])}
                      aria-label="Typeface"
                    >
                      <option value="serif">Literary</option>
                      <option value="classic">Classic serif</option>
                      <option value="sans">Modern sans</option>
                      <option value="humanist">Humanist</option>
                      <option value="mono">Monospace</option>
                      <option value="typewriter">Typewriter</option>
                    </select>
                  </label>
                  <label>
                    <span>Paper</span>
                    <select
                      value={settings.paper}
                      onChange={(event) => updateSettings('paper', event.target.value as ExportSettings['paper'])}
                    >
                      {paperSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-row two-up">
                  <label>
                    <span>Accent</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.accent}
                        onChange={(event) => updateSettings('accent', event.target.value)}
                        aria-label="Accent color"
                      />
                      <span>{settings.accent}</span>
                    </span>
                  </label>
                  <label>
                    <span>Page</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.background}
                        onChange={(event) => updateSettings('background', event.target.value)}
                        aria-label="Page background color"
                      />
                      <span>{settings.background}</span>
                    </span>
                  </label>
                </div>
                <p className="field-hint">HTML downloads are always clean. Watermarks only appear on PNG pages.</p>
              </section>
              </div>
            )}

            {exportTab === 'png' && (
              <div role="tabpanel" id="export-panel-png" aria-labelledby="export-tab-png">
              <section className="control-section">
                <div className="section-heading">
                  <div className="section-title">
                    <span className="step-badge" aria-hidden="true">1</span>
                    <div>
                      <h3>Page images</h3>
                      <p>Pictures of the HTML layout, not the PDF</p>
                    </div>
                  </div>
                  <button type="button" className="section-link" onClick={() => setExportTab('html')}>
                    Edit style
                  </button>
                </div>
                <p className="field-hint inline">
                  Using <strong>{presetOptions.find((preset) => preset.value === settings.preset)?.label ?? 'Editorial'}</strong> style. Multi-page documents download as one ZIP.
                </p>
                <div className="field-row two-up">
                  <label>
                    <span>Paper</span>
                    <select
                      value={settings.paper}
                      onChange={(event) => updateSettings('paper', event.target.value as ExportSettings['paper'])}
                    >
                      {paperSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="range-field">
                    <span><span>Margin</span><output>{settings.margin}px</output></span>
                    <input
                      type="range"
                      min="36"
                      max="104"
                      value={settings.margin}
                      onChange={(event) => updateSettings('margin', Number(event.target.value))}
                      aria-label="PNG margin"
                    />
                  </label>
                </div>
              </section>
              {watermarkSection('2')}
              </div>
            )}
          </div>

          <div className="export-preview-column">
            <div className="preview-label">
              <span>
                {exportTab === 'pdf' ? 'PDF template' : exportTab === 'html' ? 'HTML preview' : 'PNG preview'}
              </span>
              <span>
                {exportTab === 'pdf'
                  ? `${pdfTemplate.label} · ${settings.paper.toUpperCase()}`
                  : `${settings.paper.toUpperCase()} · ${settings.font}`}
              </span>
            </div>
            <div className="export-preview-viewport">
              {exportTab === 'pdf' ? (
                <div
                  className="pdf-look"
                  style={{
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    padding: `${Math.round(settings.margin * 0.38)}px`,
                    background: pdfTemplate.background,
                    color: pdfTemplate.body,
                    fontFamily: pdfFontStack(pdfTemplate.font),
                    ['--pdf-accent' as string]: pdfTemplate.accent,
                    ['--pdf-rule' as string]: pdfTemplate.rule,
                    ['--pdf-heading' as string]: pdfTemplate.heading,
                  }}
                >
                  {pdfTemplate.chrome === 'bar' && <span className="pdf-look-bar" aria-hidden="true" />}
                  {pdfTemplate.chrome === 'letterhead' && <span className="pdf-look-letterhead" aria-hidden="true" />}
                  {pdfTemplate.chrome === 'folio' && (
                    <>
                      <span className="pdf-look-folio-top" aria-hidden="true" />
                      <span className="pdf-look-folio-bottom" aria-hidden="true" />
                    </>
                  )}
                  <Watermark settings={settings} />
                  <p className="pdf-look-kicker" style={{ color: pdfTemplate.muted }}>PDF look · not the HTML page</p>
                  <h3 style={{
                    color: pdfTemplate.heading,
                    textAlign: pdfTemplate.h1Align,
                    fontSize: pdfTemplate.h1 + 4,
                    letterSpacing: pdfTemplate.h1Align === 'center' ? 0 : '-0.02em',
                  }}
                  >
                    {title || 'Untitled document'}
                  </h3>
                  <p
                    className="pdf-look-section"
                    style={{
                      color: pdfTemplate.heading,
                      letterSpacing: pdfTemplate.h2Style === 'uppercase' ? '0.08em' : undefined,
                      textTransform: pdfTemplate.h2Style === 'uppercase' ? 'uppercase' : undefined,
                      borderBottom: pdfTemplate.h2Style === 'rule' ? `2px solid ${pdfTemplate.accent}` : undefined,
                    }}
                  >
                    {pdfTemplate.label}
                  </p>
                  <p style={{ textIndent: pdfTemplate.firstLineIndent, lineHeight: pdfTemplate.lineHeight }}>
                    {pdfExcerpt}{previewPlain.length > 280 ? '…' : ''}
                  </p>
                  <p style={{ color: pdfTemplate.muted, lineHeight: pdfTemplate.lineHeight }}>
                    {pdfTemplate.detail}. Paper is {settings.paper.toUpperCase()}.
                  </p>
                </div>
              ) : (
                <div
                  ref={exportPreviewRef}
                  className="export-page-scaler"
                  style={{
                    width: dimensions.width * 0.42,
                    height: dimensions.height * 0.42,
                    ['--preview-scale' as string]: 0.42,
                  }}
                >
                  <ExportPage
                    pageStyle={pageStyle}
                    rendered={rendered}
                    settings={settings}
                    showWatermark={exportTab === 'png'}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="export-footer">
          <div className="privacy-note"><ShieldCheck size={15} /> Exports are created locally in your browser.</div>
          <div className="export-actions">
            {exportTab === 'html' && (
              <button type="button" className="export-action primary" onClick={exportHtml} disabled={exporting !== null}>
                <CodeXml size={17} /><span><strong>Download HTML</strong><small>No watermark</small></span>
              </button>
            )}
            {exportTab === 'png' && (
              <button type="button" className="export-action primary" onClick={exportPng} disabled={exporting !== null}>
                <ImageDown size={17} /><span><strong>{exporting === 'png' ? 'Rendering pages…' : 'PNG pages'}</strong><small>Pictures of the HTML layout</small></span>
              </button>
            )}
            {exportTab === 'pdf' && (
              <button type="button" className="export-action primary" onClick={exportPdf} disabled={exporting !== null}>
                <FileDown size={17} /><span><strong>{exporting === 'pdf' ? 'Creating PDF…' : 'Save as PDF'}</strong><small>{pdfTemplate.label} template</small></span>
              </button>
            )}
          </div>
        </footer>
      </section>
      <div className="capture-host" aria-hidden="true" style={{ width: dimensions.width }}>
        <ExportPage
          pageStyle={pageStyle}
          rendered={rendered}
          settings={settings}
          capture
          captureRef={captureRef}
        />
      </div>
    </div>
  )
}

function App() {
  const [library, setLibrary] = useState<Library>(loadLibrary)
  const [activeId, setActiveId] = useState(library.activeId)
  const activeDoc = library.docs.find((doc) => doc.id === activeId) ?? library.docs[0]
  const [title, setTitle] = useState(activeDoc.title)
  const [editor, setEditor] = useReducer(
    editorReducer,
    { markdown: activeDoc.markdown, history: [activeDoc.markdown], historyIndex: 0, coalescing: false },
  )
  const markdown = editor.markdown
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 900px)').matches ? 'write' : 'split',
  )
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(() => readStorageJson<{ seen?: boolean }>(WELCOME_KEY).value?.seen !== true)
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadSettings)
  const [lastSavedDocument, setLastSavedDocument] = useState(() => JSON.stringify({
    id: library.activeId,
    title: activeDoc.title,
    markdown: activeDoc.markdown,
  }))
  const [storageError, setStorageError] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState('')
  const [isMac, setIsMac] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showPageBreaks, setShowPageBreaks] = useState(
    () => readStorageJson<{ show?: boolean }>(PAGE_PREVIEW_KEY).value?.show === true,
  )
  // Find & Replace state for the editor pane.
  const [findPanel, setFindPanel] = useState<'closed' | 'find' | 'replace'>('closed')
  const [findQuery, setFindQuery] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [matchIndex, setMatchIndex] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<number | null>(null)
  const lastTypedAtRef = useRef(0)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const scrollSyncOriginRef = useRef<'editor' | 'preview' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The rendered preview trails typing by a single task tick (and slightly
  // longer for very large documents) so fast keystrokes stay smooth.
  const [rendered, setRendered] = useState<string>(() => renderMarkdown(activeDoc.markdown))
  useEffect(() => {
    const timer = window.setTimeout(
      () => setRendered(renderMarkdown(markdown)),
      markdown.length > 30_000 ? 160 : 0,
    )
    return () => window.clearTimeout(timer)
  }, [markdown])

  const stats = useMemo(() => countDocument(markdown), [markdown])
  const currentDocument = useMemo(
    () => JSON.stringify({ id: activeId, title, markdown }),
    [activeId, title, markdown],
  )
  const saveState: SaveState = storageError ? 'error' : currentDocument === lastSavedDocument ? 'saved' : 'saving'

  // Always read the latest library/document from here so a delayed autosave
  // cannot clobber a duplicate/delete that happened while the timer was pending.
  const persistRef = useRef({ library, activeId, title, markdown, currentDocument })
  useEffect(() => {
    persistRef.current = { library, activeId, title, markdown, currentDocument }
  })

  const persistLibrary = (next: Library): boolean => {
    const result = writeStorageJson(LIBRARY_KEY, next)
    if (!result.ok) {
      setStorageError(true)
      return false
    }
    setStorageError(false)
    return true
  }

  const closeWelcome = () => {
    writeStorageJson(WELCOME_KEY, { seen: true })
    setWelcomeOpen(false)
  }

  // Write the ACTIVE document's latest content into the library and storage,
  // and mirror it into component state so later operations never act on a
  // stale snapshot. Always build the next state from the returned value.
  const flushActiveDoc = (): { library: Library; ok: boolean } => {
    const snapshot = persistRef.current
    const next: Library = {
      activeId: snapshot.activeId,
      docs: snapshot.library.docs.map((doc) => (
        doc.id === snapshot.activeId
          ? { ...doc, title: snapshot.title, markdown: snapshot.markdown, updatedAt: Date.now() }
          : doc
      )),
    }
    const ok = persistLibrary(next)
    setLibrary(next)
    persistRef.current.library = next
    return { library: next, ok }
  }

  const markSavedIfCurrent = (ok: boolean) => {
    if (ok) setLastSavedDocument(persistRef.current.currentDocument)
  }

  useEffect(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      const { ok } = flushActiveDoc()
      markSavedIfCurrent(ok)
    }, 450)
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocument])

  useEffect(() => {
    if (!storageError) return
    const timer = window.setInterval(() => {
      const { ok } = flushActiveDoc()
      markSavedIfCurrent(ok)
    }, 4000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageError])

  // Mobile Safari often skips beforeunload; pagehide / tab-hide still fire.
  useEffect(() => {
    const persistQuietly = () => {
      const snapshot = persistRef.current
      const next: Library = {
        activeId: snapshot.activeId,
        docs: snapshot.library.docs.map((doc) => (
          doc.id === snapshot.activeId
            ? { ...doc, title: snapshot.title, markdown: snapshot.markdown, updatedAt: Date.now() }
            : doc
        )),
      }
      writeStorageJson(LIBRARY_KEY, next)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistQuietly()
    }
    window.addEventListener('pagehide', persistQuietly)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      persistQuietly()
      window.removeEventListener('pagehide', persistQuietly)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Warn before closing while a save is still in flight or storage refused.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (storageError || currentDocument !== lastSavedDocument) event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [storageError, currentDocument, lastSavedDocument])

  const writeSettingsSafely = (value: ExportSettings) => {
    const result = writeStorageJson(SETTINGS_KEY, value)
    if (!result.ok) console.warn('Export preferences could not be saved locally', result.error)
  }

  useEffect(() => {
    writeSettingsSafely(exportSettings)
  }, [exportSettings])

  useEffect(() => {
    writeStorageJson(PAGE_PREVIEW_KEY, { show: showPageBreaks })
  }, [showPageBreaks])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Theme preference is cosmetic; losing it is acceptable.
    }
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#1b1b19' : '#f7f6f3',
    )
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Close overlays that are not themselves dialogs (export/welcome have their own).
  useEffect(() => {
    if (!docsOpen && findPanel === 'closed' && !shortcutsOpen) return
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (docsOpen) setDocsOpen(false)
      else if (shortcutsOpen) setShortcutsOpen(false)
      else {
        setFindPanel('closed')
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [docsOpen, findPanel, shortcutsOpen])

  useEffect(() => {
    if (!shortcutsOpen) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.shortcuts-popover, [aria-label="Keyboard shortcuts"]')) return
      setShortcutsOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [shortcutsOpen])

  useEffect(() => {
    const clearDrag = () => setDragging(false)
    window.addEventListener('dragend', clearDrag)
    return () => window.removeEventListener('dragend', clearDrag)
  }, [])

  // Detect platform (Mac vs Windows) and mobile
  useEffect(() => {
    const checkPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const platform = navigator.platform.toLowerCase()
      const mac = platform.includes('mac') || userAgent.includes('macintosh')
      const mobile = window.innerWidth < 768 || /android|iphone|ipad|ipod/i.test(userAgent)
      setIsMac(mac)
      setIsMobile(mobile)
    }
    checkPlatform()
    window.addEventListener('resize', checkPlatform)
    return () => window.removeEventListener('resize', checkPlatform)
  }, [])

  const syncScrollPosition = (source: HTMLElement, target: HTMLElement) => {
    const sourceRange = source.scrollHeight - source.clientHeight
    const targetRange = target.scrollHeight - target.clientHeight
    if (sourceRange <= 0 || targetRange <= 0) return
    target.scrollTop = (source.scrollTop / sourceRange) * targetRange
  }

  const handleEditorScroll = () => {
    const editor = editorRef.current
    const preview = previewScrollRef.current
    if (!editor || !preview || scrollSyncOriginRef.current === 'preview') return
    scrollSyncOriginRef.current = 'editor'
    syncScrollPosition(editor, preview)
    requestAnimationFrame(() => { scrollSyncOriginRef.current = null })
  }

  const handlePreviewScroll = () => {
    const editor = editorRef.current
    const preview = previewScrollRef.current
    if (!editor || !preview || scrollSyncOriginRef.current === 'editor') return
    scrollSyncOriginRef.current = 'preview'
    syncScrollPosition(preview, editor)
    requestAnimationFrame(() => { scrollSyncOriginRef.current = null })
  }

  const setEditorValue = (next: string, selectionStart: number, selectionEnd: number) => {
    lastTypedAtRef.current = 0
    setEditor({ type: 'UPDATE', markdown: next })
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  /* ------------------------- Document library ------------------------- */

  const switchDoc = (id: string) => {
    if (id === activeId) return
    // Persist the outgoing document immediately so nothing is lost mid-switch.
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    const target = flushed.docs.find((doc) => doc.id === id)
    if (!target) return
    const next: Library = { activeId: id, docs: flushed.docs }
    persistLibrary(next)
    persistRef.current.library = next
    persistRef.current.activeId = id
    setLibrary(next)
    setActiveId(id)
    setTitle(target.title)
    setEditor({ type: 'RESET', markdown: target.markdown })
    setLastSavedDocument(JSON.stringify({ id, title: target.title, markdown: target.markdown }))
    setDocsOpen(false)
    setToast(`${target.title || 'Untitled document'} opened`)
  }

  const createDoc = () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    if (flushed.docs.length >= MAX_LIBRARY_DOCS) {
      setToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
      return
    }
    const docId = createDocId()
    const doc: LibraryDoc = {
      id: docId,
      title: 'Untitled document',
      markdown: '',
      updatedAt: Date.now(),
    }
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
    if (!persistLibrary(next)) return
    persistRef.current.library = next
    persistRef.current.activeId = doc.id
    setLibrary(next)
    setActiveId(doc.id)
    setTitle(doc.title)
    setEditor({ type: 'RESET', markdown: '' })
    setLastSavedDocument(JSON.stringify({ id: doc.id, title: doc.title, markdown: '' }))
    setDocsOpen(false)
    setToast('New document created')
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const duplicateDoc = (id: string) => {
    const { library: current } = flushActiveDoc()
    const source = current.docs.find((doc) => doc.id === id)
    if (!source) return
    if (current.docs.length >= MAX_LIBRARY_DOCS) {
      setToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
      return
    }
    const copy: LibraryDoc = { ...source, id: createDocId(), title: `${source.title || 'Untitled'} (copy)`, updatedAt: Date.now() }
    const next: Library = {
      activeId,
      docs: [copy, ...current.docs].slice(0, MAX_LIBRARY_DOCS),
    }
    if (!persistLibrary(next)) return
    persistRef.current.library = next
    setLibrary(next)
    setToast('Document duplicated')
  }

  const deleteDoc = (id: string) => {
    const { library: current } = flushActiveDoc()
    if (current.docs.length <= 1) {
      setToast('The last document cannot be deleted')
      return
    }
    const remaining = current.docs.filter((doc) => doc.id !== id)
    let next: Library
    if (id === activeId) {
      // Switch to the most recently updated remaining document.
      const fallback = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      next = { activeId: fallback.id, docs: remaining }
      if (!persistLibrary(next)) return
      persistRef.current.library = next
      persistRef.current.activeId = fallback.id
      setLibrary(next)
      setActiveId(fallback.id)
      setTitle(fallback.title)
      setEditor({ type: 'RESET', markdown: fallback.markdown })
      setLastSavedDocument(JSON.stringify({ id: fallback.id, title: fallback.title, markdown: fallback.markdown }))
    } else {
      next = { activeId, docs: remaining }
      if (!persistLibrary(next)) return
      persistRef.current.library = next
      setLibrary(next)
    }
    setDeleteArmId(null)
    setToast('Document deleted')
  }

  /**
   * Wipe the active page and begin again. Uses UPDATE (not RESET) so the
   * previous draft stays one undo away — a destructive action with a
   * safety net.
   */
  const clearActiveDoc = () => {
    setEditor({ type: 'UPDATE', markdown: '' })
    setTitle('Untitled document')
    setDocsOpen(false)
    setToast(`Page cleared — press ${isMac ? '⌘Z' : 'Ctrl+Z'} to restore`)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  /* --------------------------- Find & Replace -------------------------- */

  type Match = { start: number; end: number }
  const matches: Match[] = useMemo(() => {
    if (!findQuery) return []
    const found: Match[] = []
    const haystack = matchCase ? markdown : markdown.toLowerCase()
    const needle = matchCase ? findQuery : findQuery.toLowerCase()
    let cursor = 0
    while (found.length < 2000) {
      const index = haystack.indexOf(needle, cursor)
      if (index === -1) break
      found.push({ start: index, end: index + needle.length })
      cursor = index + Math.max(1, needle.length)
    }
    return found
  }, [markdown, findQuery, matchCase])

  // Derived clamp keeps the active match valid as the query or text changes.
  const safeMatchIndex = matches.length === 0 ? 0 : matchIndex % matches.length

  useEffect(() => {
    if (findPanel === 'closed') return
    findInputRef.current?.focus()
    findInputRef.current?.select()
  }, [findPanel])

  const gotoMatch = (offset: number) => {
    if (matches.length === 0) return
    const nextIndex = (safeMatchIndex + offset + matches.length) % matches.length
    setMatchIndex(nextIndex)
    const match = matches[nextIndex]
    const area = editorRef.current
    if (!area) return
    area.focus()
    area.setSelectionRange(match.start, match.end)
    // Scroll the matched line into view.
    const line = markdown.slice(0, match.start).split('\n').length
    area.scrollTop = Math.max(0, (line - 4) * 27)
  }

  const replaceCurrent = () => {
    const match = matches[safeMatchIndex]
    if (!match) return
    const area = editorRef.current
    if (area && !(area.selectionStart === match.start && area.selectionEnd === match.end)) {
      gotoMatch(0)
      return
    }
    const next = `${markdown.slice(0, match.start)}${replaceWith}${markdown.slice(match.end)}`
    setEditorValue(next, match.start + replaceWith.length, match.start + replaceWith.length)
  }

  const replaceAll = () => {
    if (matches.length === 0) return
    const count = matches.length
    const parts: string[] = []
    let cursor = 0
    for (const match of matches) {
      parts.push(markdown.slice(cursor, match.start), replaceWith)
      cursor = match.end
    }
    parts.push(markdown.slice(cursor))
    const next = parts.join('')
    setEditor({ type: 'UPDATE', markdown: next })
    setToast(`${count} replacement${count === 1 ? '' : 's'} made`)
  }

  const openFindPanel = (mode: 'find' | 'replace') => {
    setFindPanel(mode)
    // Seed the query with the current selection when there is one.
    const area = editorRef.current
    const selected = area ? markdown.slice(area.selectionStart, area.selectionEnd) : ''
    if (selected && !selected.includes('\n')) setFindQuery(selected)
    setMatchIndex(0)
  }

  /* ------------------------ Image embedding ---------------------------- */

  const insertIntoEditor = (snippet: string) => {
    const area = editorRef.current
    const start = area?.selectionStart ?? markdown.length
    const end = area?.selectionEnd ?? markdown.length
    const before = markdown.slice(0, start)
    const after = markdown.slice(end)
    // Keep Markdown tidy: embedded images sit on their own line.
    const prefix = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const cursor = before.length + prefix.length + snippet.length + 2
    setEditorValue(`${before}${prefix}${snippet}\n\n${after}`, cursor, cursor)
  }

  const embedImageFile = async (file: File): Promise<void> => {
    try {
      let dataUrl: string
      if (file.type === 'image/svg+xml') {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('read failed'))
          reader.readAsDataURL(file)
        })
      } else {
        // Primary decode path; falls back to <img> because createImageBitmap
        // rejects some images browsers happily render (lenient CRCs, etc).
        let sourceWidth = 0
        let sourceHeight = 0
        let drawable: ImageBitmap | HTMLImageElement | null = null
        try {
          const bitmap = await createImageBitmap(file)
          drawable = bitmap
          sourceWidth = bitmap.width
          sourceHeight = bitmap.height
        } catch {
          drawable = null
        }
        if (!drawable) {
          const objectUrl = URL.createObjectURL(file)
          try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
              const element = new Image()
              element.onload = () => resolve(element)
              element.onerror = () => reject(new Error('image could not be decoded'))
              element.src = objectUrl
            })
            drawable = image
            sourceWidth = image.naturalWidth
            sourceHeight = image.naturalHeight
          } finally {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
          }
        }
        if (!drawable || sourceWidth === 0 || sourceHeight === 0) throw new Error('undecodable image')

        const maxDim = 1600
        const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(sourceWidth * scale))
        canvas.height = Math.max(1, Math.round(sourceHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas unavailable')
        context.drawImage(drawable, 0, 0, canvas.width, canvas.height)
        if ('close' in drawable && typeof drawable.close === 'function') drawable.close()
        // PNG keeps crisp text and diagrams; JPEG keeps photos small.
        const preferPng = file.type === 'image/png' && file.size < 300_000
        dataUrl = canvas.toDataURL(preferPng ? 'image/png' : 'image/jpeg', 0.85)
      }
      if (dataUrl.length > 3_000_000) {
        setToast('Image is too large to embed locally')
        return
      }
      const name = file.name && !file.name.startsWith('blob') ? file.name.replace(/\.[a-z0-9]+$/i, '') : 'embedded image'
      insertIntoEditor(`![${name}](${dataUrl})`)
      setToast('Image embedded in the document')
    } catch {
      setToast('This image could not be embedded')
    }
  }

  const applyFormat = (action: FormatAction) => {
    const editor = editorRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selected = markdown.slice(start, end)

    const insert = (value: string, selectionOffset = value.length, selectedLength = 0) => {
      setEditorValue(
        `${markdown.slice(0, start)}${value}${markdown.slice(end)}`,
        start + selectionOffset,
        start + selectionOffset + selectedLength,
      )
    }
    const wrap = (before: string, after: string, placeholder: string) => {
      const value = selected || placeholder
      const replacement = `${before}${value}${after}`
      insert(replacement, before.length, value.length)
    }

    if (action === 'bold') return wrap('**', '**', 'bold text')
    if (action === 'italic') return wrap('_', '_', 'italic text')
    if (action === 'strike') return wrap('~~', '~~', 'strikethrough')
    if (action === 'link') return wrap('[', '](https://)', selected || 'link text')
    if (action === 'image') return wrap('![', '](https://)', selected || 'image description')
    if (action === 'code') {
      return selected.includes('\n')
        ? wrap('```\n', '\n```', 'code')
        : wrap('`', '`', 'code')
    }
    if (action === 'table') {
      const table = `${start > 0 ? '\n\n' : ''}| Column one | Column two |\n| --- | --- |\n| Value | Value |\n\n`
      return insert(table, table.indexOf('Column one'), 'Column one'.length)
    }
    if (action === 'divider') {
      const divider = `${start > 0 ? '\n\n' : ''}---\n\n`
      return insert(divider)
    }

    const lineStart = markdown.lastIndexOf('\n', start - 1) + 1
    const nextLine = markdown.indexOf('\n', end)
    const lineEnd = nextLine === -1 ? markdown.length : nextLine
    const block = markdown.slice(lineStart, lineEnd)
    const prefixes = {
      heading1: '# ',
      heading2: '## ',
      heading3: '### ',
      quote: '> ',
      bullet: '- ',
      number: '1. ',
      task: '- [ ] ',
    } as const
    const prefix = prefixes[action]
    const transformed = block
      .split('\n')
      .map((line, index) => {
        const clean = line.replace(/^(#{1,6}\s+|>\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/, '')
        if (action === 'number') return `${index + 1}. ${clean}`
        return `${prefix}${clean}`
      })
      .join('\n')
    setEditorValue(
      `${markdown.slice(0, lineStart)}${transformed}${markdown.slice(lineEnd)}`,
      lineStart,
      lineStart + transformed.length,
    )
  }

  const saveNow = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const { ok } = flushActiveDoc()
    markSavedIfCurrent(ok)
    setToast(ok ? 'Saved locally in this browser' : 'Could not save in this browser')
  }

  const downloadMarkdown = () => {
    downloadBlob(markdown, `${safeFilename(title)}.md`, 'text/markdown;charset=utf-8')
    setToast('Markdown downloaded')
  }

  const loadFile = async (file: File) => {
    if (!/\.(md|markdown|mdown|txt)$/i.test(file.name)) {
      setToast('Choose a Markdown or text file')
      return
    }
    try {
      const content = await file.text()
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const { library: flushed } = flushActiveDoc()
      if (flushed.docs.length >= MAX_LIBRARY_DOCS) {
        setToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
        return
      }
      const nextTitle = file.name.replace(/\.(md|markdown|mdown|txt)$/i, '') || 'Untitled'
      const doc: LibraryDoc = {
        id: createDocId(),
        title: nextTitle,
        markdown: content,
        updatedAt: Date.now(),
      }
      const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
      if (!persistLibrary(next)) return
      setLibrary(next)
      persistRef.current.library = next
      persistRef.current.activeId = doc.id
      setActiveId(doc.id)
      setTitle(doc.title)
      setEditor({ type: 'RESET', markdown: content })
      setLastSavedDocument(JSON.stringify({ id: doc.id, title: doc.title, markdown: content }))
      setToast(`${file.name} opened as a new document`)
    } catch {
      setToast('This file could not be opened')
    }
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void loadFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    // Images dropped onto the app embed into the document; Markdown files open.
    if (file.type.startsWith('image/')) {
      void embedImageFile(file)
      return
    }
    void loadFile(file)
  }

  const handleEditorPaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'))
    if (!file) return
    event.preventDefault()
    void embedImageFile(file)
  }

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    const modifier = event.metaKey || event.ctrlKey
    if (event.key === 'Tab') {
      event.preventDefault()
      const start = event.currentTarget.selectionStart
      const end = event.currentTarget.selectionEnd
      setEditorValue(`${markdown.slice(0, start)}  ${markdown.slice(end)}`, start + 2, start + 2)
      return
    }
    if (event.key === 'Escape' && findPanel !== 'closed') {
      event.preventDefault()
      setFindPanel('closed')
      editorRef.current?.focus()
      return
    }
    if (!modifier) return

    const key = event.key.toLowerCase()
    if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo() }
    else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo() }
    else if (key === 'b') { event.preventDefault(); applyFormat('bold') }
    else if (key === 'i') { event.preventDefault(); applyFormat('italic') }
    else if (key === 'k') { event.preventDefault(); applyFormat('link') }
    else if (key === 'e' && !event.shiftKey) { event.preventDefault(); applyFormat('code') }
    else if (key === 'f') { event.preventDefault(); openFindPanel('find') }
    else if (key === 'h') { event.preventDefault(); openFindPanel('replace') }
    else if (key === 'n' && event.altKey) { event.preventDefault(); createDoc() }
    else if (key === 's' && event.shiftKey) { event.preventDefault(); downloadMarkdown() }
    else if (key === 's') { event.preventDefault(); saveNow() }
    else if (key === 'o') { event.preventDefault(); fileInputRef.current?.click() }
    else if (key === 'e' && event.shiftKey) { event.preventDefault(); setExportOpen(true) }
    else if (key === '/' && event.shiftKey) { event.preventDefault(); setShortcutsOpen(true) }
  }

  const undo = () => {
    if (editor.historyIndex > 0) {
      setEditor({ type: 'UNDO' })
      editorRef.current?.focus()
    }
  }

  const redo = () => {
    if (editor.historyIndex < editor.history.length - 1) {
      setEditor({ type: 'REDO' })
      editorRef.current?.focus()
    }
  }

  const canUndo = editor.historyIndex > 0
  const canRedo = editor.historyIndex < editor.history.length - 1

  const shortcutHandlersRef = useRef({
    undo,
    redo,
    applyFormat,
    createDoc,
    downloadMarkdown,
    saveNow,
    openFindPanel,
  })
  useEffect(() => {
    shortcutHandlersRef.current = {
      undo,
      redo,
      applyFormat,
      createDoc,
      downloadMarkdown,
      saveNow,
      openFindPanel,
    }
  })

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.key === 'Process') return
      const modifier = event.metaKey || event.ctrlKey
      if (!modifier) return

      const target = event.target as HTMLElement | null
      if (target === editorRef.current) return

      const tag = target?.tagName
      const inField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable)
      const key = event.key.toLowerCase()
      const handlers = shortcutHandlersRef.current

      if (key === 's') {
        event.preventDefault()
        if (event.shiftKey) handlers.downloadMarkdown()
        else handlers.saveNow()
        return
      }
      if (key === 'o') {
        event.preventDefault()
        fileInputRef.current?.click()
        return
      }
      if (key === 'e' && event.shiftKey) {
        event.preventDefault()
        setExportOpen(true)
        return
      }
      if (key === '/' && event.shiftKey) {
        event.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (key === 'n' && event.altKey) {
        event.preventDefault()
        handlers.createDoc()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        handlers.openFindPanel('find')
        return
      }
      if (key === 'h') {
        event.preventDefault()
        handlers.openFindPanel('replace')
        return
      }

      if (inField) return

      if (key === 'z' && !event.shiftKey) { event.preventDefault(); handlers.undo() }
      else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); handlers.redo() }
      else if (key === 'b') { event.preventDefault(); handlers.applyFormat('bold') }
      else if (key === 'i') { event.preventDefault(); handlers.applyFormat('italic') }
      else if (key === 'k') { event.preventDefault(); handlers.applyFormat('link') }
      else if (key === 'e') { event.preventDefault(); handlers.applyFormat('code') }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toolbarItems = [
    { action: 'undo' as const, icon: ArrowLeft, label: 'Undo', shortcut: isMac ? '⌘Z' : 'Ctrl+Z', group: 'history', disabled: !canUndo },
    { action: 'redo' as const, icon: ArrowRight, label: 'Redo', shortcut: isMac ? '⌘⇧Z' : 'Ctrl+Y', group: 'history', disabled: !canRedo },
    { action: 'heading1' as const, icon: Heading1, label: 'Title', shortcut: '', group: 'headings' },
    { action: 'heading2' as const, icon: Heading2, label: 'Section heading', shortcut: '', group: 'headings' },
    { action: 'heading3' as const, icon: Heading3, label: 'Small heading', shortcut: '', group: 'headings' },
    { action: 'bold' as const, icon: Bold, label: 'Bold', shortcut: isMac ? '⌘B' : 'Ctrl+B', group: 'inline' },
    { action: 'italic' as const, icon: Italic, label: 'Italic', shortcut: isMac ? '⌘I' : 'Ctrl+I', group: 'inline' },
    { action: 'strike' as const, icon: Strikethrough, label: 'Strikethrough', shortcut: '', group: 'inline' },
    { action: 'link' as const, icon: Link2, label: 'Link', shortcut: isMac ? '⌘K' : 'Ctrl+K', group: 'insert' },
    { action: 'image' as const, icon: ImagePlus, label: 'Image', shortcut: '', group: 'insert' },
    { action: 'code' as const, icon: Code2, label: 'Code', shortcut: isMac ? '⌘E' : 'Ctrl+E', group: 'insert' },
    { action: 'table' as const, icon: Table2, label: 'Table', shortcut: '', group: 'blocks' },
    { action: 'quote' as const, icon: Quote, label: 'Quote', shortcut: '', group: 'blocks' },
    { action: 'bullet' as const, icon: List, label: 'Bullet list', shortcut: '', group: 'blocks' },
    { action: 'number' as const, icon: ListOrdered, label: 'Numbered list', shortcut: '', group: 'blocks' },
    { action: 'task' as const, icon: ListChecks, label: 'Task list', shortcut: '', group: 'blocks' },
    { action: 'divider' as const, icon: Minus, label: 'Divider', shortcut: '', group: 'blocks' },
  ]

  const handleToolbarAction = (action: string) => {
    if (action === 'undo') return undo()
    if (action === 'redo') return redo()
    applyFormat(action as FormatAction)
  }

  return (
    <div
      className="app"
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => setWelcomeOpen(true)}
          title="What is QuietMarkdown?"
        >
          <span className="brand-mark" aria-hidden="true">Q</span>
          <span className="brand-name">QuietMarkdown</span>
          <span className="local-badge" aria-hidden="true"><ShieldCheck size={11} /> Local</span>
        </button>

        <nav className="view-switcher" aria-label="Document view">
          {([
            ['write', PenLine, 'Write'],
            ['split', Columns2, 'Split'],
            ['preview', Eye, 'Preview'],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              data-view={mode}
              className={viewMode === mode ? 'active' : ''}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              <Icon size={14} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className={`quiet-button ${docsOpen ? 'active' : ''}`}
            onClick={() => setDocsOpen(!docsOpen)}
            title="Documents"
            aria-expanded={docsOpen}
          >
            <Files size={16} /><span>Documents</span>
          </button>
          <button className="quiet-button" onClick={() => fileInputRef.current?.click()} title={`Open file (${isMac ? '⌘O' : 'Ctrl+O'})`}>
            <FolderOpen size={16} /><span>Open</span>
          </button>
          <button className="quiet-button" onClick={downloadMarkdown} title={`Download Markdown (${isMac ? '⌘⇧S' : 'Ctrl+Shift+S'})`}>
            <Download size={16} /><span>Save .md</span>
          </button>
          <span className="header-divider" />
          <button
            className="icon-button"
            onClick={() => setShortcutsOpen(!shortcutsOpen)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
          >
            <Keyboard size={17} />
          </button>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button className="primary-button" onClick={() => setExportOpen(true)} aria-label="Open export studio">
            <FileDown size={16} /><span>Export</span>
          </button>
        </div>
      </header>

      <div className="document-bar">
        <div className="title-wrap">
          <FileText size={15} />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled document"
            aria-label="Document title"
          />
        </div>

        <div className="format-toolbar" aria-label="Markdown tools">
          <span className="toolbar-label">Tools</span>
          {toolbarItems.map(({ action, icon: Icon, label, shortcut, group, disabled }, index) => (
            <span className="toolbar-item-wrap" key={action}>
              {index > 0 && group !== toolbarItems[index - 1].group && <span className="toolbar-divider" />}
              <button
                className={`format-button ${disabled ? 'disabled' : ''}`}
                onClick={() => handleToolbarAction(action)}
                aria-label={label}
                aria-disabled={disabled}
                title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
                disabled={disabled}
              >
                <Icon size={15} />
              </button>
            </span>
          ))}
        </div>

        <div className="document-stats" aria-label="Document details">
          <span>{stats.words.toLocaleString()} words</span>
          <i />
          <span>{stats.minutes} min read</span>
          <span className={`save-indicator ${saveState}`}>
            <b /> {saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved' : 'Saving'}
          </span>
        </div>
      </div>

      <main className={`workspace mode-${viewMode}`}>
        <section className="editor-pane" aria-label="Markdown editor">
          <div className="pane-label">
            <span>Markdown</span>
            <span className="pane-label-actions">
              <button
                className="pane-tool"
                onClick={() => (findPanel === 'closed' ? openFindPanel('find') : setFindPanel('closed'))}
                aria-label="Find in document"
                title={`Find (${isMac ? '⌘F' : 'Ctrl+F'})`}
              >
                <Search size={12} />
              </button>
              <span>UTF-8</span>
            </span>
          </div>
          <div className="editor-wrap">
            {!markdown && (
              <div className="editor-empty" aria-hidden="true">
                <PenLine size={22} />
                <strong>Start with a thought…</strong>
                <span>or drop a Markdown file anywhere</span>
              </div>
            )}
            {findPanel !== 'closed' && (
              <div className="find-panel" role="search" aria-label={findPanel === 'replace' ? 'Find and replace' : 'Find'}>
                <div className="find-row">
                  <input
                    ref={findInputRef}
                    value={findQuery}
                    onChange={(event) => { setFindQuery(event.target.value); setMatchIndex(0) }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') { event.preventDefault(); gotoMatch(event.shiftKey ? -1 : 1) }
                    }}
                    placeholder="Find"
                    aria-label="Find text"
                  />
                  <span className="find-count" aria-live="polite">
                    {findQuery ? `${matches.length === 0 ? 0 : safeMatchIndex + 1}/${matches.length}` : ''}
                  </span>
                  <button onClick={() => gotoMatch(-1)} aria-label="Previous match" disabled={matches.length === 0}>↑</button>
                  <button onClick={() => gotoMatch(1)} aria-label="Next match" disabled={matches.length === 0}>↓</button>
                  <button
                    className={matchCase ? 'on' : ''}
                    onClick={() => { setMatchCase(!matchCase); setMatchIndex(0) }}
                    aria-label="Match case"
                    aria-pressed={matchCase}
                    title="Match case"
                  >
                    Aa
                  </button>
                  <button onClick={() => setFindPanel('closed')} aria-label="Close find panel"><X size={13} /></button>
                </div>
                {findPanel === 'replace' && (
                  <div className="find-row">
                    <input
                      value={replaceWith}
                      onChange={(event) => setReplaceWith(event.target.value)}
                      placeholder="Replace with"
                      aria-label="Replace with"
                    />
                    <button onClick={replaceCurrent} disabled={matches.length === 0} title="Replace current match">Replace</button>
                    <button onClick={replaceAll} disabled={matches.length === 0} title="Replace every match">All</button>
                  </div>
                )}
              </div>
            )}
            <textarea
              ref={editorRef}
              value={markdown}
              onChange={(event) => {
                const now = Date.now()
                const coalesce = now - lastTypedAtRef.current < 800
                lastTypedAtRef.current = now
                setEditor({ type: 'UPDATE', markdown: event.target.value, coalesce })
              }}
              onScroll={handleEditorScroll}
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              spellCheck="true"
              autoCapitalize="sentences"
              aria-label="Markdown content"
            />
          </div>
        </section>

        <div className="pane-divider" />

        <section className="preview-pane" aria-label="Rendered preview">
          <div className="pane-label">
            <span>Preview</span>
            <div className="preview-page-tools">
              {showPageBreaks && (
                <label className="paper-size-field">
                  <span className="visually-hidden">Paper size</span>
                  <select
                    value={exportSettings.paper}
                    onChange={(event) => setExportSettings({
                      ...exportSettings,
                      paper: event.target.value as ExportSettings['paper'],
                    })}
                    aria-label="Paper size"
                  >
                    {paperSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className={`pane-tool page-break-toggle ${showPageBreaks ? 'on' : ''}`}
                onClick={() => setShowPageBreaks((value) => !value)}
                aria-pressed={showPageBreaks}
                aria-label="Show page breaks"
                title="Show export page breaks"
              >
                Page breaks
              </button>
            </div>
          </div>
          <div
            ref={previewScrollRef}
            className={`preview-scroll ${showPageBreaks ? 'is-paged' : ''}`}
            onScroll={handlePreviewScroll}
          >
            {markdown ? (
              showPageBreaks ? (
                <PagedPreview html={rendered} settings={exportSettings} />
              ) : (
                <article className="markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />
              )
            ) : (
              <div className="preview-empty">
                <span className="empty-mark"><Sparkles size={20} /></span>
                <h2>Your words will look lovely here.</h2>
                <p>Start writing in Markdown, or open a file from your computer.</p>
                <button onClick={() => fileInputRef.current?.click()}><UploadCloud size={15} /> Open a file</button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-left">
          <a className="footer-privacy" href="/privacy">
            <ShieldCheck size={13} />
            <span>Private by design</span>
          </a>
        </div>
        <p className="footer-credit">
          Built with <span className="footer-heart" aria-label="love">♥</span> by{' '}
          <a href="https://gautamvhavle.xyz/" target="_blank" rel="noreferrer noopener">
            Gautam Vhavle <span aria-hidden="true">↗</span>
          </a>
        </p>
        <div className="footer-status">
          <a
            className="footer-repo"
            href="https://github.com/GautamVhavle/QuietMarkdown"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="View on GitHub"
          >
            <GitHubMark size={13} />
            <span>View on GitHub</span>
          </a>
          <span className={`footer-save ${saveState}`}><b /> {saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved' : 'Saving'}</span>
          <button onClick={() => setExportOpen(true)}><FileDown size={14} /> Export</button>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        aria-label="Open a Markdown file"
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        onChange={handleFileInput}
      />

      {dragging && (
        <div
          className="drop-overlay"
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDragging(false)
          }}
        >
          <span><UploadCloud size={28} /></span>
          <h2>Drop to open</h2>
          <p>Markdown files open as a new document. Images embed in the page you are writing. Your current draft stays in the library.</p>
        </div>
      )}

      {shortcutsOpen && !isMobile && (
        <div className="shortcuts-popover">
          <div><strong>Keyboard shortcuts</strong><button onClick={() => setShortcutsOpen(false)}><X size={14} /></button></div>
          <dl>
            <dt>Undo</dt><dd>{isMac ? '⌘ Z' : 'Ctrl+Z'}</dd>
            <dt>Redo</dt><dd>{isMac ? '⌘ ⇧ Z' : 'Ctrl+Y'}</dd>
            <dt>Bold</dt><dd>{isMac ? '⌘ B' : 'Ctrl+B'}</dd>
            <dt>Italic</dt><dd>{isMac ? '⌘ I' : 'Ctrl+I'}</dd>
            <dt>Link</dt><dd>{isMac ? '⌘ K' : 'Ctrl+K'}</dd>
            <dt>Inline code</dt><dd>{isMac ? '⌘ E' : 'Ctrl+E'}</dd>
            <dt>Find</dt><dd>{isMac ? '⌘ F' : 'Ctrl+F'}</dd>
            <dt>Find &amp; replace</dt><dd>{isMac ? '⌘ H' : 'Ctrl+H'}</dd>
            <dt>New document</dt><dd>{isMac ? '⌘ ⌥ N' : 'Ctrl+Alt+N'}</dd>
            <dt>Open file</dt><dd>{isMac ? '⌘ O' : 'Ctrl+O'}</dd>
            <dt>Save Markdown</dt><dd>{isMac ? '⌘ ⇧ S' : 'Ctrl+Shift+S'}</dd>
            <dt>Export studio</dt><dd>{isMac ? '⌘ ⇧ E' : 'Ctrl+Shift+E'}</dd>
          </dl>
        </div>
      )}

      {docsOpen && (
        <>
          <button
            className="docs-backdrop"
            aria-label="Close documents"
            onClick={() => setDocsOpen(false)}
          />
          <div className="docs-popover" role="dialog" aria-label="Documents">
            <div className="docs-head">
              <strong>Documents</strong>
              <span className="docs-count">{library.docs.length}/{MAX_LIBRARY_DOCS}</span>
              <button className="docs-new" onClick={createDoc}>
                <FilePlus2 size={13} /> New
              </button>
            </div>
            <ul className="docs-list">
              {[...library.docs]
                .sort((a, b) => (b.id === activeId ? 1 : 0) - (a.id === activeId ? 1 : 0) || b.updatedAt - a.updatedAt)
                .map((doc) => {
                  const isActive = doc.id === activeId
                  return (
                    <li key={doc.id} className={isActive ? 'active' : ''}>
                      <button className="docs-row" onClick={() => switchDoc(doc.id)} title={doc.title}>
                        <FileText size={14} />
                        <span className="docs-title">{doc.title || 'Untitled document'}{isActive ? ' · open' : ''}</span>
                        <span className="docs-time">{relativeTime(doc.updatedAt)}</span>
                      </button>
                      <button
                        className="docs-action"
                        aria-label={`Duplicate ${doc.title}`}
                        title="Duplicate"
                        onClick={() => duplicateDoc(doc.id)}
                      >
                        <Copy size={13} />
                      </button>
                      {deleteArmId === doc.id ? (
                        <button
                          className="docs-action confirm"
                          aria-label={`Confirm delete ${doc.title}`}
                          title="Confirm delete"
                          onClick={() => deleteDoc(doc.id)}
                        >
                          <Trash2 size={13} /> Sure?
                        </button>
                      ) : (
                        <button
                          className="docs-action"
                          aria-label={`Delete ${doc.title}`}
                          title="Delete"
                          onClick={() => setDeleteArmId(doc.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </li>
                  )
                })}
            </ul>
            <div className="docs-clear-row">
              <button className="docs-clear" onClick={clearActiveDoc} title="Erase this page and begin anew">
                <Eraser size={13} />
                Clear page · start fresh
              </button>
            </div>
            <p className="docs-foot">Documents live only in this browser.</p>
          </div>
        </>
      )}

      {welcomeOpen && <WelcomeTour onClose={closeWelcome} />}

      <ExportStudio
        open={exportOpen}
        title={title}
        rendered={rendered}
        settings={exportSettings}
        onSettingsChange={setExportSettings}
        onClose={() => setExportOpen(false)}
        onToast={setToast}
      />

      <div className={`toast ${toast ? 'visible' : ''}`} role="status">
        <Check size={15} /> {toast}
      </div>
    </div>
  )
}

export default App
