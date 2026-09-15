// App footer: privacy link, credit, repo link, save state, export shortcut.
import { FileDown, ShieldCheck } from 'lucide-react'

interface FooterProps {
  saveState: 'saved' | 'saving' | 'error'
  onOpenExport: () => void
}

export function Footer({ saveState, onOpenExport }: FooterProps) {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <a className="footer-privacy" href="/privacy">
          <ShieldCheck size={13} />
          <span>Private by design</span>
        </a>
      </div>
      <p className="footer-credit">
        Built with <span className="footer-heart" aria-label="love">♥</span> by{' '}
        <a href="https://gautamvhavle.xyz/" target="_blank" rel="noreferrer noopener">
          Gautam Vhavle <span aria-hidden="true">↗</span>
        </a>
      </p>
      <div className="footer-status">
        <a
          className="footer-repo"
          href="https://github.com/GautamVhavle/QuietMarkdown"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View on GitHub"
        >
          <GitHubMark size={13} />
          <span>View on GitHub</span>
        </a>
        <span className={`footer-save ${saveState}`}><b /> {saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved' : 'Saving'}</span>
        <button onClick={onOpenExport}><FileDown size={14} /> Export</button>
      </div>
    </footer>
  )
}

function GitHubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.35 9.35 0 0 1 12 6.2c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.35 4.81-4.58 5.06.36.32.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}
