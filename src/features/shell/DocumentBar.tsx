// Document bar: title input, formatting toolbar, and document stats.
import { FileText } from 'lucide-react'

import type { ToolbarItem } from '../formatting/toolbarConfig'
import type { StorageFailure } from '../library/types'

import { saveStatusText } from './saveCopy'

interface DocumentBarProps {
  title: string
  onTitle: (title: string) => void
  toolbar: ToolbarItem[]
  onToolbarAction: (action: string) => void
  words: number
  minutes: number
  saveState: 'saved' | 'saving' | 'error'
  failure: StorageFailure | null
  onDownload: () => void
}

export function DocumentBar({
  title,
  onTitle,
  toolbar,
  onToolbarAction,
  words,
  minutes,
  saveState,
  failure,
  onDownload,
}: DocumentBarProps) {
  return (
    <div className="document-bar">
      <div className="title-wrap">
        <FileText size={15} />
        <input
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          placeholder="Untitled document"
          aria-label="Document title"
        />
      </div>

      <div className="format-toolbar" aria-label="Markdown tools">
        {toolbar.map(({ action, icon: Icon, label, shortcut, group, disabled }, index) => (
          <span className="toolbar-item-wrap" key={action}>
            {index > 0 && group !== toolbar[index - 1].group && <span className="toolbar-divider" />}
            <button
              className={`format-button ${disabled ? 'disabled' : ''}`}
              onClick={() => onToolbarAction(action)}
              aria-label={label}
              aria-disabled={disabled}
              title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
              disabled={disabled}
            >
              <Icon size={15} />
            </button>
          </span>
        ))}
      </div>

      <div className="document-stats" aria-label="Document details">
        <span className="stat-count">{words.toLocaleString()} words</span>
        <i />
        <span className="stat-count">{minutes} min read</span>
        <span className={`save-indicator ${saveState}`}>
          <b /> {saveStatusText(saveState, failure)}
        </span>
        {saveState === 'error' && (
          <button type="button" className="save-download" onClick={onDownload}>Download this note</button>
        )}
      </div>
    </div>
  )
}
