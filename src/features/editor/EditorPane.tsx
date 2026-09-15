// Markdown editor pane: find panel + textarea + empty state. The textarea
// shows collapsed image placeholders; state keeps the full data URLs.
import { PenLine, Search, X } from 'lucide-react'
import type { ChangeEvent, ClipboardEvent as ReactClipboardEvent, KeyboardEvent, RefObject } from 'react'

import type { TextMatch } from '../findReplace/useFindReplace'

import { collapseImageUrls } from './imagePlaceholders'

interface EditorPaneProps {
  markdown: string
  editorRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onScroll: () => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (event: ReactClipboardEvent<HTMLTextAreaElement>) => void
  findPanel: 'closed' | 'find' | 'replace'
  onFindPanel: (panel: 'closed' | 'find' | 'replace') => void
  findQuery: string
  onFindQuery: (query: string) => void
  replaceWith: string
  onReplaceWith: (value: string) => void
  matchCase: boolean
  onMatchCase: (value: boolean) => void
  matches: TextMatch[]
  safeMatchIndex: number
  findInputRef: RefObject<HTMLInputElement | null>
  onGotoMatch: (offset: number) => void
  onReplaceCurrent: () => void
  onReplaceAll: () => void
  isMac: boolean
}

export function EditorPane({
  markdown,
  editorRef,
  onChange,
  onScroll,
  onKeyDown,
  onPaste,
  findPanel,
  onFindPanel,
  findQuery,
  onFindQuery,
  replaceWith,
  onReplaceWith,
  matchCase,
  onMatchCase,
  matches,
  safeMatchIndex,
  findInputRef,
  onGotoMatch,
  onReplaceCurrent,
  onReplaceAll,
  isMac,
}: EditorPaneProps) {
  return (
    <section className="editor-pane" aria-label="Markdown editor">
      <div className="pane-label">
        <span>Markdown</span>
        <span className="pane-label-actions">
          <button
            className="pane-tool"
            onClick={() => (findPanel === 'closed' ? onFindPanel('find') : onFindPanel('closed'))}
            aria-label="Find in document"
            title={`Find (${isMac ? '⌘F' : 'Ctrl+F'})`}
          >
            <Search size={12} />
          </button>
          <span>UTF-8</span>
        </span>
      </div>
      <div className="editor-wrap">
        {!markdown && (
          <div className="editor-empty" aria-hidden="true">
            <PenLine size={22} />
            <strong>Start with a thought…</strong>
            <span>or drop a Markdown file anywhere</span>
          </div>
        )}
        {findPanel !== 'closed' && (
          <div className="find-panel" role="search" aria-label={findPanel === 'replace' ? 'Find and replace' : 'Find'}>
            <div className="find-row">
              <input
                ref={findInputRef}
                value={findQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) => { onFindQuery(event.target.value) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); onGotoMatch(event.shiftKey ? -1 : 1) }
                }}
                placeholder="Find"
                aria-label="Find text"
              />
              <span className="find-count" aria-live="polite">
                {findQuery ? `${matches.length === 0 ? 0 : safeMatchIndex + 1}/${matches.length}` : ''}
              </span>
              <button onClick={() => onGotoMatch(-1)} aria-label="Previous match" disabled={matches.length === 0}>↑</button>
              <button onClick={() => onGotoMatch(1)} aria-label="Next match" disabled={matches.length === 0}>↓</button>
              <button
                className={matchCase ? 'on' : ''}
                onClick={() => onMatchCase(!matchCase)}
                aria-label="Match case"
                aria-pressed={matchCase}
                title="Match case"
              >
                Aa
              </button>
              <button onClick={() => onFindPanel('closed')} aria-label="Close find panel"><X size={13} /></button>
            </div>
            {findPanel === 'replace' && (
              <div className="find-row">
                <input
                  value={replaceWith}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => onReplaceWith(event.target.value)}
                  placeholder="Replace with"
                  aria-label="Replace with"
                />
                <button onClick={onReplaceCurrent} disabled={matches.length === 0} title="Replace current match">Replace</button>
                <button onClick={onReplaceAll} disabled={matches.length === 0} title="Replace every match">All</button>
              </div>
            )}
          </div>
        )}
        <textarea
          ref={editorRef}
          value={collapseImageUrls(markdown)}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          spellCheck="true"
          autoCapitalize="sentences"
          aria-label="Markdown content"
        />
      </div>
    </section>
  )
}
