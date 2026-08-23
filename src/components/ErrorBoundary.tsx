import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort render guard. Without this, a single rendering exception
 * unmounts the whole tree and the user sees a blank page with no way to
 * recover their draft. The fallback keeps the frame calm, explains what
 * happened, and offers a reload — the draft itself lives in localStorage
 * and survives the reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry by design — QuietMarkdown never sends document data anywhere.
    console.error('QuietMarkdown hit an unexpected error', error, info.componentStack)
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <span className="error-boundary-mark">!</span>
          <h1>Something interrupted your writing session.</h1>
          <p>
            Your draft is safe in this browser&rsquo;s local storage — reloading restores it.
            If this keeps happening, download a copy of your Markdown from the editor first.
          </p>
          <button onClick={this.handleReload}>Reload QuietMarkdown</button>
        </div>
      )
    }
    return this.props.children
  }
}
