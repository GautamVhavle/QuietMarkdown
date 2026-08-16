import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads a local-first document and renders Markdown', async ({ page }, testInfo) => {
  await expect(page.getByRole('banner').getByText('QuietMark')).toBeVisible()
  await expect(page.getByLabel('Markdown content')).toContainText('# QuietMark Markdown Editor field guide')
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'QuietMark Markdown Editor field guide' })).toBeVisible()
  const saveLabel = testInfo.project.name === 'mobile-chromium'
    ? page.locator('.footer-save')
    : page.locator('.save-indicator')
  await expect(saveLabel).toHaveText(/Saved/)
})

test('synchronizes editor and preview scrolling in split view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'Split preview is intentionally tabbed on small screens.')
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
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/og-image.png')
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', '/favicon.ico')
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg')
  const creator = page.getByRole('link', { name: /Gautam Vhavle/ })
  await expect(creator).toBeVisible()
  await expect(creator).toHaveAttribute('href', 'https://gautamvhavle.xyz/')
  const repository = page.getByRole('link', { name: 'View QuietMark on GitHub' })
  await expect(repository).toBeVisible()
  await expect(repository).toHaveAttribute('href', 'https://github.com/GautamVhavle/QuietMark')
  const privacy = page.locator('.footer-privacy')
  await expect(privacy).toHaveAttribute('href', '/privacy')
})

test('updates preview and applies keyboard formatting', async ({ page }, testInfo) => {
  const editor = page.getByLabel('Markdown content')
  await editor.fill('# Hello\n\nquiet writing')
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Hello' })).toBeVisible()
  if (testInfo.project.name === 'mobile-chromium') {
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
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Field notes' })).toBeVisible()
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.getByText('field-notes.md opened')).toBeVisible()
  }
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
  await expect(page.getByLabel('Typeface')).toHaveValue('serif')
  await expect(page.locator('.export-page-live').first()).toHaveClass(/export-preset-academic/)

  const watermark = page.getByPlaceholder('DRAFT, CONFIDENTIAL…')
  await watermark.fill('CONFIDENTIAL')
  await page.getByRole('button', { name: 'Tiled' }).click()
  await expect(page.getByRole('dialog').getByText('CONFIDENTIAL').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /PDF/ })).toBeVisible()
})
