import { useEffect, useRef, useState } from 'react'

import { renderPdfPreviewUrls } from '../../shared/lib/pdf-raster'
import { getPdfTemplate } from '../../shared/lib/pdf-templates'
import type { ExportSettings } from '../../shared/settings/exportSettings'

interface PdfPngPagesProps {
  rendered: string
  settings: ExportSettings
}

export function PdfPngPages({ rendered, settings }: PdfPngPagesProps) {
  const [pages, setPages] = useState<Array<{ url: string; width: number; height: number }>>([])
  const [loading, setLoading] = useState(false)
  const signal = useRef({ cancelled: false })
  const isEmpty = !rendered.trim()
  const templateLabel = getPdfTemplate(settings.pdfTemplate).label
  const orientationSuffix = settings.fineTune.orientation === 'landscape' ? ' · Landscape' : ''

  useEffect(() => {
    if (!rendered.trim()) return
    signal.current = { cancelled: false }
    const current = signal.current
    let active = true
    // Heavier than it looks: full PDF typeset + rasterize. Longer debounce
    // keeps typing smooth on long documents.
    const timer = window.setTimeout(() => {
      setLoading(true)
      void renderPdfPreviewUrls(rendered, settings, current)
        .then((images) => {
          if (active && !current.cancelled) setPages(images)
        })
        .catch(() => {
          if (active) setPages([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 800)
    return () => {
      active = false
      current.cancelled = true
      window.clearTimeout(timer)
    }
  }, [rendered, settings])

  return (
    <div className="pdf-preview-list">
      {loading && pages.length === 0 && !isEmpty && <p className="pdf-empty">Rendering PDF pages…</p>}
      {isEmpty && pages.length === 0 && !loading && (
        <p className="pdf-empty">Nothing to preview yet. Write something in the editor.</p>
      )}
      {pages.map((page, index) => (
        <figure key={`${index}-${page.url.length}`} className="pdf-page-frame pdf-raster-frame">
          <img
            src={page.url}
            alt={`PDF page ${index + 1} of ${pages.length}`}
            width={page.width}
            height={page.height}
          />
          <figcaption className="paged-folio">
            Page {index + 1} of {pages.length} · {templateLabel} · {settings.fineTune.paper.toUpperCase()}{orientationSuffix}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
