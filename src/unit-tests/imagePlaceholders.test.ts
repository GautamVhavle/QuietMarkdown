import { describe, expect, it } from 'vitest'

import {
  collapseImageUrls,
  expandImageUrls,
  mapDisplayCaretToReal,
} from '../features/editor/imagePlaceholders'

const URL_A = `![cat](data:image/png;base64,${'a'.repeat(60)})`
const URL_B = `![dog](data:image/jpeg;base64,${'b'.repeat(60)})`

describe('collapseImageUrls', () => {
  it('collapses data URLs to placeholders', () => {
    expect(collapseImageUrls(`# T\n\n${URL_A}\n`)).toBe('# T\n\n![cat](embedded:image)\n')
  })

  it('leaves split-line URLs visible as raw text', () => {
    const broken = `![cat](data:image/png;base64,${'a'.repeat(10)}\n${'a'.repeat(10)})`
    expect(collapseImageUrls(broken)).toBe(broken)
  })

  it('leaves plain markdown untouched', () => {
    expect(collapseImageUrls('# Hello\n\nplain text')).toBe('# Hello\n\nplain text')
  })
})

describe('expandImageUrls', () => {
  it('restores placeholders by position', () => {
    const real = `# T\n\n${URL_A}\n\n${URL_B}\n`
    const display = '# T\n\n![cat](embedded:image)\n\n![dog](embedded:image)\n'
    expect(expandImageUrls(display, real)).toBe(real)
  })

  it('keeps deleted placeholders deleted', () => {
    const real = `# T\n\n${URL_A}\n\n${URL_B}\n`
    const display = '# T\n\n![dog](embedded:image)\n'
    expect(expandImageUrls(display, real)).toBe(`# T\n\n${URL_A}\n`)
  })

  it('passes through text with no images', () => {
    expect(expandImageUrls('# Hi', '# Hi')).toBe('# Hi')
  })
})

describe('mapDisplayCaretToReal', () => {
  it('maps offsets around a collapsed placeholder', () => {
    const real = `# T\n\n${URL_A}\n\ntail`
    const display = collapseImageUrls(real)
    const placeholderStart = display.indexOf('![')
    // Caret before the image maps 1:1.
    expect(mapDisplayCaretToReal(display, real, placeholderStart)).toBe(real.indexOf('!['))
    // Caret after the placeholder skips the full data URL.
    const afterDisplay = placeholderStart + '![cat](embedded:image)'.length + 2
    expect(mapDisplayCaretToReal(display, real, afterDisplay)).toBe(real.indexOf('tail'))
  })
})
