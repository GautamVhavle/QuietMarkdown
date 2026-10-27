import { beforeEach, describe, expect, it } from 'vitest'

import { crashCount, noteCrash, peekQuarantine } from '../features/shell/crashDraft'

describe('crash quarantine', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('quarantines a note the second time it crashes', () => {
    expect(noteCrash('doc-a')).toBe(1)
    expect(peekQuarantine()).toBeNull()
    expect(noteCrash('doc-a')).toBe(2)
    expect(peekQuarantine()).toBe('doc-a')
    expect(crashCount('doc-a')).toBe(2)
  })
})
