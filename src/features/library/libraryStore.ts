// Document library persistence. The index (id, title, updated time, schema
// version) stays small in localStorage. Each note body is its own key, and
// image bytes are referenced, not inlined. A quota error then belongs to
// one document. An unread future schema is left on disk.
import { STARTER_TITLE, starterMarkdown } from '../../shared/lib/starter'
import { readStorageJson, removeStorageKey, writeStorageJson } from '../../shared/lib/storage'
import {
  DOC_BODY_PREFIX,
  LEGACY_DOCUMENT_KEY,
  LEGACY_DOCUMENT_KEY_V2,
  LIBRARY_INDEX_KEY,
  LIBRARY_KEY,
  LIBRARY_SCHEMA_VERSION,
} from '../../shared/settings/storageKeys'

import { detachDataUrls, type DetachedImage } from './imageRefs'
import { enqueueImages } from './imageStore'
import { MAX_LIBRARY_DOCS, type Library, type LibraryDoc, type StorageFailure } from './types'

export const createDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function docBodyKey(id: string): string {
  return `${DOC_BODY_PREFIX}${id}`
}

export interface LoadResult {
  library: Library
  truncated: number
  corruptIds: string[]
  /** False when the stored schema is newer than this build. Do not write. */
  writable: boolean
  writeError: StorageFailure | null
}

export interface PersistResult {
  ok: boolean
  error: StorageFailure | null
  failedId: string | null
  imagesPending: Promise<StorageFailure | null>
  library: Library
}

interface IndexDoc {
  id: string
  title: string
  updatedAt: number
}

interface LibraryIndex {
  schemaVersion: number
  activeId: string
  docs: IndexDoc[]
}

const noImages = Promise.resolve<StorageFailure | null>(null)

function mapWriteError(error: 'quota' | 'blocked' | 'serialize'): StorageFailure {
  return error === 'serialize' ? 'corrupt' : error
}

export function normalizeStoredDoc(value: unknown): LibraryDoc | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as Partial<LibraryDoc>
  if (typeof doc.markdown !== 'string') return null
  return {
    id: typeof doc.id === 'string' && doc.id ? doc.id : createDocId(),
    title: typeof doc.title === 'string' ? doc.title : 'Untitled document',
    markdown: doc.markdown,
    updatedAt: typeof doc.updatedAt === 'number' ? doc.updatedAt : Date.now(),
  }
}

function starterResult(): LoadResult {
  const doc = { id: createDocId(), title: STARTER_TITLE, markdown: starterMarkdown, updatedAt: Date.now() }
  return {
    library: { activeId: doc.id, docs: [doc] },
    truncated: 0,
    corruptIds: [],
    writable: true,
    writeError: null,
  }
}

function readBody(id: string): { markdown: string; corrupt: boolean } {
  let raw: string | null
  try {
    raw = localStorage.getItem(docBodyKey(id))
  } catch {
    return { markdown: '', corrupt: false }
  }
  if (raw == null) return { markdown: '', corrupt: false }
  try {
    const parsed = JSON.parse(raw) as { markdown?: unknown }
    if (parsed && typeof parsed.markdown === 'string') return { markdown: parsed.markdown, corrupt: false }
    return { markdown: raw, corrupt: true }
  } catch {
    return { markdown: raw, corrupt: true }
  }
}

function libraryFromIndex(index: LibraryIndex, writable: boolean): LoadResult {
  const rows = Array.isArray(index.docs) ? index.docs : []
  const truncated = Math.max(0, rows.length - MAX_LIBRARY_DOCS)
  const kept = rows.slice(0, MAX_LIBRARY_DOCS)
  const corruptIds: string[] = []
  const docs: LibraryDoc[] = []
  for (const row of kept) {
    if (!row || typeof row.id !== 'string' || !row.id) continue
    const body = readBody(row.id)
    if (body.corrupt) corruptIds.push(row.id)
    docs.push({
      id: row.id,
      title: typeof row.title === 'string' ? row.title : 'Untitled document',
      markdown: body.markdown,
      updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : Date.now(),
      corrupt: body.corrupt || undefined,
    })
  }
  if (docs.length === 0) {
    if (!writable) {
      const empty = starterResult()
      return { ...empty, writable: false, writeError: 'corrupt' }
    }
    return starterResult()
  }
  const activeId = docs.some((doc) => doc.id === index.activeId) ? index.activeId : docs[0].id
  return { library: { activeId, docs }, truncated, corruptIds, writable, writeError: null }
}

function recoverFromBodies(): LoadResult | null {
  const docs: LibraryDoc[] = []
  const corruptIds: string[] = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(DOC_BODY_PREFIX)) continue
      const id = key.slice(DOC_BODY_PREFIX.length)
      if (!id) continue
      const body = readBody(id)
      if (body.corrupt) corruptIds.push(id)
      docs.push({
        id,
        title: 'Recovered note',
        markdown: body.markdown,
        updatedAt: Date.now(),
        corrupt: body.corrupt || undefined,
      })
    }
  } catch {
    return null
  }
  if (docs.length === 0) return null
  return {
    library: { activeId: docs[0].id, docs },
    truncated: 0,
    corruptIds,
    writable: true,
    writeError: null,
  }
}

function clearLegacyKeys(): void {
  removeStorageKey(LIBRARY_KEY)
  removeStorageKey(LEGACY_DOCUMENT_KEY)
  removeStorageKey(LEGACY_DOCUMENT_KEY_V2)
}

export function persistDocuments(library: Library, bodyIds: readonly string[]): PersistResult {
  const images: DetachedImage[] = []
  const docs = library.docs.map((doc) => {
    if (!bodyIds.includes(doc.id)) return doc
    const detached = detachDataUrls(doc.markdown)
    images.push(...detached.images)
    return { ...doc, markdown: detached.markdown, corrupt: undefined }
  })
  const next: Library = { activeId: library.activeId, docs }
  for (const id of bodyIds) {
    const doc = next.docs.find((entry) => entry.id === id)
    if (!doc) continue
    const result = writeStorageJson(docBodyKey(id), {
      schemaVersion: LIBRARY_SCHEMA_VERSION,
      markdown: doc.markdown,
    })
    if (!result.ok) {
      return {
        ok: false,
        error: mapWriteError(result.error),
        failedId: id,
        imagesPending: noImages,
        library,
      }
    }
  }
  const index: LibraryIndex = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    activeId: next.activeId,
    docs: next.docs.slice(0, MAX_LIBRARY_DOCS).map(({ id, title, updatedAt }) => ({ id, title, updatedAt })),
  }
  const indexResult = writeStorageJson(LIBRARY_INDEX_KEY, index)
  if (!indexResult.ok) {
    return {
      ok: false,
      error: mapWriteError(indexResult.error),
      failedId: null,
      imagesPending: noImages,
      library,
    }
  }
  clearLegacyKeys()
  const imagesPending = enqueueImages(images)
  return { ok: true, error: null, failedId: null, imagesPending, library: next }
}

export function removeDocBody(id: string): void {
  removeStorageKey(docBodyKey(id))
}

function migrateBlob(docs: LibraryDoc[], activeId: string): LoadResult {
  const truncated = Math.max(0, docs.length - MAX_LIBRARY_DOCS)
  const kept = docs.slice(0, MAX_LIBRARY_DOCS)
  const library: Library = {
    activeId: kept.some((doc) => doc.id === activeId) ? activeId : kept[0].id,
    docs: kept,
  }
  let persisted = persistDocuments(library, kept.map((doc) => doc.id))
  if (!persisted.ok && persisted.error === 'quota') {
    // The v1 blob is what filled the quota. Drop it only after the notes
    // are in memory, then write the small keys.
    clearLegacyKeys()
    persisted = persistDocuments(library, kept.map((doc) => doc.id))
  }
  if (!persisted.ok) {
    return {
      library,
      truncated,
      corruptIds: [],
      writable: true,
      writeError: persisted.error,
    }
  }
  return {
    library: persisted.library,
    truncated,
    corruptIds: [],
    writable: true,
    writeError: null,
  }
}

function readLegacyBlob(): LoadResult | null {
  const stored = readStorageJson<Partial<Library>>(LIBRARY_KEY)
  if (stored.corrupted) {
    const empty = starterResult()
    return { ...empty, writable: false, writeError: 'corrupt' }
  }
  if (stored.value && Array.isArray(stored.value.docs)) {
    const seenIds = new Set<string>()
    const docs = stored.value.docs
      .map(normalizeStoredDoc)
      .filter((doc): doc is LibraryDoc => Boolean(doc))
      .map((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id)
          return doc
        }
        const next = { ...doc, id: createDocId() }
        seenIds.add(next.id)
        return next
      })
    if (docs.length > 0) {
      const activeId = docs.some((doc) => doc.id === stored.value?.activeId)
        ? (stored.value.activeId as string)
        : docs[0].id
      return migrateBlob(docs, activeId)
    }
  }

  try {
    const raw = localStorage.getItem(LEGACY_DOCUMENT_KEY) ?? localStorage.getItem(LEGACY_DOCUMENT_KEY_V2)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { title?: unknown; markdown?: unknown }
    const migrated = normalizeStoredDoc({ title: parsed.title, markdown: parsed.markdown })
    if (!migrated) return null
    return migrateBlob([migrated], migrated.id)
  } catch {
    return null
  }
}

export const loadLibrary = (): LoadResult => {
  const indexRead = readStorageJson<Partial<LibraryIndex>>(LIBRARY_INDEX_KEY)
  if (indexRead.corrupted) {
    return recoverFromBodies() ?? { ...starterResult(), writable: false, writeError: 'corrupt' }
  }
  const index = indexRead.value
  if (index && typeof index.schemaVersion === 'number' && Array.isArray(index.docs)) {
    if (index.schemaVersion > LIBRARY_SCHEMA_VERSION) {
      return libraryFromIndex(index as LibraryIndex, false)
    }
    if (index.schemaVersion === LIBRARY_SCHEMA_VERSION) {
      return libraryFromIndex(index as LibraryIndex, true)
    }
  }

  const legacy = readLegacyBlob()
  if (legacy) return legacy
  return starterResult()
}
