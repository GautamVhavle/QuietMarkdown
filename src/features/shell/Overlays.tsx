// Floating overlays: toast, drop target, shortcuts popover, documents menu.
import { Check, Copy, Eraser, FilePlus2, FileText, Trash2, UploadCloud, X } from 'lucide-react'

import { relativeTime } from '../../shared/lib/relativeTime'
import type { Library } from '../library/types'
import { MAX_LIBRARY_DOCS } from '../library/types'

export function Toast({ message }: { message: string }) {
  return (
    <div className={`toast ${message ? 'visible' : ''}`} role="status">
      <Check size={15} /> {message}
    </div>
  )
}

export function DropOverlay() {
  return (
    <div
      className="drop-overlay"
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          // Parent toggles dragging off; overlay itself is presentational.
        }
      }}
    >
      <span><UploadCloud size={28} /></span>
      <h2>Drop to open</h2>
      <p>Markdown files open as a new document. Images embed in the page you are writing. Your current draft stays in the library.</p>
    </div>
  )
}

interface ShortcutsPopoverProps {
  isMac: boolean
  onClose: () => void
}

export function ShortcutsPopover({ isMac, onClose }: ShortcutsPopoverProps) {
  return (
    <div className="shortcuts-popover">
      <div><strong>Keyboard shortcuts</strong><button onClick={onClose}><X size={14} /></button></div>
      <dl>
        <dt>Undo</dt><dd>{isMac ? '⌘ Z' : 'Ctrl+Z'}</dd>
        <dt>Redo</dt><dd>{isMac ? '⌘ ⇧ Z' : 'Ctrl+Y'}</dd>
        <dt>Bold</dt><dd>{isMac ? '⌘ B' : 'Ctrl+B'}</dd>
        <dt>Italic</dt><dd>{isMac ? '⌘ I' : 'Ctrl+I'}</dd>
        <dt>Link</dt><dd>{isMac ? '⌘ K' : 'Ctrl+K'}</dd>
        <dt>Inline code</dt><dd>{isMac ? '⌘ E' : 'Ctrl+E'}</dd>
        <dt>Find</dt><dd>{isMac ? '⌘ F' : 'Ctrl+F'}</dd>
        <dt>Find &amp; replace</dt><dd>{isMac ? '⌘ H' : 'Ctrl+H'}</dd>
        <dt>New document</dt><dd>{isMac ? '⌘ ⌥ N' : 'Ctrl+Alt+N'}</dd>
        <dt>Open file</dt><dd>{isMac ? '⌘ O' : 'Ctrl+O'}</dd>
        <dt>Save Markdown</dt><dd>{isMac ? '⌘ ⇧ S' : 'Ctrl+Shift+S'}</dd>
        <dt>Export studio</dt><dd>{isMac ? '⌘ ⇧ E' : 'Ctrl+Shift+E'}</dd>
      </dl>
    </div>
  )
}

interface DocsPopoverProps {
  library: Library
  activeId: string
  deleteArmId: string | null
  onSwitch: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onArmDelete: (id: string | null) => void
  onNew: () => void
  onClear: () => void
  onClose: () => void
}

export function DocsPopover({
  library,
  activeId,
  deleteArmId,
  onSwitch,
  onDuplicate,
  onDelete,
  onArmDelete,
  onNew,
  onClear,
  onClose,
}: DocsPopoverProps) {
  return (
    <>
      <button
        className="docs-backdrop"
        aria-label="Close documents"
        onClick={onClose}
      />
      <div className="docs-popover" role="dialog" aria-label="Documents">
        <div className="docs-head">
          <strong>Documents</strong>
          <span className="docs-count">{library.docs.length}/{MAX_LIBRARY_DOCS}</span>
          <button className="docs-new" onClick={onNew}>
            <FilePlus2 size={13} /> New
          </button>
        </div>
        <ul className="docs-list">
          {[...library.docs]
            .sort((a, b) => (b.id === activeId ? 1 : 0) - (a.id === activeId ? 1 : 0) || b.updatedAt - a.updatedAt)
            .map((doc) => {
              const isActive = doc.id === activeId
              return (
                <li key={doc.id} className={isActive ? 'active' : ''}>
                  <button className="docs-row" onClick={() => onSwitch(doc.id)} title={doc.title}>
                    <FileText size={14} />
                    <span className="docs-title">{doc.title || 'Untitled document'}{isActive ? ' · open' : ''}</span>
                    <span className="docs-time">{relativeTime(doc.updatedAt)}</span>
                  </button>
                  <button
                    className="docs-action"
                    aria-label={`Duplicate ${doc.title}`}
                    title="Duplicate"
                    onClick={() => onDuplicate(doc.id)}
                  >
                    <Copy size={13} />
                  </button>
                  {deleteArmId === doc.id ? (
                    <button
                      className="docs-action confirm"
                      aria-label={`Confirm delete ${doc.title}`}
                      title="Confirm delete"
                      onClick={() => onDelete(doc.id)}
                    >
                      <Trash2 size={13} /> Sure?
                    </button>
                  ) : (
                    <button
                      className="docs-action"
                      aria-label={`Delete ${doc.title}`}
                      title="Delete"
                      onClick={() => onArmDelete(doc.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              )
            })}
        </ul>
        <div className="docs-clear-row">
          <button className="docs-clear" onClick={onClear} title="Erase this page and begin anew">
            <Eraser size={13} />
            Clear page · start fresh
          </button>
        </div>
        <p className="docs-foot">Documents live only in this browser.</p>
      </div>
    </>
  )
}
