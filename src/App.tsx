import {
  Bold,
  Check,
  Code2,
  CodeXml,
  Columns2,
  Download,
  Eye,
  FileDown,
  FileText,
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
  Printer,
  Quote,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Sun,
  Table2,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
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
import { countDocument, renderMarkdown } from './lib/markdown'
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

const STORAGE_KEY = 'quietmarkdown:document:v1'
const SETTINGS_KEY = 'quietmarkdown:export:v1'
const THEME_KEY = 'quietmarkdown:theme:v1'

type SaveState = 'saved' | 'saving'
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

const loadDocument = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as { title: string; markdown: string }
  } catch {
    // Invalid storage should never prevent the editor from loading.
  }
  return { title: 'QuietMarkdown editor field guide', markdown: starterMarkdown }
}

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ExportSettings>
      return {
        ...defaultExportSettings,
        ...parsed,
        watermark: {
          ...defaultExportSettings.watermark,
          ...parsed.watermark,
        },
      }
    }
  } catch {
    // Fall back to sensible defaults.
  }
  return defaultExportSettings
}

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
  const [exporting, setExporting] = useState<'png' | null>(null)
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

  if (!open) return null

  const updateSettings = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const choosePreset = (preset: ExportSettings['preset']) => {
    const defaults = {
      editorial: { font: 'serif' as const, accent: '#d85b3f', margin: 64 },
      minimal: { font: 'sans' as const, accent: '#2f6f68', margin: 76 },
      academic: { font: 'serif' as const, accent: '#243b5a', margin: 70 },
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

  const exportHtml = () => {
    downloadBlob(
      createExportHtml(title, rendered, settings),
      `${safeFilename(title)}.html`,
      'text/html;charset=utf-8',
    )
    onToast('HTML downloaded')
  }

  const exportPdf = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      onToast('Allow pop-ups to open the PDF preview')
      return
    }
    printWindow.document.open()
    printWindow.document.write(createExportHtml(title, rendered, settings, true))
    printWindow.document.close()
    onToast('PDF print preview opened')
  }

  const exportPng = async () => {
    if (!captureRef.current) return
    setExporting('png')

    try {
      await document.fonts.ready
      const images = Array.from(captureRef.current.querySelectorAll('img'))
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)))

      const captureHeight = Math.max(dimensions.height, captureRef.current.scrollHeight)
      const pageCount = Math.ceil(captureHeight / dimensions.height)
      const pixelRatio = 2
      const { toCanvas } = await import('html-to-image')
      const viewport = document.createElement('div')
      const pageSource = captureRef.current.cloneNode(true) as HTMLDivElement
      viewport.className = 'png-page-viewport'
      viewport.style.cssText = `position:fixed;left:0;top:0;z-index:-1;width:${dimensions.width}px;height:${dimensions.height}px;overflow:hidden;background:${exportStyle.background};pointer-events:none;`
      pageSource.classList.remove('export-page-capture')
      pageSource.classList.add('png-page-source')
      pageSource.style.position = 'absolute'
      pageSource.style.top = '0'
      pageSource.style.left = '0'
      pageSource.style.height = `${captureHeight}px`
      pageSource.style.minHeight = `${captureHeight}px`
      pageSource.style.transformOrigin = 'top left'
      viewport.append(pageSource)
      document.body.append(viewport)

      const pageCanvases: HTMLCanvasElement[] = []
      try {
        for (let index = 0; index < pageCount; index += 1) {
          pageSource.style.transform = `translateY(-${index * dimensions.height}px)`
          const pageCanvas = await toCanvas(viewport, {
            cacheBust: true,
            pixelRatio,
            backgroundColor: exportStyle.background,
            width: dimensions.width,
            height: dimensions.height,
            canvasWidth: dimensions.width,
            canvasHeight: dimensions.height,
            skipAutoScale: true,
          })
          const context = pageCanvas.getContext('2d')
          if (!context) throw new Error('Canvas is unavailable')
          drawPngWatermark(context, pageCanvas.width, pageCanvas.height, pixelRatio)
          pageCanvases.push(pageCanvas)
        }
      } finally {
        viewport.remove()
      }
      const blobs = await Promise.all(pageCanvases.map((canvas) => new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png')
      })))
      const filename = safeFilename(title)

      if (blobs.length === 1) {
        downloadBlob(blobs[0], `${filename}.png`, 'image/png')
        onToast('High-resolution PNG downloaded')
        return
      }

      const { default: JSZip } = await import('jszip')
      const archive = new JSZip()
      blobs.forEach((blob, index) => {
        archive.file(`${filename}-page-${String(index + 1).padStart(2, '0')}.png`, blob)
      })
      const zip = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      downloadBlob(zip, `${filename}-png-pages.zip`, 'application/zip')
      onToast(`${pageCount} high-resolution PNG pages downloaded`)
    } catch {
      onToast('This document could not be rendered as PNG pages')
    } finally {
      setExporting(null)
    }
  }

  const drawPngWatermark = (
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
    context.font = `700 ${watermark.size * pixelRatio}px DM Sans, Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const padding = 54 * pixelRatio
    const text = watermark.text.trim()

    const draw = (x: number, y: number) => {
      context.save()
      context.translate(x, y)
      context.rotate((watermark.rotation * Math.PI) / 180)
      context.fillText(text, 0, 0)
      context.restore()
    }

    if (watermark.position === 'tiled') {
      context.translate(width / 2, height / 2)
      context.rotate((watermark.rotation * Math.PI) / 180)
      const stepX = Math.max(160, watermark.size * 2.4) * pixelRatio
      const stepY = Math.max(120, watermark.size * 1.8) * pixelRatio
      for (let y = -height; y <= height; y += stepY) {
        for (let x = -width; x <= width; x += stepX) context.fillText(text, x, y)
      }
    } else {
      const positions = {
        center: [width / 2, height / 2],
        'top-left': [padding, padding],
        'top-right': [width - padding, padding],
        'bottom-left': [padding, height - padding],
        'bottom-right': [width - padding, height - padding],
      } as const
      const [x, y] = positions[watermark.position]
      draw(x, y)
    }
    context.restore()
  }

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
              <div className="preset-grid">
                {(['editorial', 'minimal', 'academic'] as const).map((preset) => (
                  <button
                    key={preset}
                    className={`preset-card ${settings.preset === preset ? 'selected' : ''}`}
                    onClick={() => choosePreset(preset)}
                  >
                    <span className={`preset-swatch ${preset}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="preset-copy">
                      <strong>{preset}</strong>
                      <small>{preset === 'editorial' ? 'Warm essay' : preset === 'minimal' ? 'Quiet sans' : 'Formal paper'}</small>
                    </span>
                    {settings.preset === preset && <Check size={14} />}
                  </button>
                ))}
              </div>

              <div className="field-row three-up">
                <label>
                  <span>Typeface</span>
                  <select
                    value={settings.font}
                    onChange={(event) => updateSettings('font', event.target.value as ExportSettings['font'])}
                  >
                    <option value="serif">Literary</option>
                    <option value="sans">Modern</option>
                    <option value="mono">Monospace</option>
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
                    />
                    <span>{settings.accent}</span>
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
                <div><span>02</span><h3>Watermark</h3></div>
                <button
                  role="switch"
                  aria-checked={settings.watermark.enabled}
                  className={`switch ${settings.watermark.enabled ? 'on' : ''}`}
                  onClick={() => updateWatermark('enabled', !settings.watermark.enabled)}
                >
                  <i />
                </button>
              </div>

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
              <span>Live preview</span>
              <span>{settings.paper.toUpperCase()} · {settings.font}</span>
            </div>
            <div className="export-preview-viewport">
              <div className="export-page-scaler">
                <ExportPage pageStyle={pageStyle} rendered={rendered} settings={settings} />
              </div>
            </div>
          </div>
        </div>

        <footer className="export-footer">
          <div className="privacy-note"><ShieldCheck size={15} /> Exports are created locally in your browser.</div>
          <div className="export-actions">
            <button className="export-action" onClick={exportHtml}>
              <CodeXml size={17} /><span><strong>HTML</strong><small>Portable page</small></span>
            </button>
            <button className="export-action" onClick={exportPng} disabled={exporting === 'png'}>
              <ImageDown size={17} /><span><strong>{exporting ? 'Rendering…' : 'PNG pages'}</strong><small>2× pages, ZIP if needed</small></span>
            </button>
            <button className="export-action primary" onClick={exportPdf}>
              <Printer size={17} /><span><strong>PDF</strong><small>Print ready</small></span>
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
  const [initialDocument] = useState(loadDocument)
  const [title, setTitle] = useState(initialDocument.title)
  const [markdown, setMarkdown] = useState(initialDocument.markdown)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadSettings)
  const [lastSavedDocument, setLastSavedDocument] = useState(() => JSON.stringify(initialDocument))
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const scrollSyncOriginRef = useRef<'editor' | 'preview' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rendered = useMemo(() => renderMarkdown(markdown), [markdown])
  const stats = useMemo(() => countDocument(markdown), [markdown])
  const currentDocument = useMemo(() => JSON.stringify({ title, markdown }), [title, markdown])
  const saveState: SaveState = currentDocument === lastSavedDocument ? 'saved' : 'saving'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, currentDocument)
      setLastSavedDocument(currentDocument)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [currentDocument])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(exportSettings))
  }, [exportSettings])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
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
    setMarkdown(next)
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(selectionStart, selectionEnd)
    })
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
    setMarkdown(content)
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
    if (file) void loadFile(file)
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
    if (!modifier) return

    const key = event.key.toLowerCase()
    if (key === 'b') { event.preventDefault(); applyFormat('bold') }
    else if (key === 'i') { event.preventDefault(); applyFormat('italic') }
    else if (key === 'k') { event.preventDefault(); applyFormat('link') }
    else if (key === 'e' && !event.shiftKey) { event.preventDefault(); applyFormat('code') }
    else if (key === 's' && event.shiftKey) { event.preventDefault(); downloadMarkdown() }
    else if (key === 'o') { event.preventDefault(); fileInputRef.current?.click() }
    else if (key === 'e' && event.shiftKey) { event.preventDefault(); setExportOpen(true) }
    else if (key === '/' && event.shiftKey) { event.preventDefault(); setShortcutsOpen(true) }
  }

  const toolbarItems = [
    { action: 'heading1' as const, icon: Heading1, label: 'Title', shortcut: '', group: 'headings' },
    { action: 'heading2' as const, icon: Heading2, label: 'Section heading', shortcut: '', group: 'headings' },
    { action: 'heading3' as const, icon: Heading3, label: 'Small heading', shortcut: '', group: 'headings' },
    { action: 'bold' as const, icon: Bold, label: 'Bold', shortcut: '⌘B', group: 'inline' },
    { action: 'italic' as const, icon: Italic, label: 'Italic', shortcut: '⌘I', group: 'inline' },
    { action: 'strike' as const, icon: Strikethrough, label: 'Strikethrough', shortcut: '', group: 'inline' },
    { action: 'link' as const, icon: Link2, label: 'Link', shortcut: '⌘K', group: 'insert' },
    { action: 'image' as const, icon: ImagePlus, label: 'Image', shortcut: '', group: 'insert' },
    { action: 'code' as const, icon: Code2, label: 'Code', shortcut: '⌘E', group: 'insert' },
    { action: 'table' as const, icon: Table2, label: 'Table', shortcut: '', group: 'blocks' },
    { action: 'quote' as const, icon: Quote, label: 'Quote', shortcut: '', group: 'blocks' },
    { action: 'bullet' as const, icon: List, label: 'Bullet list', shortcut: '', group: 'blocks' },
    { action: 'number' as const, icon: ListOrdered, label: 'Numbered list', shortcut: '', group: 'blocks' },
    { action: 'task' as const, icon: ListChecks, label: 'Task list', shortcut: '', group: 'blocks' },
    { action: 'divider' as const, icon: Minus, label: 'Divider', shortcut: '', group: 'blocks' },
  ]

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
              className={viewMode === mode ? 'active' : ''}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              <Icon size={14} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="quiet-button" onClick={() => fileInputRef.current?.click()} title="Open file (⌘O)">
            <FolderOpen size={16} /><span>Open</span>
          </button>
          <button className="quiet-button" onClick={downloadMarkdown} title="Download Markdown (⌘⇧S)">
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
          {toolbarItems.map(({ action, icon: Icon, label, shortcut, group }, index) => (
            <span className="toolbar-item-wrap" key={action}>
              {index > 0 && group !== toolbarItems[index - 1].group && <span className="toolbar-divider" />}
              <button
                className="format-button"
                onClick={() => applyFormat(action)}
                aria-label={label}
                title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
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
            <b /> {saveState === 'saved' ? 'Saved' : 'Saving'}
          </span>
        </div>
      </div>

      <main className={`workspace mode-${viewMode}`}>
        <section className="editor-pane" aria-label="Markdown editor">
          <div className="pane-label"><span>Markdown</span><span>UTF-8</span></div>
          <div className="editor-wrap">
            {!markdown && (
              <div className="editor-empty" aria-hidden="true">
                <PenLine size={22} />
                <strong>Start with a thought…</strong>
                <span>or drop a Markdown file anywhere</span>
              </div>
            )}
            <textarea
              ref={editorRef}
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              onScroll={handleEditorScroll}
              onKeyDown={handleEditorKeyDown}
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

      {shortcutsOpen && (
        <div className="shortcuts-popover">
          <div><strong>Keyboard shortcuts</strong><button onClick={() => setShortcutsOpen(false)}><X size={14} /></button></div>
          <dl>
            <dt>Bold</dt><dd>⌘ B</dd>
            <dt>Italic</dt><dd>⌘ I</dd>
            <dt>Link</dt><dd>⌘ K</dd>
            <dt>Inline code</dt><dd>⌘ E</dd>
            <dt>Open file</dt><dd>⌘ O</dd>
            <dt>Save Markdown</dt><dd>⌘ ⇧ S</dd>
            <dt>Export studio</dt><dd>⌘ ⇧ E</dd>
          </dl>
          <p>Use Ctrl instead of ⌘ on Windows.</p>
        </div>
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
