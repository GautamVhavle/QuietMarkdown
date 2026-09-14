<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="QuietMarkdown logo" />
</p>

<h1 align="center">QuietMarkdown</h1>

<p align="center">
  A private, local-first Markdown editor that turns rough notes into<br />
  print-ready PDFs, portable HTML pages, and high-resolution PNGs —<br />
  entirely in your browser. No account. No uploads. No tracking.
</p>

<p align="center">
  <a href="https://quietmarkdown.vercel.app/"><strong>✦ Open QuietMarkdown</strong></a>
  &nbsp;·&nbsp;
  <a href="#export-studio">Export studio</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#keyboard-shortcuts">Shortcuts</a>
</p>

<p align="center">
  <a href="https://github.com/GautamVhavle/QuietMarkdown/actions"><img src="https://img.shields.io/github/actions/workflow/status/GautamVhavle/QuietMarkdown/ci.yml?branch=main&style=flat-square&label=checks" alt="Checks" /></a>
  <a href="https://github.com/GautamVhavle/QuietMarkdown/releases"><img src="https://img.shields.io/github/v/release/GautamVhavle/QuietMarkdown?style=flat-square&label=release" alt="Release" /></a>
  <a href="https://quietmarkdown.vercel.app/"><img src="https://img.shields.io/badge/live-quietmarkdown.vercel.app-242421?style=flat-square" alt="Live site" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d85b3f?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/privacy-local--first-4f8662?style=flat-square" alt="Local first privacy" />
  <img src="https://img.shields.io/badge/offline-ready-8b6fc4?style=flat-square" alt="Offline ready" />
</p>

<p align="center">
  <img src="public/product-preview.png" alt="QuietMarkdown editor in split view with Markdown source and live preview" width="100%" />
</p>

---

## Why QuietMarkdown?

Most Markdown tools force a tradeoff: bare browser utilities with fragile exports, or heavy workspaces that make a blank page feel like setup. QuietMarkdown stays calm on the surface and capable underneath.

- **🔒 Private by design.** No account, backend, database, analytics, or uploads. Words never leave your device.
- **📚 A library, not a lone note.** Create, switch, duplicate, and delete documents in one workspace.
- **⚡ Fast where it matters.** Live split preview, instant find & replace, honest autosave state.
- **📄 Files you own.** Open, drag & drop, paste images into, and download plain `.md` files. Markdown is the source of truth.
- **🎨 Export with confidence.** Real typeset PDFs, standalone HTML, and PNGs rasterized from the PDF itself — all with full typographic control.

## Export studio

The heart of QuietMarkdown. Three tabs, one shared design language, guided steps on every tab.

| Tab | What you get |
| --- | --- |
| **PDF** | A real, selectable document typeset with `pdf-lib` — true paper sizes in PDF points, line-aware page breaks, per-template chrome (top bars, letterheads, folio rules), optional watermark as PDF text |
| **HTML** | A portable standalone webpage with your styling baked in. Always clean — never watermarked |
| **PNG** | High-resolution (2×) pictures of the **PDF pages**, rasterized with `pdf.js`. Splits match the downloaded PDF page-for-page. Multi-page docs download as one numbered ZIP |

### Eight templates, actually different

| Template | Best for | What makes it distinct |
| --- | --- | --- |
| **Novel** | Book-style long reads | Warm paper, indented paragraphs, quiet centered folio |
| **Brief** | One-page business summaries | Blue top bar, uppercase headings, right-aligned folio |
| **Thesis** | Formal papers | Centered H1, deep first-line indent, centered folio |
| **Memo** | Short internal notes | Orange bar, compact type, no page numbers |
| **Field Notes** | Typewritten drafts | Cream paper, monospace body, no chrome |
| **Letter** | Correspondence | Letterhead rules, generous margins, US Letter paper |
| **Technical** | Specs & write-ups | Grey-blue paper, ruled H2s, right folio |
| **Magazine** | Feature stories | Folio rules top + bottom, biggest display H1, ruled H2 |

Picking a template syncs colours and paper so the change is immediately visible. Full descriptions live in hover tooltips; cards stay clean single-line rows.

### Fine-tune everything, on every tab

Each tab carries the same fine-tune panel:

- **Body** — searchable font picker (60 Google Fonts, live `Aa` previews, loaded on demand) + colour
- **Headings** — separate font picker + **All the same / Each level** toggle (one colour, or per-level H1/H2/H3 colours)
- **Links** — colour
- **Page layout** — paper size (A5 / A4 / A3 / Letter / Legal / Tabloid), margins (Narrow 48px / Normal 72px / Wide 96px), orientation (Portrait / Landscape), page-numbers toggle

Fonts load from Google Fonts on first pick (`display=swap`, cached after) with system-stack fallbacks offline. The PDF typesetter maps each font to its closest base family (serif / sans / mono) so downloads stay faithful.

### Watermarks, done right

Text, position (center / corners / tiled), opacity, size, rotation, and colour — previewed live on every page. Printed as real PDF text on PDF/PNG exports; HTML and Markdown downloads stay clean.

### Smart filenames

Downloads are named from your content, not the library title: the first `# H1` wins, otherwise the first real line (formatting stripped), capped at 6 words / 60 characters. `# QuietMarkdown editor field guide` → `quietmarkdown-editor-field-guide.pdf`.

## Writing workspace

- **Write / Split / Preview** modes that adapt from desktop to portrait mobile
- **Document library** — create (`⌘/Ctrl+Alt+N`), switch, duplicate, delete, clear-page with undo restore
- **Find & Replace** — match counts, wrap-around, match-case (`⌘/Ctrl+F`, `⌘/Ctrl+H`)
- **Embedded images** — paste or drop screenshots; downscaled to 1600px and stored as local data URLs
- **Page-break preview** — see the paginated HTML flow on any paper size before exporting
- **Themes** — light & dark, word count, reading time, reduced-motion support, accessible controls
- **Welcome tour** — four-scene animated intro on first visit (reopen anytime via the Q logo)

### Markdown support

Headings, bold, italic, strikethrough, links, lists, blockquotes, dividers, tables, task lists, inline code, and fenced code blocks — with syntax highlighting for Bash, CSS, HTML, JavaScript, JSON, Markdown, Python, and TypeScript. All output sanitized through DOMPurify. A built-in field guide demonstrates everything on first launch.

## Quick start

**Prerequisites:** Node.js 20+, npm 10+

```bash
git clone https://github.com/GautamVhavle/QuietMarkdown.git
cd QuietMarkdown
npm install
npm run dev
```

Open the URL Vite prints. That's it — no env vars, no backend.

### Quality checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Lint TypeScript and React source (zero warnings) |
| `npm run build` | Type-check + production bundle in `dist` |
| `npm run test:e2e` | Playwright suite: desktop, tablet, mobile |
| `npm run preview` | Serve the production bundle locally |
| `npm run assets:generate` | Rebuild branded icons and social images |

## Keyboard shortcuts

Works identically on macOS (`⌘`) and Windows/Linux (`Ctrl`) — the app listens for both `metaKey` and `ctrlKey`; only the displayed label changes.

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

> `Ctrl+H` may collide with browser history in Chrome/Edge — the toolbar search icon always works as a fallback.

## Architecture

```text
src/
├── App.tsx                    # Editor shell, document library, Export Studio
├── components/
│   ├── ErrorBoundary.tsx      # Crash guard keeping drafts recoverable
│   ├── FineTunePanel.tsx      # Shared font/colour/layout controls + font picker
│   ├── PagedPreview.tsx       # HTML page-break preview (editor pane)
│   ├── PdfPreview.tsx         # Pagewise PDF-template preview (export studio)
│   ├── PdfPngPages.tsx        # PDF-rasterized PNG preview (export studio)
│   └── WelcomeTour.tsx        # First-run animated intro
├── lib/
│   ├── markdown.ts            # Sanitized Markdown rendering
│   ├── export.ts              # HTML export, page geometry, filenames, presets
│   ├── fonts.ts               # 60-font library, on-demand Google Fonts loading
│   ├── pagination.ts          # Element-aware page-break computation
│   ├── pdf-document.ts        # Markdown → real selectable PDF (pdf-lib)
│   ├── pdf-raster.ts          # PDF bytes → PNG images (pdf.js)
│   ├── pdf-templates.ts       # Eight distinct PDF templates
│   └── storage.ts             # Quota-safe localStorage wrapper
├── styles.css                 # Design tokens, responsive UI, export styling
└── types.ts                   # Shared editor/export/fine-tune types

public/                        # PWA shell: service worker, manifest, icons, SEO files
scripts/                       # Reproducible brand-asset generator
tests/                         # Playwright desktop/tablet/mobile workflows
```

### Technology choices

- **React + TypeScript + Vite** — fast static client, zero backend
- **markdown-it + markdown-it-task-lists** — focused GFM rendering
- **DOMPurify** — every rendered string sanitized, including exports
- **Highlight.js** — small deliberate language set
- **pdf-lib** — real selectable PDFs (not screenshots)
- **pdf.js** — PNGs rasterized from actual PDF bytes
- **JSZip** — multi-page PNG downloads as one ZIP
- **Playwright** — responsive end-to-end coverage on every change

### How PDF export works

Markdown is parsed into headings, paragraphs, lists, tables, code, and images, then laid out from the chosen template in PDF points on the selected paper (orientation-aware). Fine-tune colours and fonts apply throughout; watermarks print as PDF text on every page. The studio's PDF tab previews the same pagination so there are no surprises.

## Privacy

Everything runs in the browser. Drafts, preferences, and embedded images live in `localStorage` on your device. No accounts, uploads, analytics, or telemetry of any kind.

Practical notes:

- Clearing site data removes autosaved drafts — download the `.md` when it matters.
- Remote image URLs can hit CORS limits during export. Paste images directly (they become local data URLs) for dependable private exports.
- Google Fonts load on demand when you pick a non-system font; offline, the system-stack fallback applies.
- Very large image-heavy documents need extra browser memory during PDF/PNG generation.

## Works offline

A service worker caches the app shell after your first visit — QuietMarkdown opens and keeps working without a network connection. Drafts persist in browser storage either way.

## Built to be found

Technical SEO as a product feature:

- Starter field guide **prerendered into served HTML** — crawlers without JS still index real content
- Structured data (`SoftwareApplication`, `WebSite`, `FAQPage`) for rich results
- Keyword-first title/description, self-referencing canonicals, absolute OG/Twitter images
- `sitemap.xml`, `robots.txt`, `llms.txt`, HSTS, strict CSP validated against the bundle
- Lighthouse: **100 SEO · 100 Accessibility · 100 Best Practices**
- `tests/seo.spec.ts` asserts the crawler view on every CI run

## Roadmap

One rule: everything must keep working offline and privately. Roughly in order:

1. Document folders & tagging within local storage
2. Optional end-to-end encrypted sync (user-supplied storage, opt-in only)
3. Footnote and math syntax support
4. Version snapshots beyond undo history
5. Team export branding (custom fonts, logos)

Ideas welcome via [issues](https://github.com/GautamVhavle/QuietMarkdown/issues) — especially ones that fit the local-first philosophy.

## FAQ

**Where are my documents stored?**
In this browser's `localStorage`, on this device only. Nothing is transmitted anywhere.

**What if I clear browser data?**
Autosaved drafts go with it. Use *Save .md* (`⌘/Ctrl+Shift+S`) for anything you can't afford to lose.

**Does it work on my phone?**
Yes — portrait layouts with focused Write/Preview modes, zero measured overflow at 390px, and PWA install support.

**Do embedded images bloat storage?**
They're downscaled to 1600px and compressed on paste; the save indicator tells you honestly if storage refuses writes.

**Why do PNG and PDF page breaks match?**
Because PNGs are rendered from the PDF bytes themselves — not from a separate HTML screenshot path.

## Deployment

Static app on Vercel. `vercel.json` sets the Vite build, `dist` output, security headers (CSP, frame protection, no-sniff), clean URLs, and immutable asset caching.

```bash
npm run build
npx vercel --prod
```

Live at **https://quietmarkdown.vercel.app** (also aliased: `quietmark.vercel.app`). For a custom domain, set `VITE_SITE_URL` so canonicals and OG images follow it. See `.env.example`.

## Contributing

Small, thoughtful improvements welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), keep it local-first (no uploads, no accounts), and run `npm run lint && npm run build && npm run test:e2e` before opening a PR.

Security issues: follow [SECURITY.md](SECURITY.md), not a public issue.

## License

MIT — see [LICENSE](LICENSE).

## Credits

Designed and built with care by [Gautam Vhavle](https://gautamvhavle.xyz/).
