# Contributing to QuietMark

Thank you for helping improve QuietMark.

## Product principles

Before proposing a change, keep the core product intent in view:

1. **Local-first:** never require an account, backend, cloud sync, or document upload for core work.
2. **Small surface area:** prefer a well-finished essential over an additional panel, dashboard, or configuration screen.
3. **Portable source:** Markdown remains the canonical document.
4. **Export confidence:** preview and export should remain visually consistent.
5. **Respect privacy:** never collect document text, filenames, clipboard contents, or export payloads.

## Local development

```bash
npm install
npm run dev
```

Before submitting a pull request, run:

```bash
npm run lint
npm run build
npm run test:e2e
```

## Pull request guidelines

- Keep changes focused and explain the user-facing value.
- Preserve responsive behavior for desktop and mobile.
- Add or update Playwright coverage for changed user interactions.
- Do not add remote fonts, analytics, credentials, or server-only dependencies.
- If you change brand assets, regenerate them with `npm run assets:generate`.

## Reporting issues

Include browser, operating system, exact steps to reproduce, expected behavior, and actual behavior. For Markdown rendering or export issues, attach a safe minimal sample rather than sensitive document content.
