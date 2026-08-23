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
  safeFilename,
} from './lib/export'
import { computePageBoundaries, getContentHeight, getContentWidth } from './lib/pagination'
import { readStorageJson, writeStorageJson } from './lib/storage'
import { countDocument, renderMarkdown, initMermaid, freezeMermaidDiagrams, rasterizeMermaidDiagrams, stripMermaidRuntimeMarkup, fitMermaidDiagramsToPage } from './lib/markdown'
import {
  defaultExportSettings,
  type ExportSettings,
  type Theme,
  type ViewMode,
  type WatermarkPosition,
} from './types'

const starterMarkdown = `# QuietMarkdown editor field guide

*A private Markdown editor with PDF, HTML, and PNG export, ready to become something worth sharing.*

**Updated August 2026** · QuietMarkdown is a calm place to shape an idea into a **clear, portable document**. This starter note shows the Markdown features available at your fingertips, from quick inline styling to polished export-ready structure.

> Good tools make room for good thinking. Keep the words, remove the noise.

## Who QuietMarkdown is for

- **Writers** who want a focused Markdown editor and beautiful, shareable documents
- **Students** who need a private draft space with reliable PDF export
- **Professionals** who want presentable notes, proposals, and reports without sending work to a cloud service

## 1. Start with a useful brief

Every strong document has a simple job. Define the outcome before you polish the language.

- **Audience:** the person who needs to understand this
- **Decision:** the action this document should support
- **Evidence:** the details that make the decision easier
- **Next step:** the smallest useful action after reading

A sentence can be **important**, *considered*, or ~~unnecessary~~. Use inline code like \`npm run build\` when precision matters, and turn a useful reference into a [helpful link](https://www.markdownguide.org/).

## 2. Compare the options

| Approach | Best for | Tradeoff |
| --- | --- | --- |
| Write | Focused drafting | Source only |
| Split | Editing with context | Less room on small screens |
| Preview | Reading and presenting | No visible source |

## 3. Build the work in small passes

1. Write a rough first version.
2. Give every section a useful heading.
3. Cut anything that does not move the reader forward.
4. Export only when the structure feels settled.

### A practical checklist

- [x] The opening explains why this matters
- [x] The document has a clear hierarchy
- [ ] The final reader has reviewed the closing section
- [ ] The export style and watermark fit the audience

## 4. Make the document visual

![QuietMarkdown document illustration](/quietmarkdown-example.svg)

*Use local images when you want reliable private exports. Images hosted elsewhere can be affected by browser permissions during PNG export.*

## 5. Preserve exact details

Fenced code blocks stay readable in the editor, preview, HTML export, PDF print flow, and PNG pages.

\`\`\`ts
type Draft = {
  audience: string
  purpose: string
  readyToExport: boolean
}

const draft: Draft = {
  audience: 'A thoughtful reader',
  purpose: 'Make the next step obvious',
  readyToExport: true,
}
\`\`\`

> A blockquote is useful for a guiding principle, a source excerpt, or a short pull quote that deserves a pause.

---

## 5.5. From idea to a shareable document

QuietMarkdown can turn a rough idea into a clear, polished document. This diagram shows the loop: shape the structure, refine anything that is not ready, then export when the story is easy to follow.

\`\`\`mermaid
flowchart TD
    A[Start: Define Outcome] --> B{Is scope clear?}
    B -->|No| C[Refine brief & gather evidence]
    C --> B
    B -->|Yes| D[Draft structure: headings & sections]
    D --> E[Write first pass]
    E --> F{Review with audience}
    F -->|Needs work| G[Revise & restructure]
    G --> F
    F -->|Clear| H[Polish: typography, code, tables, images]
    H --> I[Choose export preset & watermark]
    I --> J[Download PDF / HTML / PNG]
    J --> K[Share with confidence]

    style A fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#1f2937
    style B fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style C fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    style D fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style E fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style F fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style G fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    style H fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style I fill:#fce7f3,stroke:#db2777,stroke-width:2px,color:#1f2937
    style J fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style K fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#1f2937

    linkStyle default stroke:#808080,stroke-width:2px

\`\`\`

*Mermaid diagrams render in real-time as you type and are included in PDF, HTML, and PNG exports.*

---

## Frequently asked questions

### Does QuietMarkdown upload my document?

No. QuietMarkdown is frontend-only. Your draft and export preferences stay in this browser unless you download or share a file yourself.

### Which export should I choose?

Use **PDF** for a print-ready document, **HTML** for a portable styled page, and **PNG pages** when you need high-resolution image pages for sharing.

### Can I use images in a document?

Yes. Local image paths are the most dependable choice for privacy and export. Images hosted on another service can be affected by that service's browser permissions.

## 6. Finish with intent

Choose **Editorial** for a warm, expressive essay, **Minimal** for a quiet working document, or **Academic** for a formal paper with numbered sections. Then open **Export** to set paper size, typography, color, and a watermark before downloading.

Your Markdown remains the source of truth. Everything else is presentation. QuietMarkdown is open source on [GitHub](https://github.com/GautamVhavle/QuietMarkdown).`

const LIBRARY_KEY = 'quietmarkdown:library:v1'
const LEGACY_DOCUMENT_KEY = 'quietmarkdown:document:v1'
const SETTINGS_KEY = 'quietmarkdown:export:v2'
const LEGACY_SETTINGS_KEY = 'quietmarkdown:export:v1'
const THEME_KEY = 'quietmarkdown:theme:v1'

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

const STARTER_TITLE = 'QuietMarkdown editor field guide'
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
      const docs = stored.docs
        .map(normalizeStoredDoc)
        .filter((doc): doc is LibraryDoc => Boolean(doc))
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
}

type EditorAction =
  | { type: 'UPDATE'; markdown: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; markdown: string }

const MAX_HISTORY = 100

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'UPDATE': {
      const current = state.markdown
      if (action.markdown === current) return state
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(current)
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return {
        markdown: action.markdown,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }
    case 'UNDO': {
      if (state.historyIndex < 0) return state
      const newIndex = state.historyIndex - 1
      if (newIndex < 0) return state
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
      }
    }
    case 'REDO': {
      const newIndex = state.historyIndex + 1
      if (newIndex >= state.history.length - 1) {
        // Reached the last known state — the markdown itself is the tip
        if (newIndex >= state.history.length) return state
        return {
          ...state,
          markdown: state.history[newIndex],
          historyIndex: newIndex,
        }
      }
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
      }
    }
    case 'RESET': {
      return {
        markdown: action.markdown,
        history: [action.markdown],
        historyIndex: 0,
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
      && legacyWatermark.position === 'center'
      && legacyWatermark.size === 42
      && legacyWatermark.rotation === -28
    return {
      ...defaultExportSettings,
      ...parsed,
      watermark: {
        ...defaultExportSettings.watermark,
        ...(shouldRefreshLegacyDefaults ? {} : parsed.watermark),
      },
    }
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
}

function ExportPage({ pageStyle, rendered, settings, capture = false, captureRef }: ExportPageProps) {
  return (
    <div
      ref={capture ? captureRef : undefined}
      className={`export-page-live export-preset-${settings.preset}${capture ? ' export-page-capture' : ''}`}
      style={pageStyle}
    >
      <Watermark settings={settings} />
      <article className="export-document" dangerouslySetInnerHTML={{ __html: rendered }} />
    </div>
  )
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
    width: `${dimensions.width}px`,
    minHeight: `${dimensions.height}px`,
  } as CSSProperties

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const preview = exportPreviewRef.current
      const capture = captureRef.current
      void Promise.all([
        preview ? initMermaid(preview) : Promise.resolve(),
        // The capture host is a scratch surface: it gets frozen into <img>s
        // right before rasterization, so it must not self-heal back to SVGs.
        capture ? initMermaid(capture, 'light', { watch: false }) : Promise.resolve(),
      ])
    })
    return () => cancelAnimationFrame(frame)
  }, [open, rendered])

  if (!open) return null

  const updateSettings = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
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
    // Render diagrams into an offscreen stage, then freeze them into
    // self-contained <img> data URLs so the downloaded file shows the
    // rendered diagrams everywhere — no JavaScript required.
    const stage = document.createElement('div')
    stage.className = 'export-document'
    stage.style.cssText = 'position:fixed;left:-12000px;top:0;width:700px;background:transparent;'
    stage.innerHTML = rendered
    document.body.append(stage)
    try {
      await initMermaid(stage, 'light', { watch: false })
      await document.fonts.ready
      freezeMermaidDiagrams(stage)
      stripMermaidRuntimeMarkup(stage)
      downloadBlob(
        createExportHtml(title, stage.innerHTML, settings),
        `${safeFilename(title)}.html`,
        'application/octet-stream',
      )
      onToast('HTML file downloaded without watermark')
    } catch {
      onToast('Could not prepare the HTML export')
    } finally {
      stage.remove()
    }
  }

  const exportPdf = async () => {
    if (!captureRef.current) return
    setExporting('pdf')
    try {
      const { PDFDocument, StandardFonts, degrees, rgb } = await import('pdf-lib')
      const pdf = await PDFDocument.create()
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)
      pdf.setTitle(title || 'Untitled document')
      pdf.setSubject('Created locally with QuietMarkdown')
      pdf.setAuthor('QuietMarkdown')
      pdf.setCreator('quietmarkdown.vercel.app')
      pdf.setProducer('QuietMarkdown')

      const hex = settings.watermark.color.replace('#', '')
      const watermarkColor = rgb(
        Number.parseInt(hex.slice(0, 2), 16) / 255,
        Number.parseInt(hex.slice(2, 4), 16) / 255,
        Number.parseInt(hex.slice(4, 6), 16) / 255,
      )
      const watermark = settings.watermark

      await renderExportPages(async (canvas) => {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PDF page encoding failed'))), 'image/png')
        })
        const image = await pdf.embedPng(await blob.arrayBuffer())
        const page = pdf.addPage([dimensions.width, dimensions.height])
        page.drawImage(image, { x: 0, y: 0, width: dimensions.width, height: dimensions.height })

        if (watermark.enabled && watermark.text.trim()) {
          const text = watermark.text.trim()
          let size = watermark.size
          let textWidth = font.widthOfTextAtSize(text, size)
          const maxWidth = dimensions.width * 0.82
          if (textWidth > maxWidth) {
            size *= maxWidth / textWidth
            textWidth = font.widthOfTextAtSize(text, size)
          }
          const options = { font, size, color: watermarkColor, opacity: watermark.opacity, rotate: degrees(watermark.rotation) }
          const padding = 54
          if (watermark.position === 'tiled') {
            const stepX = Math.max(180, size * 2.8)
            const stepY = Math.max(130, size * 2)
            for (let y = -stepY; y < dimensions.height + stepY; y += stepY) {
              for (let x = -stepX; x < dimensions.width + stepX; x += stepX) {
                page.drawText(text, { x, y, ...options })
              }
            }
          } else {
            const positions = {
              center: [(dimensions.width - textWidth) / 2, dimensions.height / 2],
              'top-left': [padding, dimensions.height - padding - size],
              'top-right': [dimensions.width - padding - textWidth, dimensions.height - padding - size],
              'bottom-left': [padding, padding],
              'bottom-right': [dimensions.width - padding - textWidth, padding],
            } as const
            const [x, y] = positions[watermark.position]
            page.drawText(text, { x, y, ...options })
          }
        }
        canvas.width = 1
        canvas.height = 1
      }, false)

      const bytes = await pdf.save({ useObjectStreams: true })
      downloadBlob(new Uint8Array(bytes).buffer, `${safeFilename(title)}.pdf`, 'application/pdf')
      const invalidDiagrams = captureRef.current?.querySelectorAll('.mermaid-invalid').length ?? 0
      onToast(invalidDiagrams > 0
        ? `PDF saved · ${invalidDiagrams} diagram${invalidDiagrams === 1 ? '' : 's'} kept their last valid version`
        : 'PDF downloaded with a watermark on every page')
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
      const invalidDiagrams = captureRef.current?.querySelectorAll('.mermaid-invalid').length ?? 0
      onToast(invalidDiagrams > 0
        ? `${pageCount} PNG pages saved · ${invalidDiagrams} diagram${invalidDiagrams === 1 ? '' : 's'} kept their last valid version`
        : `${pageCount} high-resolution PNG pages downloaded as ZIP`)
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
    // Guarantee every diagram is rendered, then swap it for a pre-rasterized
    // PNG — nested inline SVGs are unreliable through html-to-image's
    // foreignObject serialization, plain raster images are not.
    await initMermaid(captureRef.current, 'light', { watch: false })
    await rasterizeMermaidDiagrams(captureRef.current)
    // Oversized diagrams shrink to fit a single page so pagination never
    // slices through them; boundaries must be computed after this.
    fitMermaidDiagramsToPage(
      captureRef.current,
      getContentHeight(settings),
      getContentWidth(settings),
    )
    await document.fonts.ready
    const images = Array.from(captureRef.current.querySelectorAll('img'))
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)))

    // Compute smart page boundaries that respect element boundaries
    const boundaries = computePageBoundaries(captureRef.current, settings)
    const pageCount = boundaries.length
    const pixelRatio = 2
    const { toCanvas } = await import('html-to-image')
    const viewport = document.createElement('div')
    const pageSource = captureRef.current.cloneNode(true) as HTMLDivElement
    viewport.className = 'export-page-viewport'
    viewport.style.cssText = `position:fixed;left:0;top:0;z-index:-1;width:${dimensions.width}px;height:${dimensions.height}px;overflow:hidden;background:${exportStyle.background};pointer-events:none;`
    pageSource.classList.remove('export-page-capture')
    pageSource.classList.add('png-page-source')
    pageSource.style.position = 'absolute'
    pageSource.style.top = '0'
    pageSource.style.left = '0'
    // Set height to cover all pages
    const totalHeight = pageCount * dimensions.height
    pageSource.style.height = `${totalHeight}px`
    pageSource.style.minHeight = `${totalHeight}px`
    pageSource.style.transformOrigin = 'top left'
    viewport.append(pageSource)

    // The source document is continuous, but each physical page has its own
    // top and bottom margins. These masks hide the tail of the previous page
    // and anything below the current content area while html-to-image captures
    // the viewport.
    const topMask = document.createElement('div')
    const bottomMask = document.createElement('div')
    topMask.style.cssText = `position:absolute;inset:0 0 auto;height:${settings.margin}px;background:${exportStyle.background};z-index:20;pointer-events:none;`
    bottomMask.style.cssText = `position:absolute;inset:auto 0 0;height:${settings.margin}px;background:${exportStyle.background};z-index:20;pointer-events:none;`
    // Keep-together blocks moved to the next page leave their head behind in
    // the current page's content area — the flow mask paints that region over.
    const flowMask = document.createElement('div')
    flowMask.style.cssText = `position:absolute;left:0;width:100%;background:${exportStyle.background};z-index:20;pointer-events:none;display:none;`
    viewport.append(topMask, bottomMask, flowMask)
    document.body.append(viewport)

    try {
      for (let index = 0; index < pageCount; index += 1) {
        const boundary = boundaries[index]
        // Translate so the page's content area aligns with viewport top
        // boundary.top is the page start in the full document (including margin)
        pageSource.style.transform = `translate3d(0, -${boundary.top}px, 0)`
        if (boundary.blankFrom !== undefined) {
          flowMask.style.display = 'block'
          flowMask.style.top = `${Math.max(0, boundary.blankFrom - boundary.top)}px`
          flowMask.style.height = `${Math.ceil(boundary.bottom - boundary.blankFrom)}px`
        } else {
          flowMask.style.display = 'none'
        }
        const canvas = await toCanvas(viewport, {
          cacheBust: true,
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
        await processPage(canvas, index, pageCount)
      }
    } finally {
      viewport.remove()
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

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
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
          <button className="icon-button" onClick={onClose} aria-label="Close export studio">
            <X size={18} />
          </button>
        </header>

        <div className="export-body">
          <div className="export-controls scrollable">
            <section className="control-section">
              <div className="section-heading">
                <div><span>01</span><h3>Style</h3></div>
                <p>Choose a considered starting point.</p>
              </div>
              <div className="preset-row" role="list" aria-label="Document styles">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.value}
                    className={`preset-card ${settings.preset === preset.value ? 'selected' : ''}`}
                    onClick={() => choosePreset(preset.value)}
                  >
                    <span className={`preset-swatch ${preset.value}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="preset-copy">
                      <strong>{preset.label}</strong>
                      <small>{preset.detail}</small>
                    </span>
                    {settings.preset === preset.value && <Check size={14} />}
                  </button>
                ))}
              </div>

              <div className="field-row four-up">
                <label>
                  <span>Typeface</span>
                  <select
                    value={settings.font}
                    onChange={(event) => updateSettings('font', event.target.value as ExportSettings['font'])}
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
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                  </select>
                </label>
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

              <label className="range-field">
                <span><span>Page margin</span><output>{settings.margin}px</output></span>
                <input
                  type="range"
                  min="36"
                  max="104"
                  value={settings.margin}
                  onChange={(event) => updateSettings('margin', Number(event.target.value))}
                />
              </label>
            </section>

            <section className="control-section watermark-section">
              <div className="section-heading watermark-heading">
                <div>
                  <span>02</span>
                  <h3>Watermark</h3>
                  <button
                    role="switch"
                    aria-label="Toggle watermark"
                    aria-checked={settings.watermark.enabled}
                    className={`switch ${settings.watermark.enabled ? 'on' : ''}`}
                    onClick={() => updateWatermark('enabled', !settings.watermark.enabled)}
                  >
                    <i />
                  </button>
                </div>
              </div>

              <p className="watermark-scope">Applied to every PDF and PNG page. HTML and Markdown stay clean.</p>
              <div className={settings.watermark.enabled ? '' : 'controls-disabled'}>
                <label className="text-field">
                  <span>Watermark text</span>
                  <input
                    type="text"
                    maxLength={42}
                    value={settings.watermark.text}
                    placeholder="DRAFT, CONFIDENTIAL…"
                    onChange={(event) => updateWatermark('text', event.target.value)}
                  />
                </label>

                <div className="position-grid" aria-label="Watermark position">
                  {positionOptions.map((position) => (
                    <button
                      key={position.value}
                      className={settings.watermark.position === position.value ? 'selected' : ''}
                      onClick={() => updateWatermark('position', position.value)}
                    >
                      <span className={`position-icon position-${position.value}`}><i /></span>
                      {position.label}
                    </button>
                  ))}
                </div>

                <div className="field-row watermark-ranges">
                  <label className="range-field">
                    <span><span>Opacity</span><output>{Math.round(settings.watermark.opacity * 100)}%</output></span>
                    <input
                      type="range"
                      min="0.03"
                      max="0.35"
                      step="0.01"
                      value={settings.watermark.opacity}
                      onChange={(event) => updateWatermark('opacity', Number(event.target.value))}
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
                    />
                  </label>
                </div>

                <div className="field-row watermark-ranges">
                  <label className="range-field">
                    <span><span>Rotation</span><output>{settings.watermark.rotation}°</output></span>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={settings.watermark.rotation}
                      onChange={(event) => updateWatermark('rotation', Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>Color</span>
                    <span className="color-field">
                      <input
                        type="color"
                        value={settings.watermark.color}
                        onChange={(event) => updateWatermark('color', event.target.value)}
                      />
                      <span>{settings.watermark.color}</span>
                    </span>
                  </label>
                </div>
              </div>
            </section>
          </div>

          <div className="export-preview-column">
            <div className="preview-label">
              <span>PDF / PNG preview</span>
              <span>{settings.paper.toUpperCase()} · {settings.font}</span>
            </div>
            <div className="export-preview-viewport">
              <div ref={exportPreviewRef} className="export-page-scaler">
                <ExportPage pageStyle={pageStyle} rendered={rendered} settings={settings} />
              </div>
            </div>
          </div>
        </div>

        <footer className="export-footer">
          <div className="privacy-note"><ShieldCheck size={15} /> Exports are created locally in your browser.</div>
          <div className="export-actions">
            <button className="export-action" onClick={exportHtml} disabled={exporting !== null}>
              <CodeXml size={17} /><span><strong>Download HTML</strong><small>No watermark</small></span>
            </button>
            <button className="export-action" onClick={exportPng} disabled={exporting !== null}>
              <ImageDown size={17} /><span><strong>{exporting === 'png' ? 'Rendering pages…' : 'PNG pages'}</strong><small>One image per page</small></span>
            </button>
            <button className="export-action primary" onClick={exportPdf} disabled={exporting !== null}>
              <FileDown size={17} /><span><strong>{exporting === 'pdf' ? 'Creating PDF…' : 'Save as PDF'}</strong><small>Direct download</small></span>
            </button>
          </div>
        </footer>
      </section>
      <div className="capture-host" aria-hidden="true">
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
    { markdown: activeDoc.markdown, history: [activeDoc.markdown], historyIndex: 0 },
  )
  const markdown = editor.markdown
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 900px)').matches ? 'write' : 'split',
  )
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
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
  // Find & Replace state for the editor pane.
  const [findPanel, setFindPanel] = useState<'closed' | 'find' | 'replace'>('closed')
  const [findQuery, setFindQuery] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [matchIndex, setMatchIndex] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<number | null>(null)
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

  const persistLibrary = (next: Library): boolean => {
    const result = writeStorageJson(LIBRARY_KEY, next)
    if (!result.ok) {
      setStorageError(true)
      return false
    }
    setStorageError(false)
    return true
  }

  // Write the ACTIVE document's latest content into the library and storage,
  // and mirror it into component state so later operations never act on a
  // stale snapshot. Always build the next state from the returned value.
  const flushActiveDoc = (): Library => {
    const next: Library = {
      activeId,
      docs: library.docs.map((doc) => (
        doc.id === activeId ? { ...doc, title, markdown, updatedAt: Date.now() } : doc
      )),
    }
    persistLibrary(next)
    setLibrary(next)
    return next
  }

  useEffect(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      flushActiveDoc()
      setLastSavedDocument(currentDocument)
    }, 450)
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocument])

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

  // Close the documents popover or find panel on Escape.
  useEffect(() => {
    if (!docsOpen && findPanel === 'closed') return
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (docsOpen) setDocsOpen(false)
      else {
        setFindPanel('closed')
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [docsOpen, findPanel])

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

  // Keep mermaid diagrams in sync with the preview. Edits are debounced so a
  // burst of keystrokes collapses into one render pass; theme and layout
  // switches apply immediately. The diagram cache makes repeat runs cheap.
  const mermaidMetaRef = useRef<{ theme: Theme; viewMode: ViewMode } | null>(null)
  useEffect(() => {
    const previous = mermaidMetaRef.current
    mermaidMetaRef.current = { theme, viewMode }
    const metaChanged = !previous || previous.theme !== theme || previous.viewMode !== viewMode
    const timer = window.setTimeout(() => {
      if (previewScrollRef.current) void initMermaid(previewScrollRef.current, theme)
    }, metaChanged ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [rendered, theme, viewMode])

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
    const flushed = flushActiveDoc()
    const target = flushed.docs.find((doc) => doc.id === id)
    if (!target) return
    const next: Library = { activeId: id, docs: flushed.docs }
    persistLibrary(next)
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
    const flushed = flushActiveDoc()
    const docId = createDocId()
    const doc: LibraryDoc = {
      id: docId,
      title: 'Untitled document',
      markdown: '',
      // eslint-disable-next-line react-hooks/purity -- runs in a click handler, never during render
      updatedAt: Date.now(),
    }
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs].slice(0, MAX_LIBRARY_DOCS) }
    if (!persistLibrary(next)) return
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
    const current = flushActiveDoc()
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
    setLibrary(next)
    setToast('Document duplicated')
  }

  const deleteDoc = (id: string) => {
    const current = flushActiveDoc()
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
      setLibrary(next)
      setActiveId(fallback.id)
      setTitle(fallback.title)
      setEditor({ type: 'RESET', markdown: fallback.markdown })
      setLastSavedDocument(JSON.stringify({ id: fallback.id, title: fallback.title, markdown: fallback.markdown }))
    } else {
      next = { activeId, docs: remaining }
      if (!persistLibrary(next)) return
      setLibrary(next)
    }
    setDeleteArmId(null)
    setToast('Document deleted')
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

  const downloadMarkdown = () => {
    downloadBlob(markdown, `${safeFilename(title)}.md`, 'text/markdown;charset=utf-8')
    setToast('Markdown downloaded')
  }

  const loadFile = async (file: File) => {
    if (!/\.(md|markdown|mdown|txt)$/i.test(file.name)) {
      setToast('Choose a Markdown or text file')
      return
    }
    const content = await file.text()
    setEditor({ type: 'RESET', markdown: content })
    setTitle(file.name.replace(/\.(md|markdown|mdown|txt)$/i, '') || 'Untitled')
    setToast(`${file.name} opened`)
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
        <div className="brand" aria-label="QuietMarkdown home">
          <span className="brand-mark">Q</span>
          <span className="brand-name">QuietMarkdown</span>
          <span className="local-badge"><ShieldCheck size={11} /> Local</span>
        </div>

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
              onChange={(event) => setEditor({ type: 'UPDATE', markdown: event.target.value })}
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
          <div className="pane-label"><span>Preview</span><span>Live sync</span></div>
          <div ref={previewScrollRef} className="preview-scroll" onScroll={handlePreviewScroll}>
            {markdown ? (
              <article className="markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />
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
            aria-label="View QuietMarkdown on GitHub"
          >
            <GitHubMark size={13} />
            <span>View on GitHub</span>
          </a>
          <span className={`footer-save ${saveState}`}><b /> {saveState === 'saved' ? 'Saved' : 'Saving'}</span>
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
          <p>Your current draft remains safe in this browser.</p>
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
            <p className="docs-foot">Documents live only in this browser.</p>
          </div>
        </>
      )}

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
