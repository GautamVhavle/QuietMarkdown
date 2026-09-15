import { describe, expect, it } from 'vitest'

import { hexRgb, pdfEncode } from '../shared/export/pdf/pdfEncode'

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
