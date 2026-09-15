import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadLibrary, normalizeStoredDoc } from '../features/library/libraryStore'
import { STARTER_TITLE } from '../shared/lib/starter'

describe('normalizeStoredDoc', () => {
  it('rejects non-documents', () => {
    expect(normalizeStoredDoc(null)).toBeNull()
    expect(normalizeStoredDoc({ title: 'no markdown' })).toBeNull()
  })

  it('fills missing fields', () => {
    const doc = normalizeStoredDoc({ markdown: 'hi' })
    expect(doc).toMatchObject({ title: 'Untitled document', markdown: 'hi' })
    expect(doc?.id).toBeTruthy()
  })
})

describe('loadLibrary', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('falls back to the starter note when empty', () => {
    const library = loadLibrary()
    expect(library.docs).toHaveLength(1)
    expect(library.docs[0].title).toBe(STARTER_TITLE)
    expect(library.activeId).toBe(library.docs[0].id)
  })

  it('loads a stored library', () => {
    const stored = {
      activeId: 'b',
      docs: [
        { id: 'a', title: 'A', markdown: 'a', updatedAt: 1 },
        { id: 'b', title: 'B', markdown: 'b', updatedAt: 2 },
      ],
    }
    localStorage.setItem('quietmarkdown:library:v1', JSON.stringify(stored))
    expect(loadLibrary()).toEqual(stored)
  })

  it('migrates the legacy single-document format', () => {
    localStorage.setItem(
      'quietmarkdown:document:v1',
      JSON.stringify({ title: 'Old', markdown: 'legacy body' }),
    )
    const library = loadLibrary()
    expect(library.docs[0]).toMatchObject({ title: 'Old', markdown: 'legacy body' })
  })
})
