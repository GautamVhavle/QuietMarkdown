import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLanguage from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdownLanguage)
hljs.registerLanguage('md', markdownLanguage)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`
      } catch {
        // Fall back to escaped source.
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`
  },
})

// Custom fence renderer for mermaid diagrams
const defaultFence = markdown.renderer.rules.fence ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
markdown.renderer.rules.fence = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim() : ''
  if (info === 'mermaid') {
    const code = token.content.trim()
    // Use a data attribute to store the mermaid code, will be rendered client-side
    return `<div class="mermaid" data-mermaid="${escapeHtml(code)}"></div>`
  }
  return defaultFence(tokens, idx, options, _env, self)
}

markdown.use(taskLists, { enabled: false, label: true })

const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noreferrer noopener')
  return defaultLinkOpen(tokens, index, options, env, self)
}

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(markdown.render(source), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'data-mermaid'],
    ADD_TAGS: ['div'],
  })
}

/**
 * Initialize mermaid diagrams in the given container.
 * Call this after the preview content has been updated.
 */
export async function initMermaid(container: HTMLElement): Promise<void> {
  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    })
    const elements = container.querySelectorAll('.mermaid[data-mermaid]')
    for (const el of elements) {
      const code = el.getAttribute('data-mermaid')
      if (code) {
        el.textContent = code
        el.removeAttribute('data-mermaid')
      }
    }
    await mermaid.default.run({ nodes: Array.from(container.querySelectorAll('.mermaid')) })
  } catch {
    // Mermaid failed to load or render, silently ignore
  }
}

export function countDocument(source: string) {
  const words = source.trim() ? source.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.ceil(words / 220))
  return { words, minutes, characters: source.length }
}
