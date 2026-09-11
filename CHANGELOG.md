# Changelog

All notable changes to QuietMarkdown are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Paged export preview** — toggle *Page breaks* in the live preview to see the document on A4 (default) or A5, A3, Letter, Legal, and Tabloid, using the same page-break algorithm as PNG export
- **Eight ready PDF templates** — Literary, Report, Thesis, Memo, Notes, Letter, Spec, and Folio. Each has its own type, paper, margins, and page chrome
- **Tabbed export studio** — PDF, HTML, and PNG each have their own path, because a typeset PDF cannot match the HTML page

### Changed

- **PDF export is a real document**, not a screenshot of HTML. Text is selectable, pages are true A4/Letter/etc. sizes in PDF points, and line breaks happen in the typesetter instead of by clipping a canvas
- HTML page styles stay on the HTML tab (and PNG pictures of that layout). PDF templates no longer share those controls
- PNG pages still capture the HTML layout; the Page breaks preview remains an HTML preview of that flow

### Removed

- Real-time Mermaid diagram rendering from the editor, preview, and exports

### Planned

- Document folders & tagging within local storage

## [1.1.0] — 2026-02-17

### Added

- **Welcome tour** — four-scene animated introduction (Framer Motion): miniature live-preview demo, privacy seal, capability grid with self-drawing Mermaid spark, export fan. Opens on first visit; the Q logo reopens it anytime.
- **Document library** — create (`⌘/Ctrl+Alt+N`), switch, duplicate, and delete documents; older single-document saves migrate automatically.
- **Find & Replace** — match counts, wrap-around navigation, match-case toggle (`⌘/Ctrl+F`, `⌘/Ctrl+H`).
- **Embedded images** — paste or drop images as locally downscaled data URLs.
- **Offline support** — service worker caches the app shell (PWA-installable).
- **Clear page · start fresh** action in the Documents menu with one-step undo restore.

### Changed

- Production site moved to https://quietmark.vercel.app
- Keyword-first SEO title/description; prerendered crawler content; FAQPage schema; `llms.txt`; HSTS
- Brand mark unified across favicon.ico, touch icons, OG image, and the app logo

### Fixed

- Editor history duplicated entries after document switches, making undo skip states
- Mermaid diagrams sliced across PDF pages; oversized diagrams now auto-fit
- Storage quota failures surfaced honestly ("Not saved") instead of silently breaking autosave
- CSP violation from the no-js swap script (hash-exempted); Lighthouse Best Practices back to 100

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

[unreleased]: https://github.com/GautamVhavle/QuietMarkdown/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/GautamVhavle/QuietMarkdown/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/GautamVhavle/QuietMarkdown/releases/tag/v1.0.0
