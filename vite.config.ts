import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function resolveSiteUrl() {
  const configured = process.env.VITE_SITE_URL
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const candidate = configured || (vercelUrl ? `https://${vercelUrl}` : '')
  return /^https?:\/\//.test(candidate) ? candidate.replace(/\/$/, '') : ''
}

function seoPlugin(siteUrl: string): Plugin {
  return {
    name: 'quietmarkdown-seo',
    transformIndexHtml(html) {
      if (!siteUrl) return html
      return html
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
