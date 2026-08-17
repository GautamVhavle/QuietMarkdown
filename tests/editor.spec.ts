import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads a local-first document and renders Markdown', async ({ page }, testInfo) => {
  await expect(page.getByRole('banner').getByText('QuietMarkdown')).toBeVisible()
  await expect(page.getByLabel('Markdown content')).toContainText('# QuietMarkdown editor field guide')
  if (testInfo.project.name !== 'desktop-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'QuietMarkdown editor field guide' })).toBeVisible()
  const saveLabel = testInfo.project.name !== 'desktop-chromium'
    ? page.locator('.footer-save')
    : page.locator('.save-indicator')
  await expect(saveLabel).toHaveText(/Saved/)
})

test('uses focused Write and Preview modes on portrait devices', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Desktop keeps the productive split view.')
  await expect(page.getByRole('button', { name: 'Split' })).toBeHidden()
  await expect(page.getByLabel('Markdown content')).toBeVisible()

  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'QuietMarkdown editor field guide' })).toBeVisible()
  await expect(page.getByLabel('Markdown content')).toBeHidden()

  await page.getByRole('button', { name: 'Write' }).click()
  await expect(page.getByLabel('Markdown content')).toBeVisible()
})

test('synchronizes editor and preview scrolling in split view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Split preview is intentionally tabbed on small screens.')
  const editor = page.getByLabel('Markdown content')
  await editor.fill(Array.from({ length: 45 }, (_, index) => `## Section ${index + 1}\n\nA paragraph with enough content to test proportional synchronized scrolling between source and preview.`).join('\n\n'))
  await page.waitForTimeout(120)

  await editor.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
  await expect.poll(async () => page.locator('.preview-scroll').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  await page.locator('.preview-scroll').evaluate((element: HTMLDivElement) => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
  await expect.poll(async () => editor.evaluate((element: HTMLTextAreaElement) => element.scrollTop)).toBeLessThan(10)
})

test('publishes search metadata and accessible creator attribution', async ({ page }) => {
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Markdown privately/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://quietmarkdown.vercel.app/og-image.png')
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', '/favicon.ico')
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg')
  const creator = page.getByRole('link', { name: /Gautam Vhavle/ })
  await expect(creator).toBeVisible()
  await expect(creator).toHaveAttribute('href', 'https://gautamvhavle.xyz/')
  const repository = page.getByRole('link', { name: 'View QuietMarkdown on GitHub' })
  await expect(repository).toBeVisible()
  await expect(repository).toHaveAttribute('href', 'https://github.com/GautamVhavle/QuietMarkdown')
  const privacy = page.locator('.footer-privacy')
  await expect(privacy).toHaveAttribute('href', '/privacy')
})

test('updates preview and applies keyboard formatting', async ({ page }, testInfo) => {
  const editor = page.getByLabel('Markdown content')
  await editor.fill('# Hello\n\nquiet writing')
  if (testInfo.project.name !== 'desktop-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Hello' })).toBeVisible()
  if (testInfo.project.name !== 'desktop-chromium') {
    await page.getByRole('button', { name: 'Write' }).click()
  }

  await editor.evaluate((element: HTMLTextAreaElement) => {
    element.focus()
    element.setSelectionRange(9, 14)
  })
  await editor.press('Control+b')
  await expect(editor).toHaveValue('# Hello\n\n**quiet** writing')
})

test('inserts structured Markdown from the expanded toolbar', async ({ page }) => {
  const editor = page.getByLabel('Markdown content')
  await editor.fill('')
  await editor.focus()
  await page.getByLabel('Table').click()
  await expect(editor).toHaveValue('| Column one | Column two |\n| --- | --- |\n| Value | Value |\n\n')

  await editor.fill('')
  await editor.focus()
  await page.getByLabel('Image').click()
  await expect(editor).toHaveValue(/!\[image description\]\(https:\/\/\)/)

  await editor.fill('')
  await editor.focus()
  await page.getByLabel('Divider').click()
  await expect(editor).toHaveValue(/---/)
})

test('opens a local Markdown file', async ({ page }, testInfo) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'field-notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Field notes\n\nOpened from disk.'),
  })
  await expect(page.getByLabel('Document title')).toHaveValue('field-notes')
  if (testInfo.project.name !== 'desktop-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Field notes' })).toBeVisible()
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.getByText('field-notes.md opened')).toBeVisible()
  }
})

test('downloads clean HTML and a real PDF file', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'File integrity is covered once on desktop.')
  await page.getByLabel('Markdown content').fill('# Export proof\n\nA short document for file verification.')
  await page.getByRole('button', { name: 'Open export studio' }).click()

  const htmlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download HTML/ }).click()
  const htmlDownload = await htmlDownloadPromise
  const htmlPath = testInfo.outputPath('quietmarkdown-export.html')
  await htmlDownload.saveAs(htmlPath)
  const html = await readFile(htmlPath, 'utf8')
  expect(htmlDownload.suggestedFilename()).toMatch(/\.html$/)
  expect(html).toContain('<h1>Export proof</h1>')
  expect(html).not.toContain('watermark')
  expect(html).not.toContain('quietmarkdown.vercel.app')

  const pdfDownloadPromise = page.waitForEvent('download', { timeout: 90_000 })
  await page.getByRole('button', { name: /Save as PDF/ }).click()
  const pdfDownload = await pdfDownloadPromise
  const pdfPath = testInfo.outputPath('quietmarkdown-export.pdf')
  await pdfDownload.saveAs(pdfPath)
  const pdfBytes = await readFile(pdfPath)
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.load(pdfBytes)
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/)
  expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdf.getPageCount()).toBeGreaterThan(0)
})

test('switches theme and customizes export watermark', async ({ page }) => {
  await page.getByLabel('Use dark theme').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Export' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Finish it beautifully.' })).toBeVisible()

  await page.getByRole('button', { name: 'Minimal' }).click()
  await expect(page.getByLabel('Typeface')).toHaveValue('sans')
  await expect(page.locator('.export-page-live').first()).toHaveClass(/export-preset-minimal/)
  await page.getByRole('button', { name: 'Academic' }).click()
  await expect(page.getByLabel('Typeface')).toHaveValue('classic')
  await expect(page.locator('.export-page-live').first()).toHaveClass(/export-preset-academic/)
  await expect(page.locator('.preset-card')).toHaveCount(8)
  await expect(page.getByLabel('Page background color')).toHaveValue('#ffffff')

  const watermark = page.getByPlaceholder('DRAFT, CONFIDENTIAL…')
  await expect(watermark).toHaveValue('quietmarkdown.vercel.app')
  await watermark.fill('CONFIDENTIAL')
  await page.getByRole('button', { name: 'Tiled' }).click()
  await expect(page.getByRole('dialog').getByText('CONFIDENTIAL').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Save as PDF/ })).toBeVisible()
})
