# Contributing to QuietMarkdown

Thank you for helping improve QuietMarkdown. This guide explains the product's principles, how to work on the codebase, and what reviewers look for.

## Product principles

Before proposing a change, keep the core product intent in view:

1. **Local-first:** never require an account, backend, cloud sync, or document upload for core work.
2. **Small surface area:** prefer a well-finished essential over an additional panel, dashboard, or configuration screen.
3. **Portable source:** Markdown remains the canonical document.
4. **Export confidence:** preview and export should remain visually consistent.
5. **Respect privacy:** never collect document text, filenames, clipboard contents, or export payloads.

A feature that cannot honor these principles needs a very good reason — or a different home.

## Project layout

```text
src/
├── App.tsx                  # Editor shell, document library, Export Studio
├── components/              # ErrorBoundary and future isolated components
├── lib/
│   ├── markdown.ts          # Sanitized rendering + real-time Mermaid engine
│   ├── export.ts            # Export presets, standalone HTML, downloads
│   ├── pagination.ts        # Element-aware page-break computation
│   └── storage.ts           # Quota-safe localStorage wrapper (always use it)
├── styles.css               # Design tokens + all styling
└── types.ts                 # Shared editor/export types

public/sw.js                 # Offline service worker (bump CACHE_NAME when shell changes)
scripts/generate-assets.mjs  # Reproducible brand assets
tests/editor.spec.ts         # Playwright workflows (desktop/tablet/mobile projects)
```

### Conventions worth knowing

- **All storage access goes through `lib/storage.ts`.** Direct `localStorage.setItem` calls throw under quota pressure; the wrapper converts failures into honest UI states.
- **Mermaid diagrams are slot-based.** `renderMarkdown` stamps each fence with a stable `data-slot`; `initMermaid` renders into those slots with LRU caching keyed by theme + source. If you touch rendering, keep the self-healing MutationObserver behavior intact — React rewrites preview HTML wholesale.
- **Exports rasterize diagrams first** (`rasterizeMermaidDiagrams`) because html-to-image fails on nested inline SVGs. Keep-together pagination (`KEEP_TOGETHER` in `pagination.ts`) prevents slicing diagrams across PDF pages.
- **The service worker caches same-origin GETs.** When you change cached shell files, bump `CACHE_NAME` so clients pick up the new version.

## Local development

```bash
npm install
npm run dev          # Vite dev server with HMR
```

Before submitting a pull request, run the full gauntlet:

```bash
npm run lint         # eslint --max-warnings 0 (strict)
npm run build        # production bundle must compile
npm run test:e2e     # full Playwright suite (~3 min)
```

To iterate on a single test:

```bash
npx playwright test tests/editor.spec.ts -g "finds and replaces" --project=desktop-chromium
```

Tests share one dev server started by Playwright on `127.0.0.1:4173`. The suite covers desktop (1440px), tablet, and mobile viewports; mark desktop-only interactions with `test.skip(testInfo.project.name !== 'desktop-chromium', ...)` as existing tests do.

## Pull request guidelines

- Keep changes focused and explain the user-facing value in the description.
- Preserve responsive behavior for desktop and mobile; verify at least one narrow viewport manually if you touch layout.
- Add or update Playwright coverage for changed user interactions.
- Do not add remote fonts, analytics, credentials, or server-only dependencies. New npm dependencies need a clear justification in the PR body.
- If you change brand assets, regenerate them with `npm run assets:generate` rather than editing binaries by hand.
- Update [CHANGELOG.md](CHANGELOG.md) under **Unreleased** for user-visible changes.

## Commit style

Short imperative subject lines (`Add find & replace panel`), details in the body when context helps. PRs are squash-merged, so commit hygiene inside a branch is a courtesy rather than a requirement.

## Reporting issues

Include browser, operating system, exact steps to reproduce, expected behavior, and actual behavior. For Markdown rendering or export issues, attach a safe minimal sample rather than sensitive document content.

Security vulnerabilities: follow [SECURITY.md](SECURITY.md) — do not open public issues for them.

## Release process

Maintainers only:

1. Confirm lint, build, and the full e2e suite pass on `main`.
2. Move **Unreleased** entries in `CHANGELOG.md` into a new dated version heading.
3. Bump `version` in `package.json` to match.
4. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z: summary"` and push with `--follow-tags`.
5. Publish the GitHub release using the changelog section as notes; Vercel deploys automatically from `main`.
