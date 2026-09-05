import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getExportStyle, pageDimensions } from '../lib/export'
import {
  computePageBoundaries,
  fitReplacedElementsToPage,
  getContentHeight,
  getContentWidth,
  type PageBoundary,
} from '../lib/pagination'
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
    minHeight: `${dimensions.height}px`,
    height: 'auto',
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
  const [boundaries, setBoundaries] = useState<PageBoundary[]>([])
  const [fittedHtml, setFittedHtml] = useState(html)
  const [scale, setScale] = useState(0.5)
  const dimensions = pageDimensions[settings.paper]
  const exportStyle = getExportStyle(settings)
  const pageStyle = pageStyleFor(settings)

  useLayoutEffect(() => {
    let cancelled = false
    const run = async () => {
      await document.fonts.ready
      if (cancelled) return
      const measure = measureRef.current
      if (!measure) return
      fitReplacedElementsToPage(measure, getContentHeight(settings), getContentWidth(settings))
      const article = measure.querySelector('.export-document')
      setFittedHtml(article?.innerHTML ?? html)
      setBoundaries(computePageBoundaries(measure, settings))
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

  const pages = boundaries.length > 0 ? boundaries : [{ top: 0, bottom: dimensions.height }]

  return (
    <div ref={hostRef} className="paged-preview">
      <div className="paged-measure" aria-hidden="true">
        <div
          ref={measureRef}
          className={`export-page-live export-preset-${settings.preset} export-page-capture paged-measure-page`}
          style={pageStyle}
        >
          <article className="export-document" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      {pages.map((boundary, index) => (
        <figure
          key={`${boundary.top}-${index}`}
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
              height: `${dimensions.height}px`,
              minHeight: `${dimensions.height}px`,
              overflow: 'hidden',
              transform: `scale(${scale})`,
            }}
          >
            <article
              className="export-document paged-sheet-source"
              style={{ transform: `translate3d(0, -${boundary.top}px, 0)` }}
              dangerouslySetInnerHTML={{ __html: fittedHtml }}
            />
            <div
              className="paged-sheet-mask paged-sheet-mask-top"
              style={{ height: settings.margin, background: exportStyle.background }}
            />
            <div
              className="paged-sheet-mask paged-sheet-mask-bottom"
              style={{ height: settings.margin, background: exportStyle.background }}
            />
            {boundary.blankFrom !== undefined && (
              <div
                className="paged-sheet-mask paged-sheet-mask-flow"
                style={{
                  top: Math.max(0, boundary.blankFrom - boundary.top),
                  height: Math.ceil(boundary.bottom - boundary.blankFrom),
                  background: exportStyle.background,
                }}
              />
            )}
          </div>
          <figcaption className="paged-folio">
            Page {index + 1} of {pages.length} · {settings.paper.toUpperCase()}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
