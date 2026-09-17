// Block renderers: paragraphs, images, lists, tables, code, and the block
// dispatcher. Each takes an explicit context so the orchestrator owns the
// page cursor; nothing here holds module-level render state.
import { rgb, type PDFDocument, type PDFPage, type RGB } from 'pdf-lib'

import type { PdfTemplate } from '../../lib/pdf-templates'

import { embedImage, encodeFor } from './pdfEncode'
import type { FontSet } from './pdfFonts'
import { fontFor, inlineRuns, measure, wrapRuns, type Run } from './pdfText'

export interface BlockColors {
  body: RGB
  heading: RGB
  h1: RGB
  h2: RGB
  h3: RGB
  muted: RGB
  rule: RGB
  accent: RGB
  background: RGB
}

export interface BlockContext {
  pdf: PDFDocument
  page: () => PDFPageLike
  cursor: () => number
  advance: (amount: number) => void
  ensure: (height: number, keepWith?: number) => void
  baseline: (fromTop: number, fontSize: number) => number
  fonts: FontSet
  colors: BlockColors
  recipe: PdfTemplate
  size: { width: number; height: number }
  margin: number
  contentWidth: number
  bodySize: number
  lineHeight: number
}

// Block renderers draw on the live PDFPage; the orchestrator owns page
// lifecycle and passes the current page through the context accessor.
export type PDFPageLike = PDFPage

// Minimal font surface block renderers need. pdf-lib PDFFont satisfies this.
export interface PDFFontLike {
  widthOfTextAtSize: (text: string, size: number) => number
}

export function drawRunsLine(ctx: BlockContext, runs: Run[], x: number, fontSize: number, color: RGB) {
  drawRunsLineOn(ctx, runs, x, fontSize, color)
}

function drawRunsLineOn(ctx: BlockContext, runs: Run[], x: number, fontSize: number, color: RGB) {
  // Implemented via the page accessor to keep cursor ownership in one place.
  const target = ctx.page()
  let left = x
  for (const run of runs) {
    const text = encodeFor(ctx.fonts, run.text)
    if (!text) continue
    const font = fontFor(ctx.fonts, run)
    const paint = run.link ? ctx.colors.accent : run.code ? ctx.colors.heading : color
    target.drawText(text, {
      x: left,
      y: ctx.baseline(ctx.cursor(), fontSize),
      size: fontSize,
      font,
      color: paint,
    })
    left += font.widthOfTextAtSize(text, fontSize)
  }
  ctx.advance(fontSize * ctx.lineHeight)
}

export function drawParagraph(ctx: BlockContext, runs: Run[], options: {
  size?: number
  color?: RGB
  indent?: number
  width?: number
  firstLineIndent?: number
  align?: 'left' | 'center'
} = {}) {
  const fontSize = options.size ?? ctx.bodySize
  const color = options.color ?? ctx.colors.body
  const indent = options.indent ?? 0
  const width = options.width ?? ctx.contentWidth - indent
  const lines = wrapRuns(runs, ctx.fonts, fontSize, width)
  if (lines.length === 0) return
  const skip = fontSize * ctx.lineHeight
  ctx.ensure(skip * Math.min(lines.length, 3), skip)
  lines.forEach((line, index) => {
    ctx.ensure(skip)
    let x = ctx.margin + indent + (index === 0 ? options.firstLineIndent ?? 0 : 0)
    if (options.align === 'center') {
      const lineWidth = line.reduce((sum, run) => sum + measure(ctx.fonts, run, fontSize), 0)
      x = ctx.margin + indent + Math.max(0, (width - lineWidth) / 2)
    }
    drawRunsLineOn(ctx, line, x, fontSize, color)
  })
}

export async function drawImage(ctx: BlockContext, element: HTMLImageElement, indent = 0) {
  const image = await embedImage(ctx.pdf, element.getAttribute('src') ?? '')
  if (!image) return
  const available = ctx.contentWidth - indent
  const scale = Math.min(1, available / image.width, (ctx.size.height - 2 * ctx.margin) * 0.7 / image.height)
  const width = image.width * scale
  const height = image.height * scale
  ctx.ensure(height + 8)
  const target = ctx.page()
  target.drawImage(image, {
    x: ctx.margin + indent + (available - width) / 2,
    y: ctx.size.height - ctx.cursor() - height,
    width,
    height,
  })
  ctx.advance(height + 10)
}

export async function drawList(ctx: BlockContext, list: HTMLElement, ordered: boolean, level: number) {
  const indent = level * 16
  let index = 1
  for (const item of Array.from(list.children)) {
    if (!(item instanceof HTMLElement) || item.tagName !== 'LI') continue
    const nested = Array.from(item.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && (child.tagName === 'UL' || child.tagName === 'OL'),
    )
    const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    const marker = checkbox
      ? (checkbox.checked ? '[x]' : '[ ]')
      : ordered ? `${index}.` : '-'
    const markerWidth = 16
    const clone = item.cloneNode(true) as HTMLElement
    clone.querySelectorAll('ul, ol, input').forEach((node) => node.remove())
    const runs = inlineRuns(clone)
    const lines = wrapRuns(runs.length ? runs : [{ text: item.textContent?.trim() ?? '', bold: false, italic: false, code: false, link: false, heading: false }], ctx.fonts, ctx.bodySize, ctx.contentWidth - indent - markerWidth)
    const skip = ctx.bodySize * ctx.lineHeight
    ctx.ensure(skip * Math.max(1, Math.min(lines.length, 2)))
    const markerX = ctx.margin + indent
    const target = ctx.page()
    target.drawText(encodeFor(ctx.fonts, marker), {
      x: markerX,
      y: ctx.baseline(ctx.cursor(), ctx.bodySize),
      size: ctx.bodySize,
      font: ctx.fonts.body,
      color: ctx.colors.accent,
    })
    if (lines.length === 0) ctx.advance(skip)
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) ctx.ensure(skip)
      drawRunsLineOn(ctx, line, markerX + markerWidth, ctx.bodySize, ctx.colors.body)
    })
    for (const child of nested) {
      await drawList(ctx, child, child.tagName === 'OL', level + 1)
    }
    index += 1
  }
}

export function drawTable(ctx: BlockContext, table: HTMLElement) {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) return
  const grid = rows.map((row) => Array.from(row.children).map((cell) => (cell.textContent ?? '').trim()))
  const columns = Math.max(...grid.map((row) => row.length), 1)
  const colWidth = ctx.contentWidth / columns
  const cellSize = 9
  const cellPad = 5
  const wrapped = grid.map((row) =>
    Array.from({ length: columns }, (_, column) =>
      wrapRuns(
        [{ text: row[column] ?? '', bold: false, italic: false, code: false, link: false, heading: false }],
        ctx.fonts,
        cellSize,
        colWidth - cellPad * 2,
      ),
    ),
  )
  const rowHeights = wrapped.map((row) => {
    const lines = Math.max(1, ...row.map((cell) => cell.length))
    return lines * cellSize * 1.35 + cellPad * 2
  })
  const target = ctx.page()

  wrapped.forEach((row, rowIndex) => {
    const height = rowHeights[rowIndex]
    ctx.ensure(height)
    const top = ctx.cursor()
    if (rowIndex === 0) {
      target.drawRectangle({
        x: ctx.margin,
        y: ctx.size.height - top - height,
        width: ctx.contentWidth,
        height,
        color: rgb(
          ctx.colors.accent.red * 0.08 + ctx.colors.background.red * 0.92,
          ctx.colors.accent.green * 0.08 + ctx.colors.background.green * 0.92,
          ctx.colors.accent.blue * 0.08 + ctx.colors.background.blue * 0.92,
        ),
      })
    }
    target.drawLine({
      start: { x: ctx.margin, y: ctx.size.height - top },
      end: { x: ctx.margin + ctx.contentWidth, y: ctx.size.height - top },
      thickness: rowIndex === 0 ? 1.2 : 0.4,
      color: rowIndex === 0 ? ctx.colors.heading : ctx.colors.rule,
    })
    row.forEach((cell, column) => {
      let y = top + cellPad
      const textColor = rowIndex === 0 ? ctx.colors.heading : ctx.colors.body
      const font = rowIndex === 0 ? ctx.fonts.bold : ctx.fonts.body
      cell.forEach((line) => {
        const text = encodeFor(ctx.fonts, line.map((run) => run.text).join(''))
        target.drawText(text, {
          x: ctx.margin + column * colWidth + cellPad,
          y: ctx.baseline(y, cellSize),
          size: cellSize,
          font,
          color: textColor,
        })
        y += cellSize * 1.35
      })
    })
    ctx.advance(height)
  })
  target.drawLine({
    start: { x: ctx.margin, y: ctx.size.height - ctx.cursor() },
    end: { x: ctx.margin + ctx.contentWidth, y: ctx.size.height - ctx.cursor() },
    thickness: 1.2,
    color: ctx.colors.heading,
  })
  ctx.advance(8)
}

export function drawPre(ctx: BlockContext, pre: HTMLElement) {
  const code = encodeFor(ctx.fonts, pre.textContent?.replace(/\n$/, '') ?? '')
  const fontSize = 8.5
  const skip = fontSize * 1.4
  const tint = rgb(
    ctx.colors.body.red * 0.06 + ctx.colors.background.red * 0.94,
    ctx.colors.body.green * 0.06 + ctx.colors.background.green * 0.94,
    ctx.colors.body.blue * 0.06 + ctx.colors.background.blue * 0.94,
  )
  const lines = code.split('\n').flatMap((line) => {
    const run: Run = { text: line || ' ', bold: false, italic: false, code: true, link: false, heading: false }
    return wrapRuns([run], ctx.fonts, fontSize, ctx.contentWidth - 16).map((wrapped) => wrapped.map((part) => part.text).join(''))
  })
  const target = ctx.page() as unknown as {
    drawRectangle: (opts: { x: number; y: number; width: number; height: number; color: RGB }) => void
    drawText: (text: string, opts: { x: number; y: number; size: number; font: unknown; color: RGB }) => void
  }
  for (const line of lines) {
    ctx.ensure(skip)
    target.drawRectangle({
      x: ctx.margin,
      y: ctx.size.height - ctx.cursor() - skip,
      width: ctx.contentWidth,
      height: skip,
      color: tint,
    })
    target.drawText(line || ' ', {
      x: ctx.margin + 8,
      y: ctx.baseline(ctx.cursor(), fontSize),
      size: fontSize,
      font: ctx.fonts.mono,
      color: ctx.colors.heading,
    })
    ctx.advance(skip)
  }
  ctx.advance(10)
}

export async function drawBlock(ctx: BlockContext, element: HTMLElement) {
  const tag = element.tagName
  if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') {
    const sizes = { H1: ctx.recipe.h1, H2: ctx.recipe.h2, H3: ctx.recipe.h3, H4: ctx.recipe.bodySize, H5: ctx.recipe.bodySize, H6: ctx.recipe.bodySize }
    const fontSize = sizes[tag as keyof typeof sizes]
    const levelColor = tag === 'H1' ? ctx.colors.h1 : tag === 'H2' ? ctx.colors.h2 : tag === 'H3' ? ctx.colors.h3 : ctx.colors.heading
    ctx.advance(tag === 'H1' ? 4 : 10)
    let runs = inlineRuns(element).map((run) => ({ ...run, bold: true, heading: true }))
    if (tag === 'H2' && ctx.recipe.h2Style === 'uppercase') {
      runs = runs.map((run) => ({ ...run, text: run.text.toUpperCase() }))
    }
    drawParagraph(ctx, runs, {
      size: fontSize,
      color: levelColor,
      align: tag === 'H1' ? ctx.recipe.h1Align : 'left',
    })
    if (tag === 'H2' && ctx.recipe.h2Style === 'rule') {
      const target = ctx.page()
      target.drawLine({
        start: { x: ctx.margin, y: ctx.size.height - ctx.cursor() - 2 },
        end: { x: ctx.margin + 36, y: ctx.size.height - ctx.cursor() - 2 },
        thickness: 1.6,
        color: ctx.colors.accent,
      })
      ctx.advance(8)
    }
    if (tag === 'H1' && ctx.recipe.h1Align === 'center') ctx.advance(2)
    ctx.advance(4)
    return
  }
  if (tag === 'P') {
    const image = element.querySelector(':scope > img')
    if (image instanceof HTMLImageElement && (element.textContent ?? '').trim().length < 40) {
      await drawImage(ctx, image)
      return
    }
    drawParagraph(ctx, inlineRuns(element), { firstLineIndent: ctx.recipe.firstLineIndent })
    ctx.advance(ctx.recipe.paragraphGap)
    return
  }
  if (tag === 'UL') {
    await drawList(ctx, element, false, 0)
    ctx.advance(4)
    return
  }
  if (tag === 'OL') {
    await drawList(ctx, element, true, 0)
    ctx.advance(4)
    return
  }
  if (tag === 'BLOCKQUOTE') {
    const start = ctx.cursor()
    const inner = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    if (inner.length === 0) {
      drawParagraph(ctx, inlineRuns(element), { indent: 14, color: ctx.colors.muted })
    } else {
      for (const child of inner) {
        if (child.tagName === 'P') drawParagraph(ctx, inlineRuns(child), { indent: 14, color: ctx.colors.muted })
        else await drawBlock(ctx, child)
      }
    }
    const quoteHeight = ctx.cursor() - start
    if (quoteHeight > 0) {
      const target = ctx.page()
      target.drawRectangle({
        x: ctx.margin,
        y: ctx.size.height - ctx.cursor(),
        width: 2.4,
        height: quoteHeight,
        color: ctx.colors.accent,
      })
    }
    ctx.advance(8)
    return
  }
  if (tag === 'PRE') {
    drawPre(ctx, element)
    return
  }
  if (tag === 'TABLE') {
    drawTable(ctx, element)
    return
  }
  if (tag === 'HR') {
    ctx.ensure(16)
    ctx.advance(8)
    const target = ctx.page()
    target.drawLine({
      start: { x: ctx.margin, y: ctx.size.height - ctx.cursor() },
      end: { x: ctx.margin + ctx.contentWidth, y: ctx.size.height - ctx.cursor() },
      thickness: 0.6,
      color: ctx.colors.rule,
    })
    ctx.advance(10)
    return
  }
  if (tag === 'IMG') {
    await drawImage(ctx, element as HTMLImageElement)
    return
  }
  if (element.children.length > 0) {
    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) await drawBlock(ctx, child)
    }
    return
  }
  if (element.textContent?.trim()) {
    drawParagraph(ctx, inlineRuns(element))
    ctx.advance(6)
  }
}
