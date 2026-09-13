import { useEffect, useState } from 'react'
import { EXPORT_FONTS, ensureExportFont, getExportFont } from '../lib/fonts'
import type { FineTuneSettings } from '../types'

interface FontPickerProps {
  label: string
  value: string
  onChange: (id: string) => void
}

export function FontPicker({ label, value, onChange }: FontPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = getExportFont(value)

  useEffect(() => {
    ensureExportFont(value)
  }, [value])

  const matches = EXPORT_FONTS.filter((font) =>
    font.label.toLowerCase().includes(query.trim().toLowerCase()),
  ).slice(0, 12)

  return (
    <div className="font-picker">
      <span className="option-label">{label}</span>
      <button
        type="button"
        className="font-picker-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Choose ${label.toLowerCase()} font, currently ${selected.label}`}
      >
        <span className="font-picker-sample" style={{ fontFamily: selected.stack }} aria-hidden="true">
          Aa
        </span>
        <span className="font-picker-name">{selected.label}</span>
        <span className="font-picker-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="font-picker-panel">
          <input
            type="search"
            placeholder="Search fonts…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={`Search ${label.toLowerCase()} fonts`}
          />
          <div className="font-picker-list" role="listbox" aria-label={`${label} fonts`}>
            {matches.map((font) => (
              <button
                key={font.id}
                type="button"
                role="option"
                aria-selected={font.id === value}
                className={`font-picker-option ${font.id === value ? 'selected' : ''}`}
                onClick={() => {
                  ensureExportFont(font.id)
                  onChange(font.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="font-picker-sample" style={{ fontFamily: font.stack }} aria-hidden="true">
                  Aa
                </span>
                <span className="font-picker-name">{font.label}</span>
              </button>
            ))}
            {matches.length === 0 && (
              <p className="font-picker-empty">No fonts match “{query}”.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function TuneColor({ label, value, onChange }: ColorFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <span className="color-field">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color`}
        />
        <span>{value}</span>
      </span>
    </label>
  )
}

interface FineTunePanelProps {
  step: string
  title: string
  subtitle: string
  tune: FineTuneSettings
  onChange: (tune: FineTuneSettings) => void
  showPaper?: boolean
  showPageNumbers?: boolean
  hint?: string
}

export function FineTunePanel({
  step,
  title,
  subtitle,
  tune,
  onChange,
  showPaper = true,
  showPageNumbers = true,
  hint,
}: FineTunePanelProps) {
  const set = <K extends keyof FineTuneSettings>(key: K, value: FineTuneSettings[K]) => {
    onChange({ ...tune, [key]: value })
  }

  return (
    <section className="control-section" aria-label={`${title} fine-tuning`}>
      <div className="section-heading">
        <div className="section-title">
          <span className="step-badge" aria-hidden="true">{step}</span>
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="tune-group" aria-label="Body typography">
        <span className="tune-group-title">Body</span>
        <FontPicker label="Body" value={tune.bodyFont} onChange={(id) => set('bodyFont', id)} />
        <div className="field-row two-up tune-colors">
          <TuneColor label="Colour" value={tune.bodyColor} onChange={(value) => set('bodyColor', value)} />
        </div>
      </div>

      <div className="tune-group" aria-label="Heading typography">
        <span className="tune-group-title">Headings</span>
        <FontPicker label="Headings" value={tune.headingFont} onChange={(id) => set('headingFont', id)} />
        <div className="segmented" role="group" aria-label="Heading colour mode">
          {([
            ['same', 'All the same'],
            ['each', 'Each level'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={tune.headingColorMode === mode}
              className={tune.headingColorMode === mode ? 'selected' : ''}
              onClick={() => set('headingColorMode', mode)}
            >
              {label}
            </button>
          ))}
        </div>
        {tune.headingColorMode === 'same' ? (
          <div className="field-row two-up tune-colors">
            <TuneColor label="Colour" value={tune.headingColor} onChange={(value) => set('headingColor', value)} />
          </div>
        ) : (
          <div className="field-row three-up tune-colors">
            <TuneColor label="H1" value={tune.h1Color} onChange={(value) => set('h1Color', value)} />
            <TuneColor label="H2" value={tune.h2Color} onChange={(value) => set('h2Color', value)} />
            <TuneColor label="H3" value={tune.h3Color} onChange={(value) => set('h3Color', value)} />
          </div>
        )}
      </div>

      <div className="tune-group" aria-label="Link colour">
        <span className="tune-group-title">Links</span>
        <div className="field-row two-up tune-colors">
          <TuneColor label="Colour" value={tune.linkColor} onChange={(value) => set('linkColor', value)} />
        </div>
      </div>

      {showPaper && (
        <div className="tune-group" aria-label="Page layout">
          <span className="tune-group-title">Page layout</span>
          <span className="option-label">Paper size</span>
          <div className="paper-grid" role="group" aria-label="Paper size">
            {([
              ['a5', 'A5'],
              ['a4', 'A4'],
              ['a3', 'A3'],
              ['letter', 'Letter'],
              ['legal', 'Legal'],
              ['tabloid', 'Tabloid'],
            ] as const).map(([paper, label]) => (
              <button
                key={paper}
                type="button"
                aria-pressed={tune.paper === paper}
                className={tune.paper === paper ? 'selected' : ''}
                onClick={() => set('paper', paper)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="option-label">Margins</span>
          <div className="segmented three" role="group" aria-label="Margins">
            {([
              ['narrow', 'Narrow'],
              ['normal', 'Normal'],
              ['wide', 'Wide'],
            ] as const).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                aria-pressed={tune.marginPreset === preset}
                className={tune.marginPreset === preset ? 'selected' : ''}
                onClick={() => set('marginPreset', preset)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="option-label">Orientation</span>
          <div className="segmented" role="group" aria-label="Orientation">
            {([
              ['portrait', 'Portrait'],
              ['landscape', 'Landscape'],
            ] as const).map(([orientation, label]) => (
              <button
                key={orientation}
                type="button"
                aria-pressed={tune.orientation === orientation}
                className={tune.orientation === orientation ? 'selected' : ''}
                onClick={() => set('orientation', orientation)}
              >
                {label}
              </button>
            ))}
          </div>
          {showPageNumbers && (
            <div className="tune-switch-row">
              <span>Page numbers</span>
              <button
                type="button"
                role="switch"
                aria-label="Toggle page numbers"
                aria-checked={tune.pageNumbers}
                className={`switch ${tune.pageNumbers ? 'on' : ''}`}
                onClick={() => set('pageNumbers', !tune.pageNumbers)}
              >
                <i />
              </button>
            </div>
          )}
        </div>
      )}

      {hint && <p className="field-hint">{hint}</p>}
    </section>
  )
}
