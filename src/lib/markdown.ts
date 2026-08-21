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

let mermaidRenderCounter = 0

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
    // Encode the source so quotes/newlines cannot interfere with the HTML
    // attribute. It is decoded immediately before Mermaid renders the node.
    return `<div class="mermaid" data-mermaid="${encodeURIComponent(code)}"></div>`
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
    const elements = Array.from(container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid]'))
    for (const [index, element] of elements.entries()) {
      const encoded = element.getAttribute('data-mermaid')
      if (!encoded) continue

      try {
        const code = decodeURIComponent(encoded)
        const id = `quietmarkdown-mermaid-${++mermaidRenderCounter}-${index}`
        const { svg, bindFunctions } = await mermaid.default.render(id, code)
        if (!element.isConnected) continue
        element.innerHTML = svg
        element.removeAttribute('data-mermaid')
        bindFunctions?.(element)
      } catch {
        // Keep a visible fallback instead of leaving an empty diagram box.
        element.classList.add('mermaid-error')
        element.textContent = 'Unable to render this Mermaid diagram.'
        element.removeAttribute('data-mermaid')
      }
    }
  } catch {
    // Mermaid failed to load. The source remains available in the editor.
  }
}

export function countDocument(source: string) {
  const words = source.trim() ? source.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.ceil(words / 220))
  return { words, minutes, characters: source.length }
}
