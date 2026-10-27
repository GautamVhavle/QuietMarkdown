import { Component, type ErrorInfo, type ReactNode } from 'react'

import { downloadNote } from '../library/downloadNote'

import { noteCrash, readCrashDraft } from './crashDraft'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  crashes: number
}

/**
 * Last-resort render guard. The draft is published by App on each render,
 * so Download this note still has the words when the tree is dead. A note
 * that crashes twice is quarantined and the next load opens the library
 * instead of remounting it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, crashes: 0 }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, crashes: noteCrash(readCrashDraft().id) }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('QuietMarkdown hit an unexpected error', error, info.componentStack)
  }

  private readonly handleDownload = (): void => {
    const draft = readCrashDraft()
    void downloadNote(draft.title, draft.markdown)
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    const quarantined = this.state.crashes >= 2
    return (
      <div className="error-boundary" role="alert">
        <span className="error-boundary-mark">Q</span>
        <h1>{quarantined ? 'This note crashed twice.' : 'Something interrupted this note.'}</h1>
        <p>
          {quarantined
            ? 'Download this note. QuietMarkdown will open the library next, and will not load this note again until you choose it.'
            : 'Download this note before reloading. If the same note crashes again, the library opens instead of it.'}
        </p>
        <div className="error-boundary-actions">
          <button type="button" onClick={this.handleDownload}>Download this note</button>
          {quarantined
            ? <button type="button" className="error-boundary-secondary" onClick={this.handleReload}>Open library</button>
            : <button type="button" className="error-boundary-secondary" onClick={this.handleReload}>Reload</button>}
        </div>
      </div>
    )
  }
}
