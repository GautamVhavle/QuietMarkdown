<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="QuietMark logo" />
</p>

<h1 align="center">QuietMark</h1>

<p align="center">
  A private, local-first Markdown editor for writing quickly and exporting beautifully.
</p>

<p align="center">
  <a href="https://quietmark.vercel.app/"><strong>Open QuietMark</strong></a>
  &nbsp;·&nbsp;
  <a href="https://quietmark.vercel.app/"><strong>quietmark.vercel.app</strong></a>
  &nbsp;·&nbsp;
  <a href="#features">Features</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#deployment">Deploy</a>
</p>

<p align="center">
  <a href="https://github.com/GautamVhavle/QuietMark/actions"><img src="https://img.shields.io/github/actions/workflow/status/GautamVhavle/QuietMark/ci.yml?branch=main&style=flat-square&label=checks" alt="Checks" /></a>
  <a href="https://quietmark.vercel.app/"><img src="https://img.shields.io/badge/live-quietmark.vercel.app-242421?style=flat-square" alt="Live site" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d85b3f?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/privacy-local--first-4f8662?style=flat-square" alt="Local first privacy" />
</p>

<p align="center">
  <img src="public/product-preview.png" alt="QuietMark editor in split view with Markdown source and live preview" width="100%" />
</p>

## Why QuietMark?

Markdown writing tools tend to choose between two extremes: bare browser utilities with fragile exports, or feature-heavy workspaces that make a blank page feel like a setup task. QuietMark stays deliberately small on the surface and capable underneath.

- **Private by design.** No account, backend, database, analytics, or document upload.
- **Fast where it matters.** Write in Markdown and see a refined preview immediately.
- **Files you own.** Open, drag and drop, and download normal `.md` files.
- **Export with confidence.** Create styled HTML, print-ready PDF, and true 2x PNG pages.
- **Built for presentation.** Tune typography, paper, accent color, margins, and watermarks in one focused studio.

## Features

### A calm Markdown workspace

- Write, Split, and Preview modes that adapt to desktop and mobile
- Local autosave with a concise visible save state
- Light and dark themes
- Word count and reading time
- Keyboard shortcuts for bold, italic, links, code, file opening, Markdown download, and export
- Accessible controls, visible focus states, and reduced-motion support

### Useful Markdown, not feature bloat

- Headings, bold, italic, strikethrough, links, images, lists, blockquotes, dividers, tables, task lists, inline code, and fenced code blocks
- Syntax highlighting for Bash, CSS, HTML, JavaScript, JSON, Markdown, Python, and TypeScript
- Safe rendered output through DOMPurify
- A built-in field guide template that demonstrates every supported writing feature

### A watermark-first export studio

| Export | What you get |
| --- | --- |
| **PDF** | Browser-native print flow for crisp, selectable text and reliable multipage output |
| **HTML** | A portable standalone document with its selected export styling |
| **PNG pages** | True 2x page images. Multi-page documents download as one ZIP containing numbered PNG files |

Choose one of three structurally distinct document systems:

- **Editorial** for warm, expressive essays and features
- **Minimal** for quiet, restrained working documents
- **Academic** for formal papers with numbered sections and booktabs-inspired tables

Watermarks are part of the export experience, not an afterthought. Control text, placement, tile mode, opacity, size, rotation, and color while previewing the final result.

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer

### Run locally

```bash
git clone https://github.com/GautamVhavle/QuietMark.git
cd QuietMark
npm install
npm run dev
```

Open the local URL printed by Vite.

### Quality checks

```bash
npm run lint
npm run build
npm run test:e2e
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run assets:generate` | Rebuild the branded app icon and social image assets |
| `npm run lint` | Lint TypeScript and React source |
| `npm run build` | Create a static production bundle in `dist` |
| `npm run test:e2e` | Run desktop and mobile Playwright workflows |
| `npm run preview` | Serve the production bundle locally |

## Architecture

```text
src/
├── App.tsx             # Editor, toolbar, views, local persistence, Export Studio
├── lib/
│   ├── markdown.ts     # Sanitized Markdown and syntax highlighting policy
│   └── export.ts       # HTML, print/PDF, styling, and download utilities
├── styles.css          # Design tokens, responsive UI, editor, export presets
└── types.ts            # Export, watermark, theme, and view types

public/                 # Favicons, web manifest, social image, local sample image
scripts/                # Reproducible brand-asset generator
tests/                  # Playwright desktop and mobile user workflows
```

### Technology choices

- **React + TypeScript + Vite** for a fast static client application
- **markdown-it** and **markdown-it-task-lists** for focused GFM rendering
- **DOMPurify** to sanitize rendered Markdown and exports
- **Highlight.js** with a deliberately small language set
- **html-to-image** and **JSZip** for high-resolution page-based PNG exports
- **Playwright** for responsive end-to-end coverage

## Privacy

QuietMark runs entirely in the browser. Markdown is the source of truth and draft plus export preferences are stored locally in browser storage.

A few practical notes:

- Clear site data can remove an autosaved draft, so download the `.md` file when you need a durable backup.
- Remote image URLs can contact their host and can be blocked by browser CORS rules during PNG export. Prefer local images for dependable private exports.
- PDF uses the browser print flow. Choose **Save as PDF** in the print dialog for a high-quality document.

## Deployment

QuietMark is ready to deploy as a static application on Vercel. `vercel.json` configures the Vite build, output directory, security headers, clean URLs, and immutable caching for compiled assets.

```bash
npm run build
npx vercel --prod
```

Vercel supplies a production URL automatically. If you connect a custom domain, set `VITE_SITE_URL` to its origin so QuietMark can generate canonical and Open Graph URLs correctly. See `.env.example`.

## Contributing

Small, thoughtful improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), keep the app local-first, avoid introducing document uploads or accounts, and run all checks before opening a pull request.

## License

QuietMark is released under the [MIT License](LICENSE).

## Credits

Designed and built with care by [Gautam Vhavle](https://gautamvhavle.xyz/).
