import { describe, expect, it } from 'vitest'

import { safeFilename, smartFilename } from '../shared/lib/filenames'

describe('safeFilename', () => {
  it('slugifies titles', () => {
    expect(safeFilename('Hello World!')).toBe('hello-world')
    expect(safeFilename('  ')).toBe('untitled')
  })

  it('caps length at 60 chars', () => {
    expect(safeFilename('a'.repeat(100)).length).toBeLessThanOrEqual(60)
  })
})

describe('smartFilename', () => {
  it('prefers the first H1', () => {
    expect(smartFilename('# My Great Doc\n\nbody', 'fallback')).toBe('my-great-doc')
  })

  it('falls back to the first non-empty line', () => {
    expect(smartFilename('Just a line here\n\nmore', 'fallback')).toBe('just-a-line-here')
  })

  it('falls back to title then untitled', () => {
    expect(smartFilename('', 'My Title')).toBe('my-title')
    expect(smartFilename('', '')).toBe('untitled')
  })

  it('limits to six words', () => {
    expect(smartFilename('# one two three four five six seven eight', 'x')).toBe('one-two-three-four-five-six')
  })
})
