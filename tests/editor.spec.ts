import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    // Most workflows assume the welcome tour has already been dismissed.
    localStorage.setItem('quietmarkdown:welcome:v1', JSON.stringify({ seen: true }))
  })
  await page.reload()
})

test('loads a local-first document and renders Markdown', async ({ page }, testInfo) => {
  await expect(page.getByRole('banner').getByText('QuietMarkdown')).toBeVisible()
  await expect(page.getByLabel('Markdown content')).toContainText('# QuietMarkdown editor field guide')
  if (testInfo.project.name !== 'desktop-chromium') {
    await page.getByRole('button', { name: 'Preview' }).click()
  }
  await expect(page.getByRole('heading', { name: 'QuietMarkdown editor field guide' })).toBeVisible()
  await expect(page.locator('.markdown-body .mermaid svg')).toHaveCount(1)
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
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /free, private Markdown editor/)
  expect(await page.title()).toMatch(/Free Online Markdown Editor/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://quietmark.vercel.app/og-image.png')
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
  await page.getByLabel('Markdown content').fill(
    '# Export proof\n\nA short document for file verification.\n\n```mermaid\ngraph TD\n  A[Alpha] --> B[Beta]\n```\n',
  )
  await page.getByRole('button', { name: 'Open export studio' }).click()

  // The capture surface must hold a rendered diagram before exporting.
  await expect(page.locator('.capture-host .mermaid svg')).toHaveCount(1)

  const htmlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download HTML/ }).click()
  const htmlDownload = await htmlDownloadPromise
  const htmlPath = testInfo.outputPath('quietmarkdown-export.html')
  await htmlDownload.saveAs(htmlPath)
  const html = await readFile(htmlPath, 'utf8')
  expect(htmlDownload.suggestedFilename()).toMatch(/\.html$/)
  expect(html).toContain('<h1>Export proof</h1>')
  // The diagram must ship as a self-contained rendered image, not a placeholder.
  expect(html).toContain('data:image/svg+xml')
  expect(html).not.toContain('class="mermaid" data-mermaid=')
  expect(html).not.toContain('watermark')
  expect(html).not.toContain('quietmark.vercel.app')

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
  const diagram = page.locator('.markdown-body .mermaid svg')
  await expect(diagram).toHaveCount(1)

  await page.getByLabel('Use dark theme').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(diagram).toHaveCount(1)

  await page.getByLabel('Use light theme').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(diagram).toHaveCount(1)

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
  await expect(watermark).toHaveValue('quietmark.vercel.app')
  await watermark.fill('CONFIDENTIAL')
  await page.getByRole('button', { name: 'Tiled' }).click()
  await expect(page.getByRole('dialog').getByText('CONFIDENTIAL').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Save as PDF/ })).toBeVisible()
})

test('updates Mermaid diagrams when their source changes', async ({ page }) => {
  const editor = page.getByLabel('Markdown content')
  const diagram = page.locator('.markdown-body .mermaid')
  await expect(diagram.locator('svg')).toHaveCount(1)

  const source = await editor.inputValue()
  await editor.fill(source.replace('Share with confidence', 'Share with clarity'))

  await expect(diagram.locator('svg')).toHaveCount(1)
  await expect(diagram.locator('svg')).toContainText('Share with clarity')
})

test('renders Mermaid diagrams live character by character', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Live typing needs the split view.')
  const editor = page.getByLabel('Markdown content')
  const diagram = page.locator('.markdown-body .mermaid').first()
  await editor.fill('')
  await editor.focus()

  // An unterminated fence still renders — diagrams appear before the closing ```
  await editor.pressSequentially('```mermaid\ngraph TD')
  await expect(diagram.locator('svg')).toHaveCount(1)

  await editor.pressSequentially('\n  A[Alpha] --> B[Beta]')
  await expect(diagram.locator('svg')).toContainText('Beta')

  await editor.pressSequentially('\n  B --> C[Gamma]')
  await expect(diagram.locator('svg')).toContainText('Gamma')
})

test('keeps the last good Mermaid frame while the syntax is invalid, then recovers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Live typing needs the split view.')
  const editor = page.getByLabel('Markdown content')
  const diagram = page.locator('.markdown-body .mermaid').first()
  await editor.fill('')
  await editor.focus()

  await editor.pressSequentially('```mermaid\ngraph TD\n  A[Alpha] --> B[Beta]')
  await expect(diagram.locator('svg')).toContainText('Beta')

  // Break the syntax mid-edit (unclosed bracket)…
  await editor.pressSequentially('\n  C[Oops --> D[Dangling]')
  await expect(diagram.locator('.mermaid-note')).toBeVisible()
  // …the previous good diagram must stay on screen, not flash an error box.
  await expect(diagram.locator('svg')).toHaveCount(1)
  await expect(diagram.locator('svg')).toContainText('Beta')

  // Remove the broken line — the diagram recovers without a reload.
  for (let index = 0; index < '\n  C[Oops --> D[Dangling]'.length; index += 1) {
    await editor.press('Backspace')
  }
  await expect(diagram.locator('.mermaid-note')).toHaveCount(0)
  await expect(diagram.locator('svg')).toContainText('Beta')
})

test('renders multiple Mermaid diagrams and caches untouched ones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Split view keeps both panes visible.')
  const editor = page.getByLabel('Markdown content')
  const diagrams = page.locator('.markdown-body .mermaid')

  const source = await editor.inputValue()
  await editor.fill(`${source}\n\n\`\`\`mermaid\npie title Snack votes\n  "Apples" : 42\n  "Bananas" : 27\n\`\`\`\n`)
  await expect(diagrams).toHaveCount(2)
  await expect(page.locator('.markdown-body .mermaid svg')).toHaveCount(2)
  await expect(diagrams.nth(1)).toContainText('Apples')

  // Editing the first diagram must not disturb the second.
  const docWithPie = await editor.inputValue()
  const secondSvgBefore = await diagrams.nth(1).locator('svg').innerHTML()
  await editor.fill(docWithPie.replace('Share with confidence', 'Share with certainty'))
  await expect(diagrams.nth(0).locator('svg')).toContainText('Share with certainty')
  await expect(diagrams).toHaveCount(2)
  await expect(diagrams.nth(1)).toContainText('Apples')
  expect(await diagrams.nth(1).locator('svg').innerHTML()).toBe(secondSvgBefore)
})

test('creates, switches between, and deletes documents in the library', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'library popover is a desktop workflow')
  const documents = page.getByRole('button', { name: 'Documents' })
  await documents.click()
  await expect(page.locator('.docs-popover')).toBeVisible()
  await page.getByRole('button', { name: /New/ }).click()
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')

  const editor = page.getByLabel('Markdown content')
  await editor.fill('# Second note\n\nLibrary content.')
  await page.waitForTimeout(700)

  // Switch back to the field guide and confirm content follows.
  await documents.click()
  const rows = page.locator('.docs-list li')
  await expect(rows).toHaveCount(2)
  await rows.filter({ hasText: 'QuietMarkdown editor field guide' }).locator('.docs-row').click()
  await expect(page.locator('.markdown-body h1').first()).toContainText('QuietMarkdown editor field guide')

  // Reload: the active document survives.
  await page.reload()
  await expect(page.getByLabel('Document title')).toHaveValue(/QuietMarkdown editor/)

  // Switch to the second doc, then delete it (two-step confirm).
  await documents.click()
  await rows.filter({ hasText: 'Untitled document' }).locator('.docs-row').click()
  await expect(editor).toHaveValue(/Second note/)
  await documents.click()
  await rows.filter({ hasText: 'Untitled document' }).getByTitle('Delete').click()
  await rows.filter({ hasText: 'Untitled document' }).getByTitle('Confirm delete').click()
  await expect(rows).toHaveCount(1)
})

test('finds and replaces text across the document', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'find panel is tuned for larger viewports')
  const editor = page.getByLabel('Markdown content')
  await editor.fill('# Alpha report\n\nThe alpha team wrote about alpha ideas.')

  await page.getByRole('button', { name: 'Find in document' }).click()
  const findInput = page.getByLabel('Find text')
  await findInput.fill('alpha')
  await expect(page.locator('.find-count')).toHaveText('1/3')
  await findInput.press('Enter')
  await findInput.press('Enter')
  await expect(page.locator('.find-count')).toHaveText('3/3')

  // Case-sensitive matching only counts exact-case hits.
  await page.getByRole('button', { name: 'Match case' }).click()
  await expect(page.locator('.find-count')).toHaveText('1/2')
  await page.getByRole('button', { name: 'Match case' }).click()
  await expect(page.locator('.find-count')).toHaveText('1/3')

  await page.keyboard.press('Escape')
  await expect(page.locator('.find-panel')).toHaveCount(0)

  // Replace-all flow via ⌘H/Ctrl+H.
  await editor.click()
  await editor.press(process.platform === 'darwin' ? 'Meta+h' : 'Control+h')
  await page.getByLabel('Find text').fill('alpha')
  await page.getByLabel('Replace with').fill('omega')
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(editor).toHaveValue(/The omega team wrote about omega ideas\./)
})

test('embeds pasted images as local data URLs', async ({ page }) => {
  const editor = page.getByLabel('Markdown content')
  await editor.fill('# With picture\n\n')
  await editor.focus()
  await editor.evaluate((element) => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    const context = canvas.getContext('2d')!
    context.fillStyle = '#d85b3f'
    context.fillRect(0, 0, 32, 24)
    canvas.toBlob((blob) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([blob!], 'snapshot.png', { type: 'image/png' }))
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }))
    }, 'image/png')
  })
  await expect(editor).toHaveValue(/!\[snapshot\]\(data:image\/png/, { timeout: 5000 })
  if (await page.getByRole('button', { name: 'Preview' }).isVisible()) {
    await expect(page.locator('.markdown-body img[src^="data:image"]')).toHaveCount(1)
  }
})

test('welcomes first-time visitors with a skippable tour', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'tour visuals are verified on desktop')
  const dialog = page.locator('.welcome-dialog')

  // Re-enter first-visitor state (beforeEach seeds a dismissed tour).
  await page.evaluate(() => localStorage.removeItem('quietmarkdown:welcome:v1'))
  await page.reload()

  // First visit: the tour greets automatically.
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A quiet place to write.' })).toBeVisible()

  // Every scene renders its teaching visual.
  await expect(page.locator('.mini-pane')).toHaveCount(2)
  await page.locator('.welcome-next').click()
  await expect(page.locator('.seal-panel > svg')).toBeVisible()
  await page.locator('.welcome-next').click()
  await expect(page.locator('.capability-tile')).toHaveCount(6)
  await page.locator('.welcome-next').click()
  await expect(page.locator('.export-card')).toHaveCount(3)

  // Dots track progress; Back returns.
  await expect(page.locator('.welcome-dot.active')).toHaveCount(1)
  await page.locator('.welcome-back').click()
  await expect(page.locator('.capability-tile')).toHaveCount(6)
  await page.locator('.welcome-next').click()

  // Finishing dismisses for good.
  await page.getByRole('button', { name: /Start writing/ }).click()
  await expect(dialog).toHaveCount(0)

  await page.reload()
  await expect(dialog).toHaveCount(0)

  // The brand mark doubles as the home button.
  await page.locator('button.brand').click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('clears the page from the documents menu with an undo safety net', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'documents popover is a desktop workflow')
  const editor = page.getByLabel('Markdown content')
  await editor.fill('# Draft to discard\n\nWords worth wiping.')

  await page.getByRole('button', { name: 'Documents' }).click()
  await page.getByRole('button', { name: /Clear page · start fresh/ }).click()

  await expect(editor).toHaveValue('')
  await expect(page.getByLabel('Document title')).toHaveValue('Untitled document')
  await expect(page.locator('.toast')).toContainText(/Page cleared/)

  // Safety net: one undo brings the draft back.
  await editor.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z')
  await expect(editor).toHaveValue(/Draft to discard/)
})
