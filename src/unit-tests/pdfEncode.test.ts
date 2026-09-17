import { describe, expect, it } from 'vitest'

import { encodeFor, hexRgb, pdfEncode } from '../shared/export/pdf/pdfEncode'
import type { FontSet } from '../shared/export/pdf/pdfFonts'

const standardFonts = { unicode: false } as FontSet
const embeddedFonts = { unicode: true } as FontSet

describe('pdfEncode', () => {
  it('maps smart punctuation to WinAnsi', () => {
    expect(pdfEncode('\u2018hi\u2019')).toBe("'hi'")
    expect(pdfEncode('a\u2014b')).toBe('a--b')
    expect(pdfEncode('\u2026')).toBe('...')
  })

  it('drops non-WinAnsi characters', () => {
    expect(pdfEncode('caf\u00e9 \u4e2d')).toBe('caf\u00e9 ')
  })

  it('expands tabs', () => {
    expect(pdfEncode('a\tb')).toBe('a  b')
  })

  it('keeps unicode for embedded fonts, encodes for standard fonts', () => {
    expect(encodeFor(embeddedFonts, 'caf\u00e9 \u4e2d \u2014')).toBe('caf\u00e9 \u4e2d \u2014')
    expect(encodeFor(standardFonts, 'a\u2014b \u4e2d')).toBe('a--b ')
    expect(encodeFor(embeddedFonts, 'a\tb')).toBe('a  b')
  })
})

describe('hexRgb', () => {
  it('parses hex colors', () => {
    const color = hexRgb('#ff0000')
    expect(color.red).toBeCloseTo(1)
    expect(color.green).toBeCloseTo(0)
  })

  it('falls back on garbage', () => {
    expect(hexRgb('nope')).toBeTruthy()
  })
})
