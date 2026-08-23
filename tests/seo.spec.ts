import { expect, test } from '@playwright/test'

/**
 * SEO regression suite.
 *
 * These assertions run against the RAW HTML response (no JavaScript
 * execution) exactly like crawlers that do not run JS see the page.
 * Anything broken here breaks indexing before Lighthouse ever runs.
 */

const SITE_URL = process.env.VITE_SITE_URL ?? 'http://127.0.0.1:4173'

let html = ''

test.beforeAll(async ({ request }) => {
  const response = await request.get(`${SITE_URL}/`)
  expect(response.ok()).toBeTruthy()
  html = await response.text()
})

test('has a keyword-first title within SERP length limits', () => {
  const match = html.match(/<title>([^<]+)<\/title>/)
  expect(match, 'title tag must exist').not.toBeNull()
  const title = match![1]
  expect(title.length).toBeGreaterThanOrEqual(30)
  expect(title.length).toBeLessThanOrEqual(65)
  // Primary keyword leads; brand appears at the end.
  expect(title.toLowerCase()).toContain('markdown editor')
  expect(title).toMatch(/QuietMarkdown$/)
})

test('has a compelling meta description in the 140–165 character band', () => {
  const match = html.match(/<meta name="description" content="([^"]*)"/)
  expect(match, 'meta description must exist').not.toBeNull()
  const description = match![1]
  expect(description.length).toBeGreaterThanOrEqual(120)
  expect(description.length).toBeLessThanOrEqual(170)
  expect(description.toLowerCase()).toContain('markdown')
})

test('declares canonical, robots directives, and language', () => {
  expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/" \/>/)
  expect(html).toMatch(/<meta name="robots" content="index, follow/)
  expect(html).toMatch(/<html lang="en"/)
})

test('Open Graph and Twitter cards use absolute image URLs', () => {
  expect(html).toMatch(/<meta property="og:title" content="/)
  expect(html).toMatch(/<meta property="og:description" content="/)
  expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+\/og-image\.png"/)
  expect(html).toMatch(/<meta property="og:image:width" content="1200"/)
  expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/)
  expect(html).toMatch(/<meta name="twitter:image" content="https?:\/\/[^"]+"/)
})

test('ships valid JSON-LD with SoftwareApplication and FAQPage graphs', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  expect(blocks.length).toBeGreaterThan(0)

  const parsed = blocks.map((block) => {
    const data = JSON.parse(block[1]) as { '@graph'?: Array<{ '@type': string }> }
    return data['@graph'] ?? [data]
  })

  const types = parsed.flat().map((node) => node['@type'])
  expect(types).toContain('SoftwareApplication')
  expect(types).toContain('WebSite')
  expect(types).toContain('FAQPage')

  // Free product offer must be present and valid.
  const appNode = parsed.flat().find((node) => node['@type'] === 'SoftwareApplication') as unknown as {
    offers?: { price: string }
  }
  expect(appNode.offers?.price).toBe('0')
})

test('prerenders crawlable body content with a single H1', () => {
  const rootMatch = html.match(/<div id="root">([\s\S]*?)<\/section>/)
  expect(rootMatch, 'prerendered #root content must exist').not.toBeNull()
  const rootHtml = rootMatch![0]

  const h1Count = (rootHtml.match(/<h1/g) ?? []).length
  expect(h1Count).toBe(1)

  // Real textual substance for non-JS crawlers.
  const text = rootHtml.replace(/<[^>]+>/g, ' ')
  expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThan(150)
  expect(text).toContain('Markdown editor')
  expect(text.toLowerCase()).toContain('mermaid')
})

test('sitemap lists canonical URLs and robots.txt references it', async ({ request }) => {
  const sitemap = await (await request.get(`${SITE_URL}/sitemap.xml`)).text()
  expect(sitemap).toContain('<loc>https://quietmarkdown.vercel.app/</loc>')
  expect(sitemap).toContain('http://www.sitemaps.org/schemas/sitemap/0.9')

  const robots = await (await request.get(`${SITE_URL}/robots.txt`)).text()
  expect(robots).toContain('User-agent: *')
  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Sitemap: https://quietmarkdown.vercel.app/sitemap.xml')
})

test('llms.txt index is available for AI crawlers', async ({ request }) => {
  const response = await request.get(`${SITE_URL}/llms.txt`)
  expect(response.ok()).toBeTruthy()
  const text = await response.text()
  expect(text).toContain('# QuietMarkdown')
})
