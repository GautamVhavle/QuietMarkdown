// QuietMarkdown composition root. Owns top-level state and wires feature
// modules together; every domain behavior lives in its feature folder.
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent as ReactClipboardEvent, DragEvent, KeyboardEvent } from 'react'

import { editorReducer } from '../features/editor/editorHistory'
import { EditorPane } from '../features/editor/EditorPane'
import { expandImageUrls } from '../features/editor/imagePlaceholders'
import { handleEditorKeyDown } from '../features/editor/useEditorKeyDown'
import { ExportStudio } from '../features/exportStudio/ExportStudio'
import { useFindReplace } from '../features/findReplace/useFindReplace'
import { applyFormat, type FormatAction } from '../features/formatting/formatting'
import { toolbarConfig } from '../features/formatting/toolbarConfig'
import { useImageEmbed } from '../features/images/useImageEmbed'
import { createDocId, loadLibrary } from '../features/library/libraryStore'
import { MAX_LIBRARY_DOCS, type LibraryDoc } from '../features/library/types'
import { useDocumentLibrary } from '../features/library/useDocumentLibrary'
import { PreviewPane } from '../features/preview/PreviewPane'
import { useScrollSync } from '../features/preview/useScrollSync'
import { AppHeader } from '../features/shell/AppHeader'
import { DocumentBar } from '../features/shell/DocumentBar'
import { Footer } from '../features/shell/Footer'
import { DocsPopover, DropOverlay, ShortcutsPopover, Toast } from '../features/shell/Overlays'
import { useAppShortcuts } from '../features/shell/useAppShortcuts'
import { usePlatform } from '../features/shell/usePlatform'
import { useTheme } from '../features/shell/useTheme'
import { useToast } from '../features/shell/useToast'
import { downloadBlob } from '../shared/lib/download'
import { smartFilename } from '../shared/lib/filenames'
import { countDocument, renderMarkdown } from '../shared/lib/markdown'
import { STARTER_TITLE, starterMarkdown } from '../shared/lib/starter'
import { readStorageJson, writeStorageJson } from '../shared/lib/storage'
import {
  defaultExportSettings,
  normalizeExportSettings,
  type ExportSettings,
  type ViewMode,
} from '../shared/settings/exportSettings'
import {
  LEGACY_SETTINGS_KEY,
  PAGE_PREVIEW_KEY,
  SETTINGS_KEY,
  WELCOME_KEY,
} from '../shared/settings/storageKeys'

const WelcomeTour = lazy(() => import('../features/tour/WelcomeTour').then((module) => ({ default: module.WelcomeTour })))

type SaveState = 'saved' | 'saving' | 'error'

const loadSettings = () => {
  const current = readStorageJson<Partial<ExportSettings>>(SETTINGS_KEY)
  const stored = current.value ?? readStorageJson<Partial<ExportSettings>>(LEGACY_SETTINGS_KEY).value
  if (stored && typeof stored === 'object') {
    const parsed = stored
    const legacyWatermark = parsed.watermark
    // One-time refresh of watermark defaults that shipped in an early version.
    const shouldRefreshLegacyDefaults = !current.value && legacyWatermark
      && typeof legacyWatermark === 'object'
      && legacyWatermark.position === 'center'
      && legacyWatermark.size === 42
      && legacyWatermark.rotation === -28
    return normalizeExportSettings({
      ...parsed,
      watermark: shouldRefreshLegacyDefaults ? undefined : parsed.watermark,
    })
  }
  return defaultExportSettings
}

export function App() {
  // Seed synchronously from the stored library so first paint, preview,
  // and save state all agree before any effect runs.
  const [initial] = useState(() => {
    const stored = loadLibrary()
    const activeDoc = stored.docs.find((doc) => doc.id === stored.activeId) ?? stored.docs[0]
    return { library: stored, activeId: stored.activeId, title: activeDoc.title, markdown: activeDoc.markdown }
  })
  const [title, setTitle] = useState(initial.title)
  const [editor, setEditor] = useReducer(
    editorReducer,
    { markdown: initial.markdown, history: [initial.markdown], historyIndex: 0, coalescing: false },
  )
  const markdown = editor.markdown
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 900px)').matches ? 'write' : 'split',
  )
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(() => readStorageJson<{ seen?: boolean }>(WELCOME_KEY).value?.seen !== true)
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadSettings)
  const [showPageBreaks, setShowPageBreaks] = useState(
    () => readStorageJson<{ show?: boolean }>(PAGE_PREVIEW_KEY).value?.show === true,
  )
  const [dragging, setDragging] = useState(false)
  const { toast, setToast } = useToast()
  const { isMac, isMobile } = usePlatform()
  const { theme, setTheme } = useTheme()
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastTypedAtRef = useRef(0)

  // The rendered preview trails typing via useDeferredValue so keystrokes
  // never block on Markdown parsing + sanitizing, even in huge documents.
  const deferredMarkdown = useDeferredValue(markdown)
  const rendered = useMemo(() => renderMarkdown(deferredMarkdown), [deferredMarkdown])
  const stats = useMemo(() => countDocument(markdown), [markdown])

  const openDoc = (nextTitle: string, nextMarkdown: string) => {
    setTitle(nextTitle)
    setEditor({ type: 'RESET', markdown: nextMarkdown })
  }

  const {
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
  } = useDocumentLibrary(
    { id: initial.activeId, title, markdown, currentDocument: JSON.stringify({ id: initial.activeId, title, markdown }) },
    openDoc,
    setToast,
    initial,
  )

  const currentDocument = useMemo(
    () => JSON.stringify({ id: activeId, title, markdown }),
    [activeId, title, markdown],
  )
  const saveState: SaveState = storageError ? 'error' : currentDocument === lastSavedDocument ? 'saved' : 'saving'

  const { handleEditorScroll, handlePreviewScroll } = useScrollSync(editorRef, previewScrollRef)

  const setEditorValue = (next: string, selectionStart: number, selectionEnd: number) => {
    lastTypedAtRef.current = 0
    setEditor({ type: 'UPDATE', markdown: next })
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const find = useFindReplace(markdown, editorRef)

  const replaceCurrent = () => {
    const match = find.matches[find.safeMatchIndex]
    if (!match) return
    const area = editorRef.current
    if (area && !(area.selectionStart === match.start && area.selectionEnd === match.end)) {
      find.gotoMatch(0)
      return
    }
    const next = `${markdown.slice(0, match.start)}${find.replaceWith}${markdown.slice(match.end)}`
    setEditorValue(next, match.start + find.replaceWith.length, match.start + find.replaceWith.length)
  }

  const replaceAll = () => {
    if (find.matches.length === 0) return
    const count = find.matches.length
    const parts: string[] = []
    let cursor = 0
    for (const match of find.matches) {
      parts.push(markdown.slice(cursor, match.start), find.replaceWith)
      cursor = match.end
    }
    parts.push(markdown.slice(cursor))
    const next = parts.join('')
    setEditor({ type: 'UPDATE', markdown: next })
    setToast(`${count} replacement${count === 1 ? '' : 's'} made`)
  }

  const { embedImageFile } = useImageEmbed(markdown, editorRef, setEditorValue, setToast)

  const format = (action: string) => {
    applyFormat(action as FormatAction, markdown, editorRef.current, setEditorValue)
  }

  const undo = () => {
    if (editor.historyIndex > 0) {
      setEditor({ type: 'UNDO' })
      editorRef.current?.focus()
    }
  }

  const redo = () => {
    if (editor.historyIndex < editor.history.length - 1) {
      setEditor({ type: 'REDO' })
      editorRef.current?.focus()
    }
  }

  const canUndo = editor.historyIndex > 0
  const canRedo = editor.historyIndex < editor.history.length - 1

  // Wipe the active page and begin again. Uses UPDATE (not RESET) so the
  // previous draft stays one undo away: a destructive action with a safety net.
  const clearActiveDoc = () => {
    setEditor({ type: 'UPDATE', markdown: '' })
    setTitle('Untitled document')
    setDocsOpen(false)
    setToast(`Page cleared. Press ${isMac ? '⌘Z' : 'Ctrl+Z'} to restore`)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const saveNow = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const { ok } = flushActiveDoc()
    markSavedIfCurrent(ok)
    setToast(ok ? 'Saved locally in this browser' : 'Could not save in this browser')
  }

  const downloadMarkdown = () => {
    downloadBlob(markdown, `${smartFilename(markdown, title)}.md`, 'text/markdown;charset=utf-8')
    setToast('Markdown downloaded')
  }

  const loadFile = async (file: File) => {
    if (!/\.(md|markdown|mdown|txt)$/i.test(file.name)) {
      setToast('Choose a Markdown or text file')
      return
    }
    try {
      const content = await file.text()
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const { library: flushed } = flushActiveDoc()
      if (flushed.docs.length >= MAX_LIBRARY_DOCS) {
        setToast(`Library holds up to ${MAX_LIBRARY_DOCS} documents`)
        return
      }
      const nextTitle = file.name.replace(/\.(md|markdown|mdown|txt)$/i, '') || 'Untitled'
      const doc: LibraryDoc = {
        id: createDocId(),
        title: nextTitle,
        markdown: content,
        updatedAt: Date.now(),
      }
      if (!openExternalDoc(doc)) return
      setLastSavedDocument(JSON.stringify({ id: doc.id, title: doc.title, markdown: content }))
      setToast(`${file.name} opened as a new document`)
    } catch {
      setToast('This file could not be opened')
    }
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void loadFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    // Images dropped onto the app embed into the document; Markdown files open.
    if (file.type.startsWith('image/')) {
      void embedImageFile(file)
      return
    }
    void loadFile(file)
  }

  const handleEditorPaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'))
    if (!file) return
    event.preventDefault()
    void embedImageFile(file)
  }

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    handleEditorKeyDown(event, markdown, setEditorValue, editorRef, {
      undo,
      redo,
      format: (action) => format(action),
      createDoc: () => createDoc(),
      downloadMarkdown,
      saveNow,
      openFindPanel: find.openFindPanel,
      setExportOpen,
      setShortcutsOpen,
      openFilePicker: () => fileInputRef.current?.click(),
      closeFindPanel: () => find.setFindPanel('closed'),
      isFindOpen: () => find.findPanel !== 'closed',
    })
  }

  useAppShortcuts(
    {
      undo,
      redo,
      format,
      createDoc: () => createDoc(),
      downloadMarkdown,
      saveNow,
      openFindPanel: find.openFindPanel,
      setExportOpen,
      setShortcutsOpen,
      openFilePicker: () => fileInputRef.current?.click(),
    },
    editorRef,
  )

  const restoreStarterTemplate = () => {
    setTitle(STARTER_TITLE)
    setEditor({ type: 'UPDATE', markdown: starterMarkdown })
    setWelcomeOpen(true)
  }

  const closeWelcome = () => {
    writeStorageJson(WELCOME_KEY, { seen: true })
    setWelcomeOpen(false)
  }

  const writeSettingsSafely = (value: ExportSettings) => {
    const result = writeStorageJson(SETTINGS_KEY, value)
    if (!result.ok) console.warn('Export preferences could not be saved locally', result.error)
  }

  useEffect(() => {
    writeSettingsSafely(exportSettings)
  }, [exportSettings])

  useEffect(() => {
    writeStorageJson(PAGE_PREVIEW_KEY, { show: showPageBreaks })
  }, [showPageBreaks])

  // Warn before closing while a save is still in flight or storage refused.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (storageError || currentDocument !== lastSavedDocument) event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [storageError, currentDocument, lastSavedDocument])

  // Close overlays that are not themselves dialogs (export/welcome have their own).
  const findPanelState = find.findPanel
  const closeFindPanel = find.setFindPanel
  useEffect(() => {
    if (!docsOpen && findPanelState === 'closed' && !shortcutsOpen) return
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (docsOpen) setDocsOpen(false)
      else if (shortcutsOpen) setShortcutsOpen(false)
      else {
        closeFindPanel('closed')
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [docsOpen, findPanelState, shortcutsOpen, closeFindPanel])

  useEffect(() => {
    if (!shortcutsOpen) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.shortcuts-popover, [aria-label="Keyboard shortcuts"]')) return
      setShortcutsOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [shortcutsOpen])

  useEffect(() => {
    const clearDrag = () => setDragging(false)
    window.addEventListener('dragend', clearDrag)
    return () => window.removeEventListener('dragend', clearDrag)
  }, [])

  const toolbar = toolbarConfig({ isMac, canUndo, canRedo, hasContent: markdown.length > 0 })

  const handleToolbarAction = (action: string) => {
    if (action === 'undo') return undo()
    if (action === 'redo') return redo()
    if (action === 'clear') return clearActiveDoc()
    format(action)
  }

  const onEditorChange = (displayValue: string) => {
    const now = Date.now()
    const coalesce = now - lastTypedAtRef.current < 800
    lastTypedAtRef.current = now
    setEditor({ type: 'UPDATE', markdown: expandImageUrls(displayValue, markdown), coalesce })
  }

  return (
    <div
      className="app"
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <AppHeader
        viewMode={viewMode}
        onViewMode={setViewMode}
        docsOpen={docsOpen}
        onToggleDocs={() => setDocsOpen(!docsOpen)}
        onOpenFile={() => fileInputRef.current?.click()}
        onDownload={downloadMarkdown}
        onToggleShortcuts={() => setShortcutsOpen(!shortcutsOpen)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onOpenExport={() => setExportOpen(true)}
        onHome={restoreStarterTemplate}
        isMac={isMac}
      />

      <DocumentBar
        title={title}
        onTitle={setTitle}
        toolbar={toolbar}
        onToolbarAction={handleToolbarAction}
        words={stats.words}
        minutes={stats.minutes}
        saveState={saveState}
      />

      <main className={`workspace mode-${viewMode}`}>
        <EditorPane
          markdown={markdown}
          editorRef={editorRef}
          onChange={onEditorChange}
          onScroll={handleEditorScroll}
          onKeyDown={onEditorKeyDown}
          onPaste={handleEditorPaste}
          findPanel={find.findPanel}
          onFindPanel={find.setFindPanel}
          findQuery={find.findQuery}
          onFindQuery={(query) => { find.setFindQuery(query); find.setMatchIndex(0) }}
          replaceWith={find.replaceWith}
          onReplaceWith={find.setReplaceWith}
          matchCase={find.matchCase}
          onMatchCase={(value) => { find.setMatchCase(value); find.setMatchIndex(0) }}
          matches={find.matches}
          safeMatchIndex={find.safeMatchIndex}
          findInputRef={find.findInputRef}
          onGotoMatch={find.gotoMatch}
          onReplaceCurrent={replaceCurrent}
          onReplaceAll={replaceAll}
          isMac={isMac}
        />

        <div className="pane-divider" />

        <PreviewPane
          markdown={markdown}
          rendered={rendered}
          settings={exportSettings}
          onSettings={setExportSettings}
          showPageBreaks={showPageBreaks}
          onTogglePageBreaks={() => setShowPageBreaks((value) => !value)}
          previewRef={previewScrollRef}
          onScroll={handlePreviewScroll}
          onOpenFile={() => fileInputRef.current?.click()}
        />
      </main>

      <Footer saveState={saveState} onOpenExport={() => setExportOpen(true)} />

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        aria-label="Open a Markdown file"
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        onChange={handleFileInput}
      />

      {dragging && <DropOverlay />}

      {shortcutsOpen && !isMobile && (
        <ShortcutsPopover isMac={isMac} onClose={() => setShortcutsOpen(false)} />
      )}

      {docsOpen && (
        <DocsPopover
          library={library}
          activeId={activeId}
          deleteArmId={deleteArmId}
          onSwitch={(id) => { switchDoc(id); setDocsOpen(false) }}
          onDuplicate={(id) => duplicateDoc(id)}
          onDelete={(id) => { deleteDoc(id); setDeleteArmId(null) }}
          onArmDelete={setDeleteArmId}
          onNew={() => { createDoc(); setDocsOpen(false); requestAnimationFrame(() => editorRef.current?.focus()) }}
          onClear={clearActiveDoc}
          onClose={() => setDocsOpen(false)}
        />
      )}

      {welcomeOpen && (
        <Suspense fallback={null}>
          <WelcomeTour onClose={closeWelcome} />
        </Suspense>
      )}

      <ExportStudio
        open={exportOpen}
        title={title}
        markdown={markdown}
        rendered={rendered}
        settings={exportSettings}
        onSettingsChange={setExportSettings}
        onClose={() => setExportOpen(false)}
        onToast={setToast}
      />

      <Toast message={toast} />
    </div>
  )
}
