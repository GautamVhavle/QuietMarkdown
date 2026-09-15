// Standalone HTML export document assembly.
import type { ExportSettings } from '../settings/exportSettings'

import { getExportCss } from './exportCss'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export function createExportHtml(
  title: string,
  renderedMarkdown: string,
  settings: ExportSettings,
) {
  const safeTitle = escapeHtml(title || 'Untitled document')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>${getExportCss(settings)}</style>
</head>
<body>
  <main class="export-page preset-${settings.preset}">
    <article class="document">${renderedMarkdown}</article>
  </main>
</body>
</html>`
}

