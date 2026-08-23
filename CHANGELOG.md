# Changelog

All notable changes to QuietMarkdown are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Document library** — keep many notes in one workspace: create (`⌘/Ctrl+Alt+N`), switch, duplicate, and delete documents from the new header popover. Existing single-document saves migrate automatically.
- **Find & Replace** — search with match counts, wrap-around navigation, match-case toggle, and replace / replace-all (`⌘/Ctrl+F`, `⌘/Ctrl+H`).
- **Embedded images** — paste or drop an image into the editor and it is downscaled, optimized, and inserted as a local `data:` URL. No uploads, ever.
- **Offline support** — a service worker caches the app shell so QuietMarkdown opens without a network connection.
- **Crash safety** — a React error boundary keeps drafts recoverable if rendering ever fails.
- **Honest save states** — storage writes are quota-aware; the indicator now shows "Not saved" instead of failing silently when browser storage refuses writes.
- **Unsaved-changes guard** — closing the tab mid-save now asks for confirmation.
- Export warnings when a Mermaid diagram could not be updated and kept its last valid frame.

### Changed

- Very large documents (>30k characters) debounce preview rendering so typing stays smooth.

## [1.0.0] — Initial public release

### Added

- Distraction-free local-first Markdown editor with autosave, undo/redo history, and live split preview
- Real-time Mermaid diagram rendering with caching, error recovery, and self-healing preview
- Three responsive layouts (Write / Split / Preview), light & dark themes
- Syntax-highlighted code fences via Highlight.js, GFM task lists
- Export Studio: PDF, standalone HTML, and 2× PNG pages with eight typographic presets and full watermark control
- Element-aware PDF pagination that keeps diagrams, tables, and code blocks intact across page breaks
- Field guide starter document demonstrating every supported feature
- SEO metadata, Open Graph tags, JSON-LD structured data, PWA manifest
- Playwright end-to-end suite across desktop, tablet, and mobile viewports

[unreleased]: https://github.com/GautamVhavle/QuietMarkdown/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/GautamVhavle/QuietMarkdown/releases/tag/v1.0.0
