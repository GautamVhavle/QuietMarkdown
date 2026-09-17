// Export studio dialog: PDF/HTML/PNG tabs, fine-tune controls, live
// preview, and download actions. Moved verbatim from App.tsx.
import { Check, CodeXml, FileDown, ImageDown, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'

import { getExportStyle } from '../../shared/export/exportCss'
import { createExportHtml } from '../../shared/export/exportHtml'
import { orientedDimensions, tuneMarginPx } from '../../shared/export/geometry'
import { createMarkdownPdf } from '../../shared/export/pdf/pdfDocument'
import { downloadBlob } from '../../shared/lib/download'
import { smartFilename } from '../../shared/lib/filenames'
import { ensureExportFont } from '../../shared/lib/fonts'
import { renderPdfToPngs } from '../../shared/lib/pdf-raster'
import { PDF_TEMPLATES, getPdfTemplate } from '../../shared/lib/pdf-templates'
import type { ExportSettings, FineTuneSettings, PdfTemplateId, WatermarkPosition } from '../../shared/settings/exportSettings'

import { ExportPage } from './ExportPage'
import { FineTunePanel } from './FineTunePanel'
import { PdfPngPages } from './PdfPngPages'

interface ExportStudioProps {
  open: boolean
  title: string
  markdown: string
  rendered: string
  settings: ExportSettings
  onSettingsChange: (settings: ExportSettings) => void
  onClose: () => void
  onToast: (message: string) => void
}

export function ExportStudio({
  open,
  title,
  markdown,
  rendered,
  settings,
  onSettingsChange,
  onClose,
  onToast,
}: ExportStudioProps) {
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null)
  const [exportTab, setExportTab] = useState<'pdf' | 'html' | 'png'>('pdf')
  const pdfTemplate = getPdfTemplate(settings.pdfTemplate)
  const closeStudio = () => {
    if (exporting) return
    setExportTab('pdf')
    onClose()
  }
  const tune = settings.fineTune
  const dimensions = orientedDimensions(tune.paper, tune.orientation)
  const tuneMargin = tuneMarginPx(tune)
  const exportStyle = getExportStyle(settings)
  const pageStyle = {
    '--export-bg': exportStyle.background,
    '--export-body': tune.bodyColor,
    '--export-heading': tune.headingColor,
    '--export-muted': exportStyle.muted,
    '--export-rule': exportStyle.rule,
    '--export-accent': tune.linkColor,
    '--export-font': exportStyle.fontFamily,
    '--export-line-height': exportStyle.lineHeight,
    '--export-heading-weight': exportStyle.headingWeight,
    '--export-margin': `${tuneMargin}px`,
    '--page-content-height': `${dimensions.height - 2 * tuneMargin}px`,
    width: `${dimensions.width}px`,
    minHeight: `${dimensions.height}px`,
  } as CSSProperties

  useEffect(() => {
    ensureExportFont(tune.bodyFont)
    ensureExportFont(tune.headingFont)
  }, [tune.bodyFont, tune.headingFont])

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

  const choosePdfTemplate = (id: PdfTemplateId) => {
    const template = getPdfTemplate(id)
    onSettingsChange({
      ...settings,
      pdfTemplate: template.id,
      fineTune: {
        ...settings.fineTune,
        paper: template.paper,
        bodyColor: template.body,
        headingColor: template.heading,
        h1Color: template.heading,
        h2Color: template.heading,
        h3Color: template.heading,
        linkColor: template.accent,
      },
    })
  }

  const choosePreset = (preset: ExportSettings['preset']) => {
    const defaults = {
      editorial: { accent: '#d85b3f', background: '#ffffff' },
      minimal: { accent: '#2f6f68', background: '#ffffff' },
      academic: { accent: '#243b5a', background: '#ffffff' },
      manuscript: { accent: '#8a5c3d', background: '#fffdf8' },
      swiss: { accent: '#e33d2e', background: '#ffffff' },
      letterpress: { accent: '#9b4d35', background: '#fffaf2' },
      executive: { accent: '#285f91', background: '#ffffff' },
      notebook: { accent: '#d69b31', background: '#fffdf5' },
    }[preset]
    onSettingsChange({
      ...settings,
      preset,
      ...defaults,
      fineTune: { ...settings.fineTune, linkColor: defaults.accent },
    })
  }

  const updateFineTune = (fineTune: FineTuneSettings) => {
    onSettingsChange({ ...settings, fineTune })
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
        `${smartFilename(markdown, title)}.html`,
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
      downloadBlob(pdfBytes.buffer, `${smartFilename(markdown, title)}.pdf`, 'application/pdf')
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
    setExporting('png')
    try {
      // PNGs are rasterized from the real PDF bytes, so splits match the
      // downloaded PDF page-for-page (not the HTML layout).
      const blobs = await renderPdfToPngs(title, rendered, settings, 2, (done: number, total: number) => {
        if (done % 2 === 0 || done === total) onToast(`Rendering PNG page ${done} of ${total}…`)
      })
      const filename = smartFilename(markdown, title)
      if (blobs.length === 0) throw new Error('PNG export produced no pages')
      if (blobs.length === 1) {
        downloadBlob(blobs[0], `${filename}.png`, 'image/png')
        onToast('High-resolution PNG page downloaded')
        return
      }

      const { default: JSZip } = await import('jszip')
      const archive = new JSZip()
      blobs.forEach((blob: Blob, index: number) => {
        archive.file(`${filename}-page-${String(index + 1).padStart(2, '0')}.png`, blob)
      })
      const zip = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      downloadBlob(zip, `${filename}-png-pages.zip`, 'application/zip')
      onToast(`${blobs.length} high-resolution PNG pages downloaded as ZIP`)
    } catch (error) {
      console.error('PNG export failed', error)
      onToast('This document could not be rendered as PNG pages')
    } finally {
      setExporting(null)
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
                        title={`${template.detail}. ${template.look}`}
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
                        </span>
                        <span className={`card-check ${selected ? 'visible' : ''}`} aria-hidden="true">
                          <Check size={13} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
              <FineTunePanel
                step="2"
                title="Fine-tune"
                subtitle="Fonts, colours, and page layout for this PDF"
                tune={tune}
                onChange={updateFineTune}
                hint="Switching templates resets colours and paper. Adjust them after picking."
              />
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
                        title={preset.detail}
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
                        </span>
                        <span className={`card-check ${selected ? 'visible' : ''}`} aria-hidden="true">
                          <Check size={13} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
              <FineTunePanel
                step="2"
                title="Fine-tune"
                subtitle="Fonts, colours, and page layout for this page"
                tune={tune}
                onChange={updateFineTune}
                showPageNumbers={false}
                hint="HTML downloads are always clean. Watermarks only appear on PNG pages."
              />
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
                      <p>Pictures of the PDF. Same pages, same splits.</p>
                    </div>
                  </div>
                </div>
                <p className="field-hint inline">
                  PNGs are rendered from the <strong>{pdfTemplate.label}</strong> PDF. Multi-page documents download as one ZIP.
                </p>
              </section>
              <FineTunePanel
                step="2"
                title="Fine-tune"
                subtitle="Same controls as the PDF tab"
                tune={tune}
                onChange={updateFineTune}
                hint="PNG pages always match the PDF download exactly."
              />
              {watermarkSection('3')}
              </div>
            )}
          </div>

          <div className="export-preview-column">
            <div className="preview-label">
              <span>
                {exportTab === 'pdf' ? 'PDF pages' : exportTab === 'html' ? 'HTML preview' : 'PNG pages'}
              </span>
              <span>
                {exportTab === 'pdf'
                  ? `${pdfTemplate.label} · ${tune.paper.toUpperCase()}${tune.orientation === 'landscape' ? ' · Landscape' : ''}`
                  : exportTab === 'png'
                    ? `${pdfTemplate.label} · ${tune.paper.toUpperCase()}${tune.orientation === 'landscape' ? ' · Landscape' : ''}`
                    : `${tune.paper.toUpperCase()}${tune.orientation === 'landscape' ? ' · Landscape' : ''}`}
              </span>
            </div>
            <div className="export-preview-viewport">
              {exportTab === 'pdf' && (
                <PdfPngPages rendered={rendered} settings={settings} />
              )}
              {exportTab === 'html' && (
                <div
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
                    showWatermark={false}
                  />
                </div>
              )}
              {exportTab === 'png' && (
                <PdfPngPages rendered={rendered} settings={settings} />
              )}
            </div>
          </div>
        </div>

        <footer className="export-footer">
          <div className="privacy-note"><ShieldCheck size={15} /> Exports are created locally in your browser.</div>
          <div className="export-actions">
            {exportTab === 'html' && (
              <button type="button" className="export-action primary" onClick={() => void exportHtml()} disabled={exporting !== null}>
                <CodeXml size={17} /><span><strong>Download HTML</strong><small>No watermark</small></span>
              </button>
            )}
            {exportTab === 'png' && (
              <button type="button" className="export-action primary" onClick={() => void exportPng()} disabled={exporting !== null}>
                <ImageDown size={17} /><span><strong>{exporting === 'png' ? 'Rendering pages…' : 'PNG pages'}</strong><small>Pictures of the PDF pages</small></span>
              </button>
            )}
            {exportTab === 'pdf' && (
              <button type="button" className="export-action primary" onClick={() => void exportPdf()} disabled={exporting !== null}>
                <FileDown size={17} /><span><strong>{exporting === 'pdf' ? 'Creating PDF…' : 'Save as PDF'}</strong><small>{pdfTemplate.label} template</small></span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
