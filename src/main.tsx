import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/dm-mono/latin-400.css'
import '@fontsource/dm-mono/latin-500.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-500.css'
import '@fontsource/newsreader/latin-600.css'
import 'highlight.js/styles/github.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/editor.css'
import './styles/preview.css'
import './styles/exportStudio.css'
import './styles/tour.css'
import './styles/responsive.css'
import { App } from './app/App'
import { ErrorBoundary } from './features/shell/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Offline support for the local-first promise. The service worker only runs
// in production builds. During development Vite's module graph would defeat
// caching and serve stale modules after edits.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline support could not be enabled', error)
    })
  })
}
