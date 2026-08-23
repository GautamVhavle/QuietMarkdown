# Security Policy

QuietMarkdown is a local-first Markdown editor: it runs entirely in your browser, stores documents in `localStorage`, and ships as static files with no backend. That architecture is our strongest security control — and this policy explains how we protect it.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release on `main` | ✅ |
| Older tags or forks | ❌ Please update |

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.

1. Email **security@gautamvhavle.xyz** (or use [GitHub private vulnerability reporting](https://github.com/GautamVhavle/QuietMarkdown/security/advisories/new) if enabled).
2. Include a description, reproduction steps, and the browser/OS you tested on.
3. You will receive an acknowledgement within **72 hours** and status updates at least every 7 days until resolution.

We credit reporters in the release notes by default; say so explicitly if you prefer to remain anonymous. There is currently no paid bounty program, but we will happily endorse responsible disclosure in your advisory write-up.

## What is in scope

- XSS through rendered Markdown, Mermaid diagrams, syntax highlighting, or exported HTML
- Bypassing sanitization (DOMPurify configuration) in preview or export paths
- Service worker cache poisoning or unsafe fetch handling
- Storage handling that could leak document contents across origins
- Dependency vulnerabilities with realistic exploit paths
- Supply-chain issues in build tooling that affect published artifacts

## What is out of scope

- Anything requiring physical access to an unlocked device
- Browser or extension vulnerabilities outside QuietMarkdown's control
- Self-XSS via DevTools console
- Missing rate limiting or account features — there are no accounts by design
- Vercel's platform infrastructure (report those to Vercel's security team)

## Security design notes

- **No backend.** Documents never leave the device except when you export or download them yourself.
- **Sanitization.** All rendered HTML passes through DOMPurify before it touches the DOM. Export HTML receives the same treatment.
- **Strict headers.** `vercel.json` sets `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, and frame protection.
- **Least data.** No analytics, no telemetry, no error reporting service. Console errors stay in your console.
- **Service worker scope.** The offline worker caches only same-origin GET responses and never inspects or stores document text.

Thank you for helping keep QuietMarkdown trustworthy.
