import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getExportStyle, pageDimensions } from '../lib/export'
import { paginateHtml } from '../lib/pagination'
import type { ExportSettings } from '../types'

function pageStyleFor(settings: ExportSettings): CSSProperties {
  const dimensions = pageDimensions[settings.paper]
  const exportStyle = getExportStyle(settings)
  return {
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
    height: `${dimensions.height}px`,
    minHeight: `${dimensions.height}px`,
    maxHeight: `${dimensions.height}px`,
    overflow: 'hidden',
    background: exportStyle.background,
  } as CSSProperties
}

interface PagedPreviewProps {
  html: string
  settings: ExportSettings
}

export function PagedPreview({ html, settings }: PagedPreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[]>([html])
  const [scale, setScale] = useState(0.5)
  const dimensions = pageDimensions[settings.paper]
  const pageStyle = pageStyleFor(settings)

  useLayoutEffect(() => {
    let cancelled = false
    const run = async () => {
      await document.fonts.ready
      if (cancelled) return
      const measure = measureRef.current
      if (!measure) return
      setPages(paginateHtml(html, settings, measure))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [html, settings])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const updateScale = () => {
      const available = Math.max(160, host.clientWidth - 28)
      setScale(Math.min(1, available / dimensions.width))
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(host)
    return () => observer.disconnect()
  }, [dimensions.width])

  const sheets = pages.length > 0 ? pages : ['']

  return (
    <div ref={hostRef} className="paged-preview">
      <div className="paged-measure" aria-hidden="true">
        <div
          ref={measureRef}
          className={`export-page-live export-preset-${settings.preset} export-page-capture paged-measure-page`}
          style={pageStyle}
        >
          <article className="export-document" />
        </div>
      </div>

      {sheets.map((pageHtml, index) => (
        <figure
          key={`${index}-${pageHtml.length}`}
          className="paged-sheet-frame"
          style={{
            width: dimensions.width * scale,
            height: dimensions.height * scale,
          }}
        >
          <div
            className={`export-page-live export-preset-${settings.preset} paged-sheet`}
            style={{
              ...pageStyle,
              transform: `scale(${scale})`,
            }}
          >
            <article
              className="export-document"
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
          </div>
          <figcaption className="paged-folio">
            Page {index + 1} of {sheets.length} · {settings.paper.toUpperCase()}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
