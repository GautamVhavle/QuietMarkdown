import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readStorageJson, writeStorageJson } from '../shared/lib/storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips JSON', () => {
    expect(writeStorageJson('k', { a: 1 })).toEqual({ ok: true })
    expect(readStorageJson('k').value).toEqual({ a: 1 })
  })

  it('reports corruption instead of throwing', () => {
    localStorage.setItem('k', '{broken')
    expect(readStorageJson('k')).toEqual({ value: null, corrupted: true })
  })

  it('reports quota errors', () => {
    const error = new DOMException('full', 'QuotaExceededError')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw error })
    expect(writeStorageJson('k', { a: 1 })).toEqual({ ok: false, error: 'quota' })
  })
})
