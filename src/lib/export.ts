import type { ExportSettings } from '../types'

const fonts = {
  serif: "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  sans: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const pageDimensions = {
  a4: { width: 794, height: 1123, css: 'A4' },
  letter: { width: 816, height: 1056, css: 'Letter' },
}

export function getExportStyle(settings: ExportSettings) {
  const preset = {
    editorial: {
      body: '#282723',
      muted: '#706e67',
      heading: '#1f1e1b',
      background: '#fffefa',
      rule: '#dedbd2',
      lineHeight: 1.72,
      headingWeight: 650,
    },
    minimal: {
      body: '#293330',
      muted: '#6d7773',
      heading: '#17211f',
      background: '#ffffff',
      rule: '#e2e8e5',
      lineHeight: 1.68,
      headingWeight: 560,
    },
    academic: {
      body: '#17191c',
      muted: '#515963',
      heading: '#101216',
      background: '#ffffff',
      rule: '#9da5ae',
      lineHeight: 1.64,
      headingWeight: 700,
    },
  }[settings.preset]

  return { ...preset, fontFamily: fonts[settings.font] }
}

function getPresetCss(preset: ExportSettings['preset']) {
  if (preset === 'editorial') {
    return `
      .document { max-width: 650px; margin: 0 auto; }
      h1 { max-width: 620px; margin-bottom: .72em; font-family: Georgia, serif; font-size: 3.625rem; font-weight: 500; line-height: 1.02; }
      h1 + p { color: var(--muted); font-size: 1.18rem; line-height: 1.58; }
      h2 { position: relative; border: 0; padding-bottom: 12px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 1.56rem; }
      h2::after { position: absolute; bottom: 0; left: 0; width: 44px; height: 3px; border-radius: 2px; background: var(--accent); content: ''; }
      blockquote { margin: 2em 0; border: 0; padding: 8px 0 8px 28px; color: var(--heading); font-family: Georgia, serif; }
      blockquote p { font-size: 1.3rem; line-height: 1.55; }
    `
  }
  if (preset === 'minimal') {
    return `
      .document { max-width: 590px; margin: 0 auto; }
      h1 { margin-bottom: 1.25em; font-family: inherit; font-size: 3.25rem; font-weight: 500; line-height: 1.06; letter-spacing: -.055em; }
      h2 { border: 0; padding: 0; font-size: 1.38rem; font-weight: 600; letter-spacing: -.025em; }
      h3 { font-size: 1.06rem; }
      p, li { font-size: .94rem; }
      blockquote { border-left-width: 1px; padding-left: 18px; font-style: normal; }
      pre { border: 0; border-radius: 4px; background: #f4f6f5; }
      hr { width: 48px; margin-right: auto; margin-left: auto; border-color: var(--accent); }
    `
  }
  return `
    .document { max-width: 675px; margin: 0 auto; counter-reset: section; }
    h1 { position: relative; margin: 0 auto 2.2em; padding-bottom: 24px; font-family: Georgia, 'Times New Roman', serif; font-size: 2.25rem; font-weight: 700; line-height: 1.22; letter-spacing: 0; text-align: center; }
    h1::after { position: absolute; right: 38%; bottom: 0; left: 38%; border-bottom: 1px solid var(--heading); content: ''; }
    h2 { border: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 1.31rem; letter-spacing: 0; counter-increment: section; counter-reset: subsection; }
    h2::before { content: counter(section) '. '; }
    h3 { font-size: 1.06rem; letter-spacing: 0; counter-increment: subsection; }
    h3::before { content: counter(section) '.' counter(subsection) ' '; }
    p { text-align: justify; hyphens: auto; }
    p, li { font-size: .94rem; }
    blockquote { margin-right: 2em; margin-left: 2em; border: 0; padding: 0; color: var(--body); font-size: .92em; font-style: normal; }
    li::marker { color: var(--heading); }
    pre { border-radius: 0; background: #f7f7f7; }
    table { border-top: 2px solid var(--heading); border-bottom: 2px solid var(--heading); }
    th, td { border: 0; border-bottom: 1px solid var(--rule); }
    th { border-bottom: 1.5px solid var(--heading); background: transparent; }
    img { border-radius: 0; }
  `
}

export function createWatermarkMarkup(settings: ExportSettings) {
  const watermark = settings.watermark
  if (!watermark.enabled || !watermark.text.trim()) return ''

  const text = escapeHtml(watermark.text.trim())
  if (watermark.position === 'tiled') {
    return `<div class="watermark-grid" aria-hidden="true">${Array.from(
      { length: 15 },
      () => `<span>${text}</span>`,
    ).join('')}</div>`
  }

  return `<div class="watermark watermark-${watermark.position}" aria-hidden="true">${text}</div>`
}

export function getExportCss(settings: ExportSettings) {
  const style = getExportStyle(settings)
  const watermark = settings.watermark
  const paper = pageDimensions[settings.paper]

  return `
    :root { color-scheme: light; --body: ${style.body}; --muted: ${style.muted}; --heading: ${style.heading}; --rule: ${style.rule}; --accent: ${settings.accent}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #ecebe7; color: ${style.body}; }
    body { padding: 28px; font-family: ${style.fontFamily}; }
    .export-page {
      isolation: isolate;
      position: relative;
      width: ${paper.width}px;
      min-height: ${paper.height}px;
      margin: 0 auto;
      overflow: hidden;
      padding: ${settings.margin}px;
      background: ${style.background};
      box-shadow: 0 16px 50px rgba(25, 24, 21, .14);
    }
    .document { position: relative; z-index: 2; }
    .document > *:first-child { margin-top: 0; }
    .document > *:last-child { margin-bottom: 0; }
    h1, h2, h3, h4, h5, h6 { color: ${style.heading}; line-height: 1.18; font-weight: ${style.headingWeight}; letter-spacing: -.025em; }
    h1 { margin: 0 0 1.05em; font-size: 2.75rem; letter-spacing: -.045em; }
    h2 { margin: 1.9em 0 .65em; padding-bottom: .3em; border-bottom: 1px solid ${style.rule}; font-size: 1.7rem; }
    h3 { margin: 1.6em 0 .5em; font-size: 1.26rem; }
    p, li { font-size: 1rem; line-height: ${style.lineHeight}; }
    p { margin: 0 0 1.2em; }
    a { color: ${settings.accent}; text-decoration-thickness: 1px; text-underline-offset: 3px; }
    strong { color: ${style.heading}; font-weight: 700; }
    blockquote { margin: 1.5em 0; padding: .25em 0 .25em 1.25em; border-left: 3px solid ${settings.accent}; color: ${style.muted}; font-style: italic; }
    blockquote p { margin: 0; }
    ul, ol { padding-left: 1.4em; }
    li { margin: .28em 0; padding-left: .25em; }
    li::marker { color: ${settings.accent}; }
    .contains-task-list { padding-left: 0; list-style: none; }
    .task-list-item { display: flex; align-items: baseline; gap: .55em; }
    .task-list-item input { flex: 0 0 auto; accent-color: ${settings.accent}; }
    hr { margin: 2.3em 0; border: 0; border-top: 1px solid ${style.rule}; }
    code { border-radius: 4px; padding: .14em .35em; background: #f0efea; font: .85em 'SFMono-Regular', Consolas, monospace; }
    pre { overflow: auto; margin: 1.5em 0; border: 1px solid ${style.rule}; border-radius: 10px; padding: 1.1em 1.25em; background: #f5f4ef; line-height: 1.55; white-space: pre-wrap; }
    pre code { padding: 0; background: transparent; font-size: .82rem; }
    table { width: 100%; margin: 1.6em 0; border-spacing: 0; border-collapse: collapse; font-size: .93rem; }
    th, td { padding: .72em .8em; border-bottom: 1px solid ${style.rule}; text-align: left; }
    th { color: ${style.heading}; font-weight: 650; }
    img { display: block; max-width: 100%; height: auto; margin: 1.5em auto; border-radius: 6px; }
    input[type='checkbox'] { accent-color: ${settings.accent}; }
    ${getPresetCss(settings.preset)}
    .watermark { position: absolute; z-index: 1; color: ${watermark.color}; opacity: ${watermark.opacity}; font: 700 ${watermark.size}px/1 ${fonts.sans}; letter-spacing: .12em; white-space: nowrap; transform: rotate(${watermark.rotation}deg); pointer-events: none; }
    .watermark-center { top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${watermark.rotation}deg); }
    .watermark-top-left { top: 54px; left: 54px; transform-origin: left top; }
    .watermark-top-right { top: 54px; right: 54px; transform-origin: right top; }
    .watermark-bottom-left { bottom: 54px; left: 54px; transform-origin: left bottom; }
    .watermark-bottom-right { right: 54px; bottom: 54px; transform-origin: right bottom; }
    .watermark-grid { position: absolute; inset: -10%; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); place-items: center; color: ${watermark.color}; opacity: ${watermark.opacity}; pointer-events: none; transform: rotate(${watermark.rotation}deg) scale(1.12); }
    .watermark-grid span { font: 700 ${Math.min(watermark.size, 44)}px/1 ${fonts.sans}; letter-spacing: .1em; white-space: nowrap; }
    @page { size: ${paper.css}; margin: 0; }
    @media print {
      html, body { background: ${style.background}; }
      body { padding: 0; }
      .export-page { width: 100%; min-height: 100vh; margin: 0; box-shadow: none; }
    }
  `
}

export function createExportHtml(
  title: string,
  renderedMarkdown: string,
  settings: ExportSettings,
  shouldPrint = false,
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
    ${createWatermarkMarkup(settings)}
    <article class="document">${renderedMarkdown}</article>
  </main>
  ${shouldPrint ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250))</script>' : ''}
</body>
</html>`
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function safeFilename(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  )
}
