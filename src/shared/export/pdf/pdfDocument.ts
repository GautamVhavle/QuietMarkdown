// Real PDF typesetter orchestration: pages, cursor, and block dispatch.
// Block drawing lives in pdfBlocks; encoding/fonts/text/chrome in siblings.
// Output must stay byte-comparable with the previous monolith for identical
// input (see export-byte check in temp/plan.md).
import { PDFDocument, type PDFPage } from 'pdf-lib'

import { getExportFont } from '../../lib/fonts'
import { getPdfTemplate } from '../../lib/pdf-templates'
import type { ExportSettings } from '../../settings/exportSettings'
import { MARGIN_PRESET_PX } from '../../settings/exportSettings'
import { tuneHeadingColor, tunePageSizePoints } from '../geometry'

import { drawBlock, type BlockContext } from './pdfBlocks'
import { drawChrome, drawPageNumber, drawWatermark } from './pdfChrome'
import { hexRgb } from './pdfEncode'
import { loadFonts } from './pdfFonts'

export async function createMarkdownPdf(
  title: string,
  html: string,
  settings: ExportSettings,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title || 'Untitled document')
  pdf.setSubject('Created locally with QuietMarkdown')
  pdf.setAuthor('QuietMarkdown')
  pdf.setCreator('quietmarkdown.vercel.app')
  pdf.setProducer('QuietMarkdown')

  const recipe = getPdfTemplate(settings.pdfTemplate)
  const tune = settings.fineTune
  const size = tunePageSizePoints(tune.paper, tune.orientation)
  const margin = Math.round(MARGIN_PRESET_PX[tune.marginPreset] * 0.75)
  const contentWidth = size.width - 2 * margin
  const colors = {
    body: hexRgb(tune.bodyColor),
    heading: hexRgb(tune.headingColor),
    h1: hexRgb(tuneHeadingColor(tune, 1)),
    h2: hexRgb(tuneHeadingColor(tune, 2)),
    h3: hexRgb(tuneHeadingColor(tune, 3)),
    muted: hexRgb(recipe.muted),
    rule: hexRgb(recipe.rule),
    accent: hexRgb(tune.linkColor),
    background: hexRgb(recipe.background),
  }
  const fonts = await loadFonts(pdf, getExportFont(tune.bodyFont).pdf)
  const bodySize = recipe.bodySize
  const lineHeight = recipe.lineHeight
  const watermarkFont = fonts.bold

  let page: PDFPage
  let cursor = margin

  const addPage = () => {
    page = pdf.addPage([size.width, size.height])
    page.drawRectangle({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      color: colors.background,
    })
    drawChrome(page, recipe, colors, size, margin)
    cursor = margin
  }

  addPage()

  const remaining = () => size.height - margin - cursor

  const ctx: BlockContext = {
    pdf,
    page: () => page,
    cursor: () => cursor,
    advance: (amount: number) => { cursor += amount },
    ensure: (height: number, keepWith = 0) => {
      if (height + keepWith > remaining() && cursor > margin + 1) addPage()
    },
    baseline: (fromTop: number, fontSize: number) => size.height - fromTop - fontSize * 0.78,
    fonts,
    colors,
    recipe,
    size,
    margin,
    contentWidth,
    bodySize,
    lineHeight,
  }

  const documentRoot = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = documentRoot.getElementById('root')
  if (root) {
    for (const child of Array.from(root.children)) {
      if (child instanceof HTMLElement) await drawBlock(ctx, child)
    }
  }

  if (pdf.getPageCount() === 0) addPage()
  const pages = pdf.getPages()
  pages.forEach((pdfPage, index) => {
    drawWatermark(pdfPage, settings, watermarkFont, size.width, size.height)
    if (!tune.pageNumbers || recipe.pageNumber === 'none') return
    drawPageNumber(pdfPage, recipe, fonts, colors, size, margin, index)
  })

  return pdf.save({ useObjectStreams: true })
}
