import type { ExportSettings } from '../types'

const fonts = {
  serif: "'Newsreader', 'Iowan Old Style', Georgia, serif",
  classic: "Baskerville, 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  sans: "'DM Sans', Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  humanist: "Optima, Candara, 'Segoe UI', ui-sans-serif, sans-serif",
  mono: "'DM Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  typewriter: "'Courier Prime', Courier, 'Nimbus Mono PS', monospace",
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
      rule: '#9da5ae',
      lineHeight: 1.64,
      headingWeight: 700,
    },
    manuscript: {
      body: '#292724',
      muted: '#77716a',
      heading: '#1f1d1a',
      rule: '#d8d3cb',
      lineHeight: 1.82,
      headingWeight: 600,
    },
    swiss: {
      body: '#202322',
      muted: '#6d7471',
      heading: '#0e1110',
      rule: '#d8dedb',
      lineHeight: 1.58,
      headingWeight: 700,
    },
    letterpress: {
      body: '#332d27',
      muted: '#776b60',
      heading: '#261f1a',
      rule: '#d8cec4',
      lineHeight: 1.74,
      headingWeight: 600,
    },
    executive: {
      body: '#232830',
      muted: '#67717e',
      heading: '#152033',
      rule: '#cbd3dc',
      lineHeight: 1.62,
      headingWeight: 700,
    },
    notebook: {
      body: '#2c2a27',
      muted: '#777269',
      heading: '#23211e',
      rule: '#d8d1c6',
      lineHeight: 1.76,
      headingWeight: 650,
    },
  }[settings.preset]

  const color = settings.background.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255)
  const luminance = channels.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const contrast = luminance < 0.42
    ? { body: '#f1f0eb', muted: '#bbb9b1', heading: '#ffffff', rule: '#575752' }
    : {}

  return { ...preset, ...contrast, background: settings.background, fontFamily: fonts[settings.font] }
}

function getPresetCss(preset: ExportSettings['preset']) {
  const styles: Record<ExportSettings['preset'], string> = {
    editorial: `
      .document { max-width: 650px; margin: 0 auto; }
      h1 { max-width: 620px; margin-bottom: .72em; font-family: Georgia, serif; font-size: 3.625rem; font-weight: 500; line-height: 1.02; }
      h1 + p { color: var(--muted); font-size: 1.18rem; line-height: 1.58; }
      h2 { position: relative; border: 0; padding-bottom: 12px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 1.56rem; }
      h2::after { position: absolute; bottom: 0; left: 0; width: 44px; height: 3px; background: var(--accent); content: ''; }
      blockquote { margin: 2em 0; border: 0; padding: 8px 0 8px 28px; color: var(--heading); font-family: Georgia, serif; }
      blockquote p { font-size: 1.3rem; line-height: 1.55; }
    `,
    minimal: `
      .document { max-width: 590px; margin: 0 auto; }
      h1 { margin-bottom: 1.25em; font-family: inherit; font-size: 3.25rem; font-weight: 500; line-height: 1.06; letter-spacing: -.055em; }
      h2 { border: 0; padding: 0; font-size: 1.38rem; font-weight: 600; }
      h3 { font-size: 1.06rem; }
      p, li { font-size: .94rem; }
      blockquote { border-left-width: 1px; padding-left: 18px; font-style: normal; }
      pre { border: 0; border-radius: 4px; }
      hr { width: 48px; margin-right: auto; margin-left: auto; border-color: var(--accent); }
    `,
    academic: `
      .document { max-width: 675px; margin: 0 auto; counter-reset: section; }
      h1 { position: relative; margin: 0 auto 2.2em; padding-bottom: 24px; font-family: Georgia, 'Times New Roman', serif; font-size: 2.25rem; line-height: 1.22; letter-spacing: 0; text-align: center; }
      h1::after { position: absolute; right: 38%; bottom: 0; left: 38%; border-bottom: 1px solid var(--heading); content: ''; }
      h2 { border: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 1.31rem; letter-spacing: 0; counter-increment: section; counter-reset: subsection; }
      h2::before { content: counter(section) '. '; }
      h3 { font-size: 1.06rem; letter-spacing: 0; counter-increment: subsection; }
      h3::before { content: counter(section) '.' counter(subsection) ' '; }
      p { text-align: justify; hyphens: auto; }
      p, li { font-size: .94rem; }
      blockquote { margin-right: 2em; margin-left: 2em; border: 0; padding: 0; color: var(--body); font-size: .92em; font-style: normal; }
      li::marker { color: var(--heading); }
      pre, img { border-radius: 0; }
      table { border-top: 2px solid var(--heading); border-bottom: 2px solid var(--heading); }
      th, td { border: 0; border-bottom: 1px solid var(--rule); }
    `,
    manuscript: `
      .document { max-width: 610px; margin: 0 auto; }
      h1 { margin-bottom: 1.45em; font-family: inherit; font-size: 2.45rem; font-weight: 600; letter-spacing: -.02em; text-align: center; }
      h2 { border: 0; padding: 0; font-size: 1.18rem; letter-spacing: .08em; text-transform: uppercase; }
      h3 { font-size: 1rem; text-decoration: underline; text-underline-offset: 4px; }
      p, li { font-size: .94rem; }
      blockquote { border: 0; padding: 0 2em; text-align: center; }
      pre { border-radius: 0; background: transparent; }
      hr { width: 80px; margin-right: auto; margin-left: auto; border-top-style: dashed; }
    `,
    swiss: `
      .document { max-width: 630px; margin: 0 auto; }
      h1 { margin: 0 0 1.4em; border-top: 8px solid var(--accent); padding-top: 20px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 3.7rem; font-weight: 700; line-height: .96; letter-spacing: -.065em; }
      h2 { border: 0; padding: 0; font-size: 1.25rem; letter-spacing: .08em; text-transform: uppercase; }
      h3 { font-size: 1rem; letter-spacing: .04em; }
      p, li { font-size: .94rem; }
      blockquote { border-left-width: 8px; font-style: normal; }
      table { border-top: 3px solid var(--heading); }
      th { text-transform: uppercase; letter-spacing: .06em; }
    `,
    letterpress: `
      .document { max-width: 640px; margin: 0 auto; }
      h1 { margin-bottom: .9em; font-family: Georgia, serif; font-size: 3.35rem; font-weight: 500; line-height: 1.06; text-align: center; }
      h1::after { display: block; width: 28px; margin: 24px auto 0; border-bottom: 5px double var(--accent); content: ''; }
      h2 { border: 0; padding: 0; font-family: Georgia, serif; font-size: 1.6rem; text-align: center; }
      h3 { font-family: Georgia, serif; font-variant: small-caps; letter-spacing: .06em; }
      .document > p:first-of-type::first-letter { float: left; margin: .08em .12em 0 0; color: var(--accent); font-family: Georgia, serif; font-size: 3.8em; line-height: .72; }
      blockquote { border: 0; text-align: center; }
      hr { width: 64px; margin-right: auto; margin-left: auto; border-top: 3px double var(--rule); }
    `,
    executive: `
      .document { max-width: 680px; margin: 0 auto; }
      h1 { margin-bottom: 1.1em; border-bottom: 4px solid var(--accent); padding-bottom: 22px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 3rem; font-weight: 700; }
      h2 { border: 0; border-left: 4px solid var(--accent); padding: 2px 0 2px 14px; font-size: 1.45rem; }
      h3 { color: var(--accent); font-size: 1.05rem; text-transform: uppercase; letter-spacing: .05em; }
      p, li { font-size: .95rem; }
      blockquote { border: 0; border-radius: 4px; padding: 1em 1.2em; background: color-mix(in srgb, var(--accent) 8%, transparent); font-style: normal; }
      th { background: color-mix(in srgb, var(--accent) 10%, transparent); }
      img, pre { border-radius: 2px; }
    `,
    notebook: `
      .document { max-width: 620px; margin: 0 auto; }
      h1 { margin-bottom: 1em; font-size: 3rem; font-weight: 650; transform: rotate(-.35deg); }
      h2 { border: 0; padding: 0 0 8px; background: linear-gradient(transparent 70%, color-mix(in srgb, var(--accent) 24%, transparent) 0); font-size: 1.5rem; }
      h3 { font-size: 1.08rem; text-decoration: underline; text-decoration-color: var(--accent); text-decoration-thickness: 3px; text-underline-offset: 5px; }
      p, li { font-size: .96rem; }
      blockquote { border-left: 0; border-radius: 3px; padding: 1em 1.2em; background: color-mix(in srgb, var(--accent) 9%, transparent); font-style: normal; }
      li::marker { color: var(--accent); }
      pre { border-style: dashed; border-radius: 3px; }
    `,
  }
  return styles[preset]
}

export function getExportCss(settings: ExportSettings) {
  const style = getExportStyle(settings)
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
    code { border-radius: 4px; padding: .14em .35em; background: color-mix(in srgb, ${style.body} 7%, ${style.background}); font: .85em 'SFMono-Regular', Consolas, monospace; }
    pre { overflow: auto; margin: 1.5em 0; border: 1px solid ${style.rule}; border-radius: 10px; padding: 1.1em 1.25em; background: color-mix(in srgb, ${style.body} 5%, ${style.background}); line-height: 1.55; white-space: pre-wrap; }
    pre code { padding: 0; background: transparent; font-size: .82rem; }
    table { width: 100%; margin: 1.6em 0; border-spacing: 0; border-collapse: collapse; font-size: .93rem; }
    th, td { padding: .72em .8em; border-bottom: 1px solid ${style.rule}; text-align: left; }
    th { color: ${style.heading}; font-weight: 650; }
    img { display: block; max-width: 100%; height: auto; margin: 1.5em auto; border-radius: 6px; }
    input[type='checkbox'] { accent-color: ${settings.accent}; }
    ${getPresetCss(settings.preset)}
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

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2_000)
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
