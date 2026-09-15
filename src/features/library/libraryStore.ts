// Document library persistence. Reads the current schema first, falls back
// to migrating an older single-document save, finally to the starter note.
// Corrupt or hostile payloads never crash the editor.
import { STARTER_TITLE, starterMarkdown } from '../../shared/lib/starter'
import { readStorageJson } from '../../shared/lib/storage'
import { LEGACY_DOCUMENT_KEY, LEGACY_DOCUMENT_KEY_V2, LIBRARY_KEY } from '../../shared/settings/storageKeys'

import { MAX_LIBRARY_DOCS, type Library, type LibraryDoc } from './types'

export const createDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

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

export const loadLibrary = (): Library => {
  try {
    const stored = readStorageJson<Partial<Library>>(LIBRARY_KEY).value
    if (stored && Array.isArray(stored.docs)) {
      const seenIds = new Set<string>()
      const docs = stored.docs
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
        .slice(0, MAX_LIBRARY_DOCS)
      if (docs.length > 0) {
        const activeId = docs.some((doc) => doc.id === stored.activeId)
          ? (stored.activeId as string)
          : docs[0].id
        return { activeId, docs }
      }
    }
  } catch {
    // Fall through to legacy migration.
  }

  // Migrate the pre-library single-document format.
  let migrated: LibraryDoc | null = null
  try {
    const raw = localStorage.getItem(LEGACY_DOCUMENT_KEY) ?? localStorage.getItem(LEGACY_DOCUMENT_KEY_V2)
    if (raw) {
      const parsed = JSON.parse(raw) as { title?: unknown; markdown?: unknown }
      if (typeof parsed.markdown === 'string') {
        migrated = normalizeStoredDoc({ title: parsed.title, markdown: parsed.markdown })
      }
    }
  } catch {
    // Ignore malformed legacy data.
  }
  if (!migrated) {
    migrated = { id: createDocId(), title: STARTER_TITLE, markdown: starterMarkdown, updatedAt: Date.now() }
  }
  return { activeId: migrated.id, docs: [migrated] }
}
