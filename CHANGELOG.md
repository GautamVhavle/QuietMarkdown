# Changelog

All notable changes to QuietMarkdown are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [1.2.0], 2026-09-14

### Added

- **Paged export preview**: toggle *Page breaks* in the live preview to see the document on A4 (default) or A5, A3, Letter, Legal, and Tabloid, using the same page-break algorithm as the PDF preview
- **Eight distinct PDF templates**: Novel, Brief, Thesis, Memo, Field Notes, Letter, Technical, and Magazine. Each has its own type, paper, margins, and page chrome, with a one-line differentiator on every card
- **Tabbed export studio**: PDF, HTML, and PNG each have their own path with guided steps (template → fine-tune → watermark)
- **Full fine-tuning on every tab**: 60-font Google Fonts library (searchable, live Aa previews) for body and headings, body/heading/link colours with an *All the same / Each level* heading mode, paper size, Narrow/Normal/Wide margins, Portrait/Landscape orientation, and a page-numbers toggle
- **PNGs rendered from the real PDF**: PNG pages are rasterized from the downloaded PDF bytes via pdf.js, so splits match the PDF page-for-page
- **Smart filenames**: downloads derive a short name from the first `# H1` (or first content line), capped at 6 words / 60 characters, instead of the library title
- **Pagewise PDF preview**: the PDF tab shows every real page with template typography, chrome, watermarks, and folios

### Changed

- **PDF export is a real document**, not a screenshot of HTML. Text is selectable, pages are true paper sizes in PDF points (orientation-aware), and line breaks happen in the typesetter instead of by clipping a canvas
- Fine-tune settings are shared across PDF, HTML, and PNG: what you see is what you download
- Template and preset cards are fixed-height, name-only rows with full descriptions in hover tooltips
- Mobile export studio hardened: zero measured overflow at 390px, stacked controls, in-flow font picker

### Removed

- Real-time Mermaid diagram rendering from the editor, preview, and exports
- Legacy HTML-screenshot PNG pipeline (`html-to-image`, canvas watermark painter, capture host)
- Redundant top-level `paper` / `margin` export settings (superseded by fine-tune paper + margin presets)

### Performance

- Initial JS roughly halved via vendor chunk splitting (export engines + motion load lazily)
- Welcome tour lazy loaded, preview rendering deferred, PNG preview debounced, sourcemaps removed from dist
- Google Fonts preconnect in document head

### Planned

- Document folders & tagging within local storage

## [1.1.0], 2026-02-17

### Added

- **Welcome tour**: four-scene animated introduction (Framer Motion): miniature live-preview demo, privacy seal, capability grid with self-drawing Mermaid spark, export fan. Opens on first visit; the Q logo reopens it anytime.
- **Document library**: create (`⌘/Ctrl+Alt+N`), switch, duplicate, and delete documents; older single-document saves migrate automatically.
- **Find & Replace**: match counts, wrap-around navigation, match-case toggle (`⌘/Ctrl+F`, `⌘/Ctrl+H`).
- **Embedded images**: paste or drop images as locally downscaled data URLs.
- **Offline support**: service worker caches the app shell (PWA-installable).
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

## [1.0.0], Initial public release

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
