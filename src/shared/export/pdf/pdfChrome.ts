// Page chrome: template top rules, watermark text, and page numbers.
import { degrees, type PDFFont, type PDFPage } from 'pdf-lib'

import type { PdfTemplate } from '../../lib/pdf-templates'
import type { ExportSettings } from '../../settings/exportSettings'

import { pdfEncode, hexRgb } from './pdfEncode'
import type { FontSet } from './pdfFonts'

export function drawChrome(
  page: PDFPage,
  recipe: PdfTemplate,
  colors: { accent: ReturnType<typeof hexRgb>; heading: ReturnType<typeof hexRgb>; rule: ReturnType<typeof hexRgb> },
  size: { width: number; height: number },
  margin: number,
) {
  if (recipe.chrome === 'bar') {
    page.drawRectangle({
      x: 0,
      y: size.height - 7,
      width: size.width,
      height: 7,
      color: colors.accent,
    })
    return
  }
  if (recipe.chrome === 'letterhead') {
    page.drawLine({
      start: { x: margin, y: size.height - 26 },
      end: { x: size.width - margin, y: size.height - 26 },
      thickness: 1.15,
      color: colors.heading,
    })
    page.drawLine({
      start: { x: margin, y: size.height - 29.5 },
      end: { x: size.width - margin, y: size.height - 29.5 },
      thickness: 0.4,
      color: colors.rule,
    })
    return
  }
  if (recipe.chrome === 'folio') {
    page.drawLine({
      start: { x: margin, y: size.height - 20 },
      end: { x: size.width - margin, y: size.height - 20 },
      thickness: 0.5,
      color: colors.rule,
    })
    page.drawLine({
      start: { x: margin, y: 20 },
      end: { x: size.width - margin, y: 20 },
      thickness: 0.5,
      color: colors.rule,
    })
  }
}

export function drawWatermark(
  page: PDFPage,
  settings: ExportSettings,
  font: PDFFont,
  pageWidth: number,
  pageHeight: number,
) {
  const watermark = settings.watermark
  if (!watermark.enabled || !watermark.text.trim()) return
  const text = pdfEncode(watermark.text.trim()) || 'WATERMARK'
  let size = watermark.size * 0.75
  let textWidth = font.widthOfTextAtSize(text, size)
  const maxWidth = pageWidth * 0.82
  if (textWidth > maxWidth) {
    size *= maxWidth / textWidth
    textWidth = font.widthOfTextAtSize(text, size)
  }
  const color = hexRgb(watermark.color)
  const options = {
    font,
    size,
    color,
    opacity: watermark.opacity,
    rotate: degrees(watermark.rotation),
  }
  const padding = 36
  if (watermark.position === 'tiled') {
    const stepX = Math.max(140, size * 2.8)
    const stepY = Math.max(100, size * 2)
    for (let y = -stepY; y < pageHeight + stepY; y += stepY) {
      for (let x = -stepX; x < pageWidth + stepX; x += stepX) {
        page.drawText(text, { x, y, ...options })
      }
    }
    return
  }
  const positions = {
    center: [(pageWidth - textWidth) / 2, pageHeight / 2],
    'top-left': [padding, pageHeight - padding - size],
    'top-right': [pageWidth - padding - textWidth, pageHeight - padding - size],
    'bottom-left': [padding, padding],
    'bottom-right': [pageWidth - padding - textWidth, padding],
  } as const
  const [x, y] = positions[watermark.position]
  page.drawText(text, { x, y, ...options })
}

export function drawPageNumber(
  page: PDFPage,
  recipe: PdfTemplate,
  fonts: FontSet,
  colors: { muted: ReturnType<typeof hexRgb> },
  size: { width: number },
  margin: number,
  index: number,
) {
  const label = String(index + 1)
  const numberSize = 9
  const labelWidth = fonts.body.widthOfTextAtSize(label, numberSize)
  const x = recipe.pageNumber === 'center'
    ? (size.width - labelWidth) / 2
    : size.width - margin - labelWidth
  page.drawText(label, {
    x,
    y: recipe.chrome === 'folio' ? 28 : 22,
    size: numberSize,
    font: fonts.body,
    color: colors.muted,
  })
}
