// Live HTML export preview page + watermark overlay. Shared by the
// export studio preview and the HTML export path styling.
import type { CSSProperties } from 'react'

import type { ExportSettings } from '../../shared/settings/exportSettings'

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
  showWatermark?: boolean
}

export function ExportPage({
  pageStyle,
  rendered,
  settings,
  showWatermark = true,
}: ExportPageProps) {
  return (
    <div
      className={`export-page-live export-preset-${settings.preset}`}
      style={pageStyle}
    >
      {showWatermark && <Watermark settings={settings} />}
      <article className="export-document" dangerouslySetInnerHTML={{ __html: rendered }} />
    </div>
  )
}

