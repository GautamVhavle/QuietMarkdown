// Document library state: CRUD, autosave, and unload persistence. The
// persistRef always holds the latest snapshot so a delayed autosave cannot
// clobber a duplicate/delete that happened while the timer was pending.
import { useEffect, useRef, useState } from 'react'

import { retryFailedImages } from './imageStore'
import { createDocId, persistDocuments, removeDocBody, type PersistResult } from './libraryStore'
import { MAX_LIBRARY_DOCS, type Library, type StorageFailure } from './types'

export interface DocumentSnapshot {
  id: string
  title: string
  markdown: string
}

export function useDocumentLibrary(
  snapshot: DocumentSnapshot,
  onOpenDoc: (title: string, markdown: string) => void,
  onToast: (message: string) => void,
  initial?: {
    library: Library
    activeId: string
    title: string
    markdown: string
    writable?: boolean
    writeError?: StorageFailure | null
  },
  holdId?: string | null,
) {
  const writable = initial?.writable !== false
  const [initialLibrary] = useState<Library>(() => initial?.library ?? { activeId: '', docs: [] })
  const [library, setLibrary] = useState<Library>(initialLibrary)
  const [activeId, setActiveId] = useState(initial?.activeId ?? initialLibrary.activeId)
  const [lastSavedDocument, setLastSavedDocument] = useState(() =>
    JSON.stringify({
      id: initial?.activeId ?? initialLibrary.activeId,
      title: initial?.title ?? '',
      markdown: initial?.markdown ?? '',
    }),
  )
  const [storageError, setStorageError] = useState<StorageFailure | null>(initial?.writeError ?? null)
  const saveTimerRef = useRef<number | null>(null)
  const imageGen = useRef(0)

  const persistRef = useRef({ library, activeId, snapshot })
  useEffect(() => {
    persistRef.current = { library, activeId, snapshot }
  })

  const applyPersist = (result: PersistResult): boolean => {
    if (!result.ok) {
      setStorageError(result.error)
      return false
    }
    const generation = imageGen.current + 1
    imageGen.current = generation
    void Promise.all([result.imagesPending, retryFailedImages()]).then(([fresh, retried]) => {
      if (imageGen.current !== generation) return
      setStorageError(fresh ?? retried)
    })
    return true
  }

  const writeLibrary = (next: Library, bodyIds: readonly string[]): boolean => {
    if (!writable) {
      setStorageError('blocked')
      return false
    }
    return applyPersist(persistDocuments(next, bodyIds))
  }

  const flushActiveDoc = (): { library: Library; ok: boolean; error: StorageFailure | null } => {
    const current = persistRef.current
    if (holdId && current.activeId === holdId) {
      return { library: current.library, ok: true, error: null }
    }
    const doc = current.snapshot
    const next: Library = {
      activeId: current.activeId,
      docs: current.library.docs.map((entry) => (
        entry.id === current.activeId
          ? { ...entry, title: doc.title, markdown: doc.markdown, updatedAt: Date.now(), corrupt: undefined }
          : entry
      )),
    }
    const result = writable
      ? persistDocuments(next, [current.activeId])
      : { ok: false as const, error: 'blocked' as const, failedId: null, imagesPending: Promise.resolve(null), library: next }
    const ok = writable ? applyPersist(result) : false
    if (!writable) setStorageError('blocked')
    const stored = ok ? result.library : next
    setLibrary(stored)
    persistRef.current.library = stored
    return { library: stored, ok, error: result.error }
  }

  const markSavedIfCurrent = (ok: boolean) => {
    if (!ok) return
    const current = persistRef.current
    setLastSavedDocument(JSON.stringify({
      id: current.activeId,
      title: current.snapshot.title,
      markdown: current.snapshot.markdown,
    }))
  }

  useEffect(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      const { ok } = flushActiveDoc()
      markSavedIfCurrent(ok)
    }, 450)
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
    // Title and markdown are the draft. activeId is read from persistRef
    // inside the timer so a switch cannot be overwritten by a stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.title, snapshot.markdown])

  useEffect(() => {
    if (!storageError) return
    const timer = window.setInterval(() => {
      const { ok } = flushActiveDoc()
      markSavedIfCurrent(ok)
    }, 4000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageError])

  useEffect(() => {
    const persistQuietly = () => {
      if (!writable) return
      const current = persistRef.current
      if (holdId && current.activeId === holdId) return
      const doc = current.snapshot
      const next: Library = {
        activeId: current.activeId,
        docs: current.library.docs.map((entry) => (
          entry.id === current.activeId
            ? { ...entry, title: doc.title, markdown: doc.markdown, updatedAt: Date.now(), corrupt: undefined }
            : entry
        )),
      }
      persistDocuments(next, [current.activeId])
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistQuietly()
    }
    window.addEventListener('pagehide', persistQuietly)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      persistQuietly()
      window.removeEventListener('pagehide', persistQuietly)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [holdId, writable])

  const switchDoc = (id: string) => {
    if (id === activeId) return
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    const target = flushed.docs.find((doc) => doc.id === id)
    if (!target) return
    const next: Library = { activeId: id, docs: flushed.docs }
    writeLibrary(next, [])
    persistRef.current.library = next
    persistRef.current.activeId = id
    setLibrary(next)
    setActiveId(id)
    onOpenDoc(target.title, target.markdown)
    onToast(`${target.title || 'Untitled document'} opened`)
  }

  const createDoc = () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    if (flushed.docs.length >= MAX_LIBRARY_DOCS) {
      onToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
      return
    }
    const doc = { id: createDocId(), title: 'Untitled document', markdown: '', updatedAt: Date.now() }
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
    if (!writeLibrary(next, [doc.id])) return
    persistRef.current.library = next
    persistRef.current.activeId = doc.id
    setLibrary(next)
    setActiveId(doc.id)
    onOpenDoc(doc.title, doc.markdown)
    onToast('New document created')
  }

  const duplicateDoc = (id: string) => {
    const { library: current } = flushActiveDoc()
    const source = current.docs.find((doc) => doc.id === id)
    if (!source) return
    if (current.docs.length >= MAX_LIBRARY_DOCS) {
      onToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
      return
    }
    const copy = { ...source, id: createDocId(), title: `${source.title || 'Untitled'} (copy)`, updatedAt: Date.now(), corrupt: undefined }
    const next: Library = {
      activeId,
      docs: [copy, ...current.docs].slice(0, MAX_LIBRARY_DOCS),
    }
    if (!writeLibrary(next, [copy.id])) return
    persistRef.current.library = next
    setLibrary(next)
    onToast('Document duplicated')
  }

  const deleteDoc = (id: string) => {
    const { library: current } = flushActiveDoc()
    if (current.docs.length <= 1) {
      onToast('The last document cannot be deleted')
      return
    }
    const remaining = current.docs.filter((doc) => doc.id !== id)
    let next: Library
    if (id === activeId) {
      const fallback = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      next = { activeId: fallback.id, docs: remaining }
      removeDocBody(id)
      if (!writeLibrary(next, [])) return
      persistRef.current.library = next
      persistRef.current.activeId = fallback.id
      setLibrary(next)
      setActiveId(fallback.id)
      onOpenDoc(fallback.title, fallback.markdown)
    } else {
      next = { activeId, docs: remaining }
      removeDocBody(id)
      if (!writeLibrary(next, [])) return
      persistRef.current.library = next
      setLibrary(next)
    }
    onToast('Document deleted')
  }

  const openExternalDoc = (doc: { id: string; title: string; markdown: string; updatedAt: number }) => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
    if (!writeLibrary(next, [doc.id])) return false
    persistRef.current.library = next
    persistRef.current.activeId = doc.id
    setLibrary(next)
    setActiveId(doc.id)
    onOpenDoc(doc.title, doc.markdown)
    return true
  }

  return {
    library,
    activeId,
    lastSavedDocument,
    setLastSavedDocument,
    storageError,
    saveTimerRef,
    flushActiveDoc,
    markSavedIfCurrent,
    switchDoc,
    createDoc,
    duplicateDoc,
    deleteDoc,
    openExternalDoc,
  }
}
