// Textarea key handling: Tab indent, Escape closes find, modifier
// shortcuts for history, formatting, and app actions.
import type { KeyboardEvent, RefObject } from 'react'

import type { FormatAction } from '../formatting/formatting'

export interface EditorKeyHandlers {
  undo: () => void
  redo: () => void
  format: (action: FormatAction) => void
  createDoc: () => void
  downloadMarkdown: () => void
  saveNow: () => void
  openFindPanel: (mode: 'find' | 'replace') => void
  setExportOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  openFilePicker: () => void
  closeFindPanel: () => void
  isFindOpen: () => boolean
}

export function handleEditorKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  markdown: string,
  setEditorValue: (next: string, selectionStart: number, selectionEnd: number) => void,
  editorRef: RefObject<HTMLTextAreaElement | null>,
  handlers: EditorKeyHandlers,
) {
  if (event.nativeEvent.isComposing) return
  const modifier = event.metaKey || event.ctrlKey
  if (event.key === 'Tab') {
    event.preventDefault()
    const start = event.currentTarget.selectionStart
    const end = event.currentTarget.selectionEnd
    setEditorValue(`${markdown.slice(0, start)}  ${markdown.slice(end)}`, start + 2, start + 2)
    return
  }
  if (event.key === 'Escape' && handlers.isFindOpen()) {
    event.preventDefault()
    handlers.closeFindPanel()
    editorRef.current?.focus()
    return
  }
  if (!modifier) return

  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) { event.preventDefault(); handlers.undo() }
  else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); handlers.redo() }
  else if (key === 'b') { event.preventDefault(); handlers.format('bold') }
  else if (key === 'i') { event.preventDefault(); handlers.format('italic') }
  else if (key === 'k') { event.preventDefault(); handlers.format('link') }
  else if (key === 'e' && !event.shiftKey) { event.preventDefault(); handlers.format('code') }
  else if (key === 'f') { event.preventDefault(); handlers.openFindPanel('find') }
  else if (key === 'h') { event.preventDefault(); handlers.openFindPanel('replace') }
  else if (key === 'n' && event.altKey) { event.preventDefault(); handlers.createDoc() }
  else if (key === 's' && event.shiftKey) { event.preventDefault(); handlers.downloadMarkdown() }
  else if (key === 's') { event.preventDefault(); handlers.saveNow() }
  else if (key === 'o') { event.preventDefault(); handlers.openFilePicker() }
  else if (key === 'e' && event.shiftKey) { event.preventDefault(); handlers.setExportOpen(true) }
  else if (key === '/' && event.shiftKey) { event.preventDefault(); handlers.setShortcutsOpen(true) }
}
