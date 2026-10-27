import { beforeEach, describe, expect, it, vi } from 'vitest'

import { imageWrites, resetImageStoreForTests } from '../features/library/imageStore'
import { docBodyKey, loadLibrary, normalizeStoredDoc, persistDocuments } from '../features/library/libraryStore'
import { STARTER_TITLE } from '../shared/lib/starter'
import { LIBRARY_INDEX_KEY, LIBRARY_SCHEMA_VERSION } from '../shared/settings/storageKeys'

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
    resetImageStoreForTests()
    vi.restoreAllMocks()
  })

  it('falls back to the starter note when empty', () => {
    const loaded = loadLibrary()
    expect(loaded.library.docs).toHaveLength(1)
    expect(loaded.library.docs[0].title).toBe(STARTER_TITLE)
    expect(loaded.library.activeId).toBe(loaded.library.docs[0].id)
    expect(loaded.writable).toBe(true)
  })

  it('migrates the legacy single-document format', () => {
    localStorage.setItem(
      'quietmarkdown:document:v1',
      JSON.stringify({ title: 'Old', markdown: 'legacy body' }),
    )
    const loaded = loadLibrary()
    expect(loaded.library.docs[0]).toMatchObject({ title: 'Old', markdown: 'legacy body' })
    expect(localStorage.getItem('quietmarkdown:document:v1')).toBeNull()
  })
})

describe('split library', () => {
  beforeEach(() => {
    localStorage.clear()
    resetImageStoreForTests()
    vi.restoreAllMocks()
  })

  it('keeps the other document when one body hits quota', () => {
    const library = {
      activeId: 'small',
      docs: [
        { id: 'small', title: 'Small', markdown: 'kept', updatedAt: 1 },
        { id: 'big', title: 'Big', markdown: 'too big', updatedAt: 2 },
      ],
    }
    expect(persistDocuments(library, ['small', 'big']).ok).toBe(true)

    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (String(key) === docBodyKey('big')) throw new DOMException('full', 'QuotaExceededError')
      return original.call(this, key, value)
    })

    const result = persistDocuments({
      ...library,
      docs: library.docs.map((doc) => doc.id === 'big' ? { ...doc, markdown: 'changed' } : doc),
    }, ['big'])

    expect(result).toMatchObject({ ok: false, error: 'quota', failedId: 'big' })
    expect(JSON.parse(localStorage.getItem(docBodyKey('small')) ?? '').markdown).toBe('kept')
    expect(JSON.parse(localStorage.getItem(docBodyKey('big')) ?? '').markdown).toBe('too big')
  })

  it('keeps a corrupt body as the raw string', () => {
    localStorage.setItem(LIBRARY_INDEX_KEY, JSON.stringify({
      schemaVersion: LIBRARY_SCHEMA_VERSION,
      activeId: 'a',
      docs: [
        { id: 'a', title: 'Damaged', updatedAt: 2 },
        { id: 'b', title: 'Fine', updatedAt: 1 },
      ],
    }))
    localStorage.setItem(docBodyKey('a'), '{broken')
    localStorage.setItem(docBodyKey('b'), JSON.stringify({ schemaVersion: 2, markdown: 'ok' }))

    const loaded = loadLibrary()
    expect(loaded.library.docs).toHaveLength(2)
    expect(loaded.corruptIds).toEqual(['a'])
    expect(loaded.library.docs.find((doc) => doc.id === 'a')).toMatchObject({
      title: 'Damaged',
      markdown: '{broken',
      corrupt: true,
    })
    expect(loaded.library.docs.find((doc) => doc.id === 'b')?.markdown).toBe('ok')
  })

  it('migrates the single library blob and moves image bytes off the note', async () => {
    const dataUrl = `data:image/png;base64,${'a'.repeat(40)}`
    localStorage.setItem('quietmarkdown:library:v1', JSON.stringify({
      activeId: 'note',
      docs: [{
        id: 'note',
        title: 'With image',
        markdown: `Hello\n\n![shot](${dataUrl})\n`,
        updatedAt: 4,
      }],
    }))

    const loaded = loadLibrary()
    await imageWrites()

    expect(localStorage.getItem('quietmarkdown:library:v1')).toBeNull()
    const index = JSON.parse(localStorage.getItem(LIBRARY_INDEX_KEY) ?? '')
    expect(index.schemaVersion).toBe(LIBRARY_SCHEMA_VERSION)
    expect(index.docs).toEqual([{ id: 'note', title: 'With image', updatedAt: 4 }])

    const body = JSON.parse(localStorage.getItem(docBodyKey('note')) ?? '')
    expect(body.markdown).not.toContain('data:image')
    expect(body.markdown).toContain('qm-image:img-')
    expect(loaded.library.docs[0].markdown).toBe(body.markdown)
    expect(JSON.stringify(localStorage).includes(dataUrl)).toBe(false)
  })

  it('does not replace a newer schema with the starter note', () => {
    localStorage.setItem(LIBRARY_INDEX_KEY, JSON.stringify({
      schemaVersion: 99,
      activeId: 'future',
      docs: [{ id: 'future', title: 'Future', updatedAt: 1 }],
    }))
    localStorage.setItem(docBodyKey('future'), JSON.stringify({ schemaVersion: 99, markdown: 'keep me' }))

    const loaded = loadLibrary()
    expect(loaded.writable).toBe(false)
    expect(loaded.library.docs[0]).toMatchObject({ title: 'Future', markdown: 'keep me' })
    expect(loaded.library.docs[0].title).not.toBe(STARTER_TITLE)
    expect(JSON.parse(localStorage.getItem(LIBRARY_INDEX_KEY) ?? '').schemaVersion).toBe(99)
  })

  it('reports documents left out past the library cap', () => {
    const docs = Array.from({ length: 102 }, (_, index) => ({
      id: `d${index}`,
      title: `T${index}`,
      markdown: `m${index}`,
      updatedAt: index,
    }))
    localStorage.setItem('quietmarkdown:library:v1', JSON.stringify({ activeId: 'd0', docs }))
    const loaded = loadLibrary()
    expect(loaded.truncated).toBe(2)
    expect(loaded.library.docs).toHaveLength(100)
  })
})
