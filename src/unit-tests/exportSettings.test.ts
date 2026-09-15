import { describe, expect, it } from 'vitest'

import { defaultExportSettings, normalizeExportSettings } from '../shared/settings/exportSettings'

describe('normalizeExportSettings', () => {
  it('returns defaults for garbage input', () => {
    expect(normalizeExportSettings(null)).toEqual(defaultExportSettings)
    expect(normalizeExportSettings('nope')).toEqual(defaultExportSettings)
  })

  it('keeps valid values and clamps the rest', () => {
    const next = normalizeExportSettings({
      preset: 'minimal',
      accent: 'not-a-color',
      watermark: { text: 'x'.repeat(100), opacity: 99, size: 999, rotation: 999 },
      fineTune: { paper: 'a3', pageNumbers: false },
    })
    expect(next.preset).toBe('minimal')
    expect(next.accent).toBe(defaultExportSettings.accent)
    expect(next.watermark.text.length).toBe(42)
    expect(next.watermark.opacity).toBeLessThanOrEqual(0.35)
    expect(next.watermark.size).toBe(120)
    expect(next.watermark.rotation).toBe(60)
    expect(next.fineTune.paper).toBe('a3')
    expect(next.fineTune.pageNumbers).toBe(false)
  })

  it('rejects unknown enum values', () => {
    const next = normalizeExportSettings({ preset: 'nope', pdfTemplate: 'nope' })
    expect(next.preset).toBe(defaultExportSettings.preset)
    expect(next.pdfTemplate).toBe(defaultExportSettings.pdfTemplate)
  })
})
