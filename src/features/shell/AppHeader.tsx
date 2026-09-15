// Top bar: brand/home, view switcher, and header actions. Class names
// are frozen (tests + CSS depend on them).
import {
  Download,
  FileDown,
  Files,
  FolderOpen,
  Keyboard,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { Columns2, Eye, PenLine } from 'lucide-react'

import type { Theme, ViewMode } from '../../shared/settings/exportSettings'

interface AppHeaderProps {
  viewMode: ViewMode
  onViewMode: (mode: ViewMode) => void
  docsOpen: boolean
  onToggleDocs: () => void
  onOpenFile: () => void
  onDownload: () => void
  onToggleShortcuts: () => void
  theme: Theme
  onToggleTheme: () => void
  onOpenExport: () => void
  onHome: () => void
  isMac: boolean
}

export function AppHeader({
  viewMode,
  onViewMode,
  docsOpen,
  onToggleDocs,
  onOpenFile,
  onDownload,
  onToggleShortcuts,
  theme,
  onToggleTheme,
  onOpenExport,
  onHome,
  isMac,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="brand"
        onClick={onHome}
        title="Home: replay the intro and restore the starter template"
      >
        <span className="brand-mark" aria-hidden="true">Q</span>
        <span className="brand-name">QuietMarkdown</span>
        <span className="local-badge" aria-hidden="true"><ShieldCheck size={11} /> Private</span>
      </button>

      <nav className="view-switcher" aria-label="Document view">
        {([
          ['write', PenLine, 'Write'],
          ['split', Columns2, 'Split'],
          ['preview', Eye, 'Preview'],
        ] as const).map(([mode, Icon, label]) => (
          <button
            key={mode}
            data-view={mode}
            className={viewMode === mode ? 'active' : ''}
            onClick={() => onViewMode(mode)}
            aria-pressed={viewMode === mode}
          >
            <Icon size={14} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button
          className={`quiet-button ${docsOpen ? 'active' : ''}`}
          onClick={onToggleDocs}
          title="Documents"
          aria-expanded={docsOpen}
        >
          <Files size={16} /><span>Documents</span>
        </button>
        <button className="quiet-button" onClick={onOpenFile} title={`Open file (${isMac ? '⌘O' : 'Ctrl+O'})`}>
          <FolderOpen size={16} /><span>Open</span>
        </button>
        <button className="quiet-button" onClick={onDownload} title={`Download Markdown (${isMac ? '⌘⇧S' : 'Ctrl+Shift+S'})`}>
          <Download size={16} /><span>Save .md</span>
        </button>
        <span className="header-divider" />
        <button
          className="icon-button"
          onClick={onToggleShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          <Keyboard size={17} />
        </button>
        <button
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button className="primary-button" onClick={onOpenExport} aria-label="Open export studio">
          <FileDown size={16} /><span>Export</span>
        </button>
      </div>
    </header>
  )
}
