// Global keyboard shortcuts. The textarea handles its own keys; this
// listener skips events targeted at the editor and ignores form fields
// for editing actions. Handlers ride a ref so the listener binds once.
import { useEffect, useRef, type RefObject } from 'react'

export interface AppShortcutHandlers {
  undo: () => void
  redo: () => void
  format: (action: string) => void
  createDoc: () => void
  downloadMarkdown: () => void
  saveNow: () => void
  openFindPanel: (mode: 'find' | 'replace') => void
  setExportOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  openFilePicker: () => void
}

export function useAppShortcuts(
  handlers: AppShortcutHandlers,
  editorRef: RefObject<HTMLTextAreaElement | null>,
) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.key === 'Process') return
      const modifier = event.metaKey || event.ctrlKey
      if (!modifier) return

      const target = event.target as HTMLElement | null
      if (target === editorRef.current) return

      const tag = target?.tagName
      const inField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable)
      const key = event.key.toLowerCase()
      const current = handlersRef.current

      if (key === 's') {
        event.preventDefault()
        if (event.shiftKey) current.downloadMarkdown()
        else current.saveNow()
        return
      }
      if (key === 'o') {
        event.preventDefault()
        current.openFilePicker()
        return
      }
      if (key === 'e' && event.shiftKey) {
        event.preventDefault()
        current.setExportOpen(true)
        return
      }
      if (key === '/' && event.shiftKey) {
        event.preventDefault()
        current.setShortcutsOpen(true)
        return
      }
      if (key === 'n' && event.altKey) {
        event.preventDefault()
        current.createDoc()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        current.openFindPanel('find')
        return
      }
      if (key === 'h') {
        event.preventDefault()
        current.openFindPanel('replace')
        return
      }

      if (inField) return

      if (key === 'z' && !event.shiftKey) { event.preventDefault(); current.undo() }
      else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); current.redo() }
      else if (key === 'b') { event.preventDefault(); current.format('bold') }
      else if (key === 'i') { event.preventDefault(); current.format('italic') }
      else if (key === 'k') { event.preventDefault(); current.format('link') }
      else if (key === 'e') { event.preventDefault(); current.format('code') }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editorRef])
}
