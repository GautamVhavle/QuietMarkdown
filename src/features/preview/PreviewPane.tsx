// Rendered preview pane: live article, optional paged view, empty state.
import { Sparkles, UploadCloud } from 'lucide-react'
import type { RefObject } from 'react'

import { paperSizeOptions } from '../../shared/export/geometry'
import type { ExportSettings } from '../../shared/settings/exportSettings'
import { PagedPreview } from '../exportStudio/PagedPreview'

interface PreviewPaneProps {
  markdown: string
  rendered: string
  settings: ExportSettings
  onSettings: (settings: ExportSettings) => void
  showPageBreaks: boolean
  onTogglePageBreaks: () => void
  previewRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  onOpenFile: () => void
}

export function PreviewPane({
  markdown,
  rendered,
  settings,
  onSettings,
  showPageBreaks,
  onTogglePageBreaks,
  previewRef,
  onScroll,
  onOpenFile,
}: PreviewPaneProps) {
  return (
    <section className="preview-pane" aria-label="Rendered preview">
      <div className="pane-label">
        <span>Preview</span>
        <div className="preview-page-tools">
          {showPageBreaks && (
            <label className="paper-size-field">
              <span className="visually-hidden">Paper size</span>
              <select
                value={settings.fineTune.paper}
                onChange={(event) => onSettings({
                  ...settings,
                  fineTune: {
                    ...settings.fineTune,
                    paper: event.target.value as ExportSettings['fineTune']['paper'],
                  },
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
            onClick={onTogglePageBreaks}
            aria-pressed={showPageBreaks}
            aria-label="Show page breaks"
            title="Show export page breaks"
          >
            Page breaks
          </button>
        </div>
      </div>
      <div
        ref={previewRef}
        className={`preview-scroll ${showPageBreaks ? 'is-paged' : ''}`}
        onScroll={onScroll}
      >
        {markdown ? (
          showPageBreaks ? (
            <PagedPreview html={rendered} settings={settings} />
          ) : (
            <article className="markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />
          )
        ) : (
          <div className="preview-empty">
            <span className="empty-mark"><Sparkles size={20} /></span>
            <h2>Your words will look lovely here.</h2>
            <p>Start writing in Markdown, or open a file from your computer.</p>
            <button onClick={onOpenFile}><UploadCloud size={15} /> Open a file</button>
          </div>
        )}
      </div>
    </section>
  )
}
