// Document library state: CRUD, autosave, and unload persistence. The
// persistRef always holds the latest snapshot so a delayed autosave cannot
// clobber a duplicate/delete that happened while the timer was pending.
import { useEffect, useRef, useState } from 'react'

import { writeStorageJson } from '../../shared/lib/storage'
import { LIBRARY_KEY } from '../../shared/settings/storageKeys'

import { createDocId, loadLibrary } from './libraryStore'
import { MAX_LIBRARY_DOCS, type Library } from './types'

export interface DocumentSnapshot {
  id: string
  title: string
  markdown: string
  currentDocument: string
}

export function useDocumentLibrary(
  snapshot: DocumentSnapshot,
  onOpenDoc: (title: string, markdown: string) => void,
  onToast: (message: string) => void,
  initial?: { library: Library; activeId: string; title: string; markdown: string },
) {
  const [initialLibrary] = useState<Library>(() => initial?.library ?? loadLibrary())
  const [library, setLibrary] = useState<Library>(initialLibrary)
  const [activeId, setActiveId] = useState(initial?.activeId ?? initialLibrary.activeId)
  // First paint is already saved: initial state mirrors the stored library.
  const [lastSavedDocument, setLastSavedDocument] = useState(() =>
    JSON.stringify({
      id: initial?.activeId ?? initialLibrary.activeId,
      title: initial?.title ?? '',
      markdown: initial?.markdown ?? '',
    }),
  )
  const [storageError, setStorageError] = useState(false)
  const saveTimerRef = useRef<number | null>(null)

  // Always read the latest library/document from here so a delayed autosave
  // cannot clobber a duplicate/delete that happened while the timer was pending.
  const persistRef = useRef({ library, activeId, snapshot })
  useEffect(() => {
    persistRef.current = { library, activeId, snapshot }
  })

  const persistLibrary = (next: Library): boolean => {
    const result = writeStorageJson(LIBRARY_KEY, next)
    if (!result.ok) {
      setStorageError(true)
      return false
    }
    setStorageError(false)
    return true
  }

  // Write the ACTIVE document's latest content into the library and storage,
  // and mirror it into component state so later operations never act on a
  // stale snapshot. Always build the next state from the returned value.
  const flushActiveDoc = (): { library: Library; ok: boolean } => {
    const current = persistRef.current
    const doc = current.snapshot
    const next: Library = {
      activeId: current.activeId,
      docs: current.library.docs.map((entry) => (
        entry.id === current.activeId
          ? { ...entry, title: doc.title, markdown: doc.markdown, updatedAt: Date.now() }
          : entry
      )),
    }
    const ok = persistLibrary(next)
    setLibrary(next)
    persistRef.current.library = next
    return { library: next, ok }
  }

  const markSavedIfCurrent = (ok: boolean) => {
    if (ok) setLastSavedDocument(persistRef.current.snapshot.currentDocument)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.currentDocument])

  useEffect(() => {
    if (!storageError) return
    const timer = window.setInterval(() => {
      const { ok } = flushActiveDoc()
      markSavedIfCurrent(ok)
    }, 4000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageError])

  // Mobile Safari often skips beforeunload; pagehide / tab-hide still fire.
  useEffect(() => {
    const persistQuietly = () => {
      const current = persistRef.current
      const doc = current.snapshot
      const next: Library = {
        activeId: current.activeId,
        docs: current.library.docs.map((entry) => (
          entry.id === current.activeId
            ? { ...entry, title: doc.title, markdown: doc.markdown, updatedAt: Date.now() }
            : entry
        )),
      }
      writeStorageJson(LIBRARY_KEY, next)
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
  }, [])

  const switchDoc = (id: string) => {
    if (id === activeId) return
    // Persist the outgoing document immediately so nothing is lost mid-switch.
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    const target = flushed.docs.find((doc) => doc.id === id)
    if (!target) return
    const next: Library = { activeId: id, docs: flushed.docs }
    persistLibrary(next)
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
    const docId = createDocId()
    const doc = { id: docId, title: 'Untitled document', markdown: '', updatedAt: Date.now() }
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
    if (!persistLibrary(next)) return
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
    const copy = { ...source, id: createDocId(), title: `${source.title || 'Untitled'} (copy)`, updatedAt: Date.now() }
    const next: Library = {
      activeId,
      docs: [copy, ...current.docs].slice(0, MAX_LIBRARY_DOCS),
    }
    if (!persistLibrary(next)) return
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
      // Switch to the most recently updated remaining document.
      const fallback = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      next = { activeId: fallback.id, docs: remaining }
      if (!persistLibrary(next)) return
      persistRef.current.library = next
      persistRef.current.activeId = fallback.id
      setLibrary(next)
      setActiveId(fallback.id)
      onOpenDoc(fallback.title, fallback.markdown)
    } else {
      next = { activeId, docs: remaining }
      if (!persistLibrary(next)) return
      persistRef.current.library = next
      setLibrary(next)
    }
    onToast('Document deleted')
  }

  // Open an externally created doc (file import). Persists via the normal
  // autosave path; switches state immediately so UI never lags storage.
  const openExternalDoc = (doc: { id: string; title: string; markdown: string; updatedAt: number }) => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const { library: flushed } = flushActiveDoc()
    const next: Library = { activeId: doc.id, docs: [doc, ...flushed.docs] }
    if (!persistLibrary(next)) return false
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
