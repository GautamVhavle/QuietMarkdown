<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="QuietMarkdown logo" />
</p>

<h1 align="center">QuietMarkdown</h1>

<p align="center">
  A private, local-first Markdown editor for writing quickly and exporting beautifully.
</p>

<p align="center">
  <a href="https://quietmark.vercel.app/"><strong>Open QuietMarkdown</strong></a>
  &nbsp;·&nbsp;
  <a href="#features">Features</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#deployment">Deploy</a>
</p>

<p align="center">
  <a href="https://github.com/GautamVhavle/QuietMarkdown/actions"><img src="https://img.shields.io/github/actions/workflow/status/GautamVhavle/QuietMarkdown/ci.yml?branch=main&style=flat-square&label=checks" alt="Checks" /></a>
  <a href="https://github.com/GautamVhavle/QuietMarkdown/releases"><img src="https://img.shields.io/github/v/release/GautamVhavle/QuietMarkdown?style=flat-square&label=release" alt="Release" /></a>
  <a href="https://quietmark.vercel.app/"><img src="https://img.shields.io/badge/live-quietmark.vercel.app-242421?style=flat-square" alt="Live site" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d85b3f?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/privacy-local--first-4f8662?style=flat-square" alt="Local first privacy" />
  <img src="https://img.shields.io/badge/offline-ready-8b6fc4?style=flat-square" alt="Offline ready" />
</p>

<p align="center">
  <img src="public/product-preview.png" alt="QuietMarkdown editor in split view with Markdown source and live preview" width="100%" />
</p>

---

## Why QuietMarkdown?

Markdown writing tools tend to choose between two extremes: bare browser utilities with fragile exports, or feature-heavy workspaces that make a blank page feel like a setup task. QuietMarkdown stays deliberately small on the surface and capable underneath.

- **Private by design.** No account, backend, database, analytics, or document upload. Your words never leave your device.
- **A library, not a lone note.** Keep many documents in one calm workspace.
- **Fast where it matters.** Live split preview and instant find & replace.
- **Files you own.** Open, drag & drop, paste images into, and download normal `.md` files. Markdown is the canonical source of truth.
- **Export with confidence.** Typeset PDF from ready templates, styled standalone HTML, and true 2× PNG pages of the HTML layout.

## Features

### A calm writing workspace

- Write, Split, and Preview modes that adapt from desktop to mobile
- Multi-document library — create (`⌘/Ctrl+Alt+N`), switch, duplicate, and delete notes in one place
- Find & Replace with match counts, wrap-around navigation, and match-case toggle (`⌘/Ctrl+F`, `⌘/Ctrl+H`)
- Paste or drop screenshots straight into the text as embedded data URLs — downscaled and optimized locally
- Local autosave with an honest save state (including "Not saved" if browser storage refuses writes)
- Light and dark themes, word count, reading time, accessible controls, reduced-motion support
- Optional **page-break preview** so you can see the document on A4 (or A5, A3, Letter, Legal, Tabloid) before exporting

### Useful Markdown, not feature bloat

- Headings, bold, italic, strikethrough, links, lists, blockquotes, dividers, tables, task lists, inline code, and fenced code blocks
- Syntax highlighting for Bash, CSS, HTML, JavaScript, JSON, Markdown, Python, and TypeScript
- Safe rendered output through DOMPurify sanitization
- A built-in field guide that demonstrates every supported feature on first launch

### A watermark-first export studio

The studio is tabbed. PDF is typeset as its own document; HTML and PNG share a webpage look. They are not the same file in three costumes.

| Export | What you get |
| --- | --- |
| **PDF** | A real, selectable document from a ready template. True paper size in PDF points, line-aware page breaks, optional watermark as PDF text |
| **HTML** | A portable standalone webpage with selected styling and no watermark |
| **PNG pages** | True 2× pictures of the HTML layout. Multi-page documents download as one ZIP of numbered PNG files |

PDF templates (pick one and export):

**Literary** · essays and long reads — **Report** · clean business papers — **Thesis** · papers and citations — **Memo** · short internal notes — **Notes** · typewritten drafts — **Letter** · correspondence on US Letter — **Spec** · technical write-ups — **Folio** · magazine features

HTML and PNG page styles (separate from PDF):

**Editorial** · warm expressive essays — **Minimal** · quiet working documents — **Academic** · numbered sections, booktabs tables — **Manuscript** · typewriter drafts — **Swiss** · graphic modernist hierarchy — **Letterpress** · classic crafted documents — **Executive** · sharp professional reports — **Notebook** · approachable personal notes

Watermarks are part of the PDF and PNG experience, not an afterthought. Control text, placement, tile mode, opacity, size, rotation, and color while previewing the final result. HTML and Markdown downloads remain clean.

### Works offline

A service worker caches the application shell after your first visit, so QuietMarkdown opens and keeps working without a network connection. Drafts live in browser storage either way.

### Built to be found

Technical SEO is treated as a product feature:

- The starter field guide is **prerendered into the served HTML**, so crawlers that never execute JavaScript index real content with proper heading hierarchy
- Structured data (`SoftwareApplication`, `WebSite`, `FAQPage`) for rich results
- Keyword-first title/description within SERP length limits, self-referencing canonicals, absolute Open Graph/Twitter images
- `sitemap.xml`, `robots.txt`, `llms.txt` for AI crawlers, HSTS, and a strict CSP validated against the production bundle
- Lighthouse: **100 SEO · 100 Accessibility · 100 Best Practices**
- A dedicated Playwright suite (`tests/seo.spec.ts`) asserts the crawler view on every CI run

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer

### Run locally

```bash
git clone https://github.com/GautamVhavle/QuietMarkdown.git
cd QuietMarkdown
npm install
npm run dev
```

Open the local URL printed by Vite.

### Quality checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Lint TypeScript and React source |
| `npm run build` | Create a static production bundle in `dist` |
| `npm run test:e2e` | Run desktop, tablet, and mobile Playwright workflows |
| `npm run preview` | Serve the production bundle locally |
| `npm run assets:generate` | Rebuild the branded app icon and social image assets |

## Keyboard shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Bold / Italic | `⌘B` / `⌘I` | `Ctrl+B` / `Ctrl+I` |
| Link / Inline code | `⌘K` / `⌘E` | `Ctrl+K` / `Ctrl+E` |
| Undo / Redo | `⌘Z` / `⌘⇧Z` | `Ctrl+Z` / `Ctrl+Y` |
| Find / Find & Replace | `⌘F` / `⌘H` | `Ctrl+F` / `Ctrl+H` |
| New document | `⌘⌥N` | `Ctrl+Alt+N` |
| Open file | `⌘O` | `Ctrl+O` |
| Download Markdown | `⌘⇧S` | `Ctrl+Shift+S` |
| Export studio | `⌘⇧E` | `Ctrl+Shift+E` |
| Shortcut cheat sheet | `⌘⇧/` | `Ctrl+Shift+/` |

## Architecture

```text
src/
├── App.tsx                  # Editor shell, document library, Export Studio
├── components/
│   └── ErrorBoundary.tsx    # Crash guard keeping drafts recoverable
├── lib/
│   ├── markdown.ts          # Sanitized Markdown rendering
│   ├── export.ts            # Portable HTML, styling presets, downloads
│   ├── pagination.ts        # Element-aware page-break computation
│   ├── pdf-document.ts      # Typeset Markdown → selectable PDF
│   ├── pdf-templates.ts     # Ready PDF templates (Literary, Report, …)
│   └── storage.ts           # Quota-safe localStorage wrapper
├── styles.css               # Design tokens, responsive UI, export presets
└── types.ts                 # Shared editor/export types

public/
├── sw.js                    # Offline service worker
├── site.webmanifest         # PWA manifest
└── ...                      # Favicons, icons, social image, sample image

scripts/                     # Reproducible brand-asset generator
tests/                       # Playwright desktop/tablet/mobile workflows
```

### Technology choices

- **React + TypeScript + Vite** for a fast static client application
- **markdown-it** and **markdown-it-task-lists** for focused GFM rendering
- **DOMPurify** to sanitize rendered Markdown and every export
- **Highlight.js** with a deliberately small language set
- **pdf-lib** typesets a real, selectable PDF from the Markdown (not a screenshot of HTML)
- **html-to-image** and **JSZip** for PNG page images
- **Playwright** for responsive end-to-end coverage

### How PDF export works

PDF is a real document: Markdown is parsed into headings, paragraphs, lists, tables, code, and images, then laid out from a chosen template in PDF points on A4 (or the paper size you chose). Text stays selectable and pages break between complete lines. That file will not match the HTML page — the studio keeps PDF templates and HTML styles on separate tabs for that reason. The live **Page breaks** preview still uses HTML so you can see how the styled webpage flows before PNG or HTML export.

## Privacy

QuietMarkdown runs entirely in the browser. Markdown is the source of truth; drafts, preferences, and embedded images are stored locally in browser storage. There are no accounts, no uploads, no analytics, and no telemetry of any kind.

A few practical notes:

- Clearing site data removes autosaved drafts — download the `.md` file when you need a durable backup.
- Remote image URLs can contact their host and can be blocked by browser CORS rules during PNG export. Prefer pasting images directly (they become local data URLs) for dependable private exports.
- PDF and PNG pages render locally at fixed page dimensions; very large image-heavy documents can require additional browser memory during generation.

## Roadmap

QuietMarkdown follows one rule: everything must keep working offline and privately. Candidate directions, roughly in order:

1. Document folders & tagging within local storage
2. Optional end-to-end encrypted sync (user-supplied storage, opt-in only)
3. Footnote and math syntax support
4. Version snapshots beyond undo history
5. Team-oriented export branding (custom fonts, logos)

Feature requests are welcome via [issues](https://github.com/GautamVhavle/QuietMarkdown/issues) — especially ones that fit the local-first philosophy.

## FAQ

**Where are my documents stored?**
In your browser's `localStorage` on this device only. Nothing is transmitted anywhere.

**What happens if I clear my browser data?**
Autosaved drafts go with it. Use *Save .md* (`⌘/Ctrl+Shift+S`) for anything you cannot afford to lose.

**Can I use it on my phone?**
Yes. The layout adapts to portrait screens with focused Write and Preview modes, and the app installs as a PWA.

**Do embedded images bloat storage?**
They are downscaled to at most 1600px and compressed before insertion, and the save system warns you honestly if storage refuses further writes.

## Deployment

QuietMarkdown deploys as a static application on Vercel. `vercel.json` configures the Vite build, output directory, security headers (CSP, frame protection, content-type sniffing), clean URLs, and immutable caching for compiled assets.

```bash
npm run build
npx vercel --prod
```

If you connect a custom domain, set `VITE_SITE_URL` to its origin so QuietMarkdown can generate canonical and Open Graph URLs correctly. See `.env.example`.

## Contributing

Small, thoughtful improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), keep the app local-first, avoid introducing document uploads or accounts, and run all checks before opening a pull request.

Security issues: please follow [SECURITY.md](SECURITY.md) rather than filing a public issue.

## License

QuietMarkdown is released under the [MIT License](LICENSE).

## Credits

Designed and built with care by [Gautam Vhavle](https://gautamvhavle.xyz/).
