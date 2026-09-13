import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { pageDimensions } from '../lib/export'
import { paginateHtml } from '../lib/pagination'
import type { ExportSettings } from '../types'
import type { PdfTemplate } from '../lib/pdf-templates'

function pdfFontStack(font: PdfTemplate['font']): string {
  if (font === 'mono' || font === 'typewriter') return '"Courier New", Courier, monospace'
  if (font === 'sans' || font === 'humanist') return 'Helvetica, Arial, sans-serif'
  return 'Times, "Times New Roman", Georgia, serif'
}

function PdfWatermark({ settings }: { settings: ExportSettings }) {
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

interface PdfPreviewProps {
  rendered: string
  settings: ExportSettings
  template: PdfTemplate
}

const pt = (value: number) => `${(value * 96) / 72}px`

export function PdfPreview({ rendered, settings, template }: PdfPreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[]>([])
  const [scale, setScale] = useState(0.42)
  const dimensions = pageDimensions[settings.paper]

  const pageStyle = {
    '--pdf-bg': template.background,
    '--pdf-body': template.body,
    '--pdf-heading': template.heading,
    '--pdf-muted': template.muted,
    '--pdf-rule': template.rule,
    '--pdf-accent': template.accent,
    '--pdf-font': pdfFontStack(template.font),
    '--pdf-body-size': pt(template.bodySize),
    '--pdf-h1': pt(template.h1),
    '--pdf-h2': pt(template.h2),
    '--pdf-h3': pt(template.h3),
    '--pdf-line-height': template.lineHeight,
    '--pdf-para-gap': `${template.paragraphGap}px`,
    '--pdf-indent': `${template.firstLineIndent}px`,
    '--pdf-h1-align': template.h1Align,
    '--pdf-h2-transform': template.h2Style === 'uppercase' ? 'uppercase' : 'none',
    '--pdf-h2-spacing': template.h2Style === 'uppercase' ? '0.08em' : '0',
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    minHeight: `${dimensions.height}px`,
    maxHeight: `${dimensions.height}px`,
    overflow: 'hidden',
    padding: `${settings.margin}px`,
    background: template.background,
    color: template.body,
    fontFamily: pdfFontStack(template.font),
  } as CSSProperties

  useLayoutEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await document.fonts.ready
      } catch {
        // Fonts are best-effort for measurement.
      }
      if (cancelled) return
      const measure = measureRef.current
      if (!measure) return
      if (!rendered.trim()) {
        setPages([])
        return
      }
      setPages(paginateHtml(rendered, settings, measure))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [rendered, settings])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const updateScale = () => {
      const available = Math.max(200, host.clientWidth - 56)
      setScale(Math.min(0.62, available / dimensions.width))
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(host)
    return () => observer.disconnect()
  }, [dimensions.width])

  const sheets = pages.length > 0 ? pages : []

  return (
    <div ref={hostRef} className="pdf-preview-list">
      <div className="paged-measure" aria-hidden="true">
        <div ref={measureRef} className="pdf-page-live pdf-measure-page" style={pageStyle}>
          <article className="export-document" />
        </div>
      </div>

      {sheets.length === 0 && (
        <div
          className="pdf-page-frame"
          style={{ width: dimensions.width * scale, height: dimensions.height * scale }}
        >
          <div className="pdf-page-live" style={{ ...pageStyle, transform: `scale(${scale})` }}>
            {template.chrome === 'bar' && <span className="pdf-chrome-bar" aria-hidden="true" />}
            {template.chrome === 'letterhead' && <span className="pdf-chrome-letterhead" aria-hidden="true" />}
            {template.chrome === 'folio' && (
              <>
                <span className="pdf-chrome-folio-top" aria-hidden="true" />
                <span className="pdf-chrome-folio-bottom" aria-hidden="true" />
              </>
            )}
            <p className="pdf-empty">Nothing to preview yet — write something in the editor.</p>
          </div>
        </div>
      )}

      {sheets.map((pageHtml, index) => (
        <figure
          key={`${index}-${pageHtml.length}`}
          className="pdf-page-frame"
          style={{ width: dimensions.width * scale, height: dimensions.height * scale }}
        >
          <div className="pdf-page-live" style={{ ...pageStyle, transform: `scale(${scale})` }}>
            {template.chrome === 'bar' && <span className="pdf-chrome-bar" aria-hidden="true" />}
            {template.chrome === 'letterhead' && <span className="pdf-chrome-letterhead" aria-hidden="true" />}
            {template.chrome === 'folio' && (
              <>
                <span className="pdf-chrome-folio-top" aria-hidden="true" />
                <span className="pdf-chrome-folio-bottom" aria-hidden="true" />
              </>
            )}
            <PdfWatermark settings={settings} />
            <article
              className="export-document pdf-document"
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
            {template.pageNumber !== 'none' && (
              <span className={`pdf-page-number pdf-page-number-${template.pageNumber}`} aria-hidden="true">
                {index + 1}
              </span>
            )}
          </div>
          <figcaption className="paged-folio">
            Page {index + 1} of {sheets.length} · {settings.paper.toUpperCase()}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
