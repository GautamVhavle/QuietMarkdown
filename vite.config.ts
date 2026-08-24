import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Deployment fingerprint for CI/CD verification. Vercel builds run inside
// a real clone, so HEAD resolves there too.
function resolveBuildSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown-build'
  }
}

// Rendered once at config-load time. markdown-it is CommonJS; the default
// interop import works both in the bundled dev config and the production build.
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import { starterMarkdown } from './src/lib/starter'

function resolveSiteUrl() {
  const configured = process.env.VITE_SITE_URL
  const candidate = configured || 'https://quietmarkdown.vercel.app'
  return /^https?:\/\//.test(candidate) ? candidate.replace(/\/$/, '') : ''
}

/**
 * Build-time SEO plugin.
 *
 * 1. Rewrites absolute URLs so canonical/OG/schema follow VITE_SITE_URL.
 * 2. Prerenders crawlable static content into <div id="root"> so crawlers
 *    that never execute JavaScript (Bing, AI agents, social scrapers) still
 *    index real content. The static copy is hidden as soon as scripts run
 *    (the inline head script swaps the `no-js` class), and React's
 *    createRoot().render() clears the node entirely on mount — so there is
 *    no hydration conflict and no visual flash for real visitors.
 *
 * Sanitization note: DOMPurify needs a browser DOM unavailable at build
 * time. The only input rendered here is our own trusted starter document,
 * never user content.
 */
function seoPlugin(siteUrl: string): Plugin {
  let starterHtml = ''
  try {
    const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
    md.use(taskLists, { enabled: true })
    starterHtml = md.render(starterMarkdown)
  } catch {
    // Prerendering is an enhancement; never fail the build over it.
    starterHtml = ''
  }

  const PRERENDER_STYLES = `
    <style>
      /* Static crawlable fallback: visible only before/without JavaScript. */
      #root > .seo-static { display: none; }
      html.no-js #root > .seo-static { display: block; max-width: min(720px, calc(100% - 44px)); margin: 0 auto; padding: 40px 0 72px; color: #242421; font-size: 16px; line-height: 1.7; font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
      html.no-js #root > .seo-static h1 { font-size: 1.9rem; line-height: 1.25; margin: .4em 0 .6em; }
      html.no-js #root > .seo-static h2 { font-size: 1.35rem; margin: 1.8em 0 .5em; }
      html.no-js #root > .seo-static h3 { font-size: 1.08rem; margin: 1.5em 0 .4em; }
      html.no-js #root > .seo-static a { color: #b04a2f; }
      .noscript-notice { display: none; }
      html.no-js .noscript-notice { display: block; max-width: min(720px, calc(100% - 44px)); margin: 20px auto 0; padding: 13px 16px; border: 1px solid #e3e1da; border-radius: 10px; background: #fdfcfa; color: #5d5b55; font-size: 13.5px; line-height: 1.6; }
    </style>`

  return {
    name: 'quietmarkdown-seo',
    transformIndexHtml(html) {
      // Deployment fingerprint: CI/CD reads this off the live site to prove
      // the running build matches the pushed commit.
      const buildSha = resolveBuildSha()
      let out = html.replace(
        '</head>',
        `    <meta name="x-build-sha" content="${buildSha}" />\n  </head>`,
      )
      if (starterHtml) {
        out = out
          // The swap must happen in <head>, before first paint, so visitors
          // with JavaScript never see the static fallback flash.
          .replace('<html lang="en">', '<html lang="en" class="no-js">')
          .replace('</head>', `    <script>document.documentElement.classList.remove('no-js')</script>\n${PRERENDER_STYLES}\n  </head>`)
          .replace(
            '    <div id="root"></div>',
            [
              '    <div id="root">',
              '      <section class="seo-static" data-seo-fallback>',
              starterHtml.trim(),
              '      </section>',
              '    </div>',
              '    <noscript><p class="noscript-notice">QuietMarkdown is an interactive editor and needs JavaScript enabled. The field guide above shows its features as plain HTML.</p></noscript>',
            ].join('\n'),
          )
      }
      if (!siteUrl) return out
      return out
        .replaceAll('https://quietmarkdown.vercel.app', siteUrl)
        .replaceAll('content="/og-image.png"', `content="${siteUrl}/og-image.png"`)
        .replace(
          '    <script type="application/ld+json">',
          `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n    <script type="application/ld+json">`,
        )
        .replace(
          '"name": "QuietMarkdown",',
          `"name": "QuietMarkdown",\n        "url": "${siteUrl}/",`,
        )
    },
  }
}

export default defineConfig(() => {
  const siteUrl = resolveSiteUrl()
  return {
    plugins: [react(), seoPlugin(siteUrl)],
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  }
})
