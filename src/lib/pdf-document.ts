import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from 'pdf-lib'
import type { ExportSettings } from '../types'
import { MARGIN_PRESET_PX } from '../types'
import { tuneHeadingColor, tunePageSizePoints } from './export'
import { getExportFont } from './fonts'
import { getPdfTemplate } from './pdf-templates'

interface Run {
  text: string
  bold: boolean
  italic: boolean
  code: boolean
  link: boolean
}

interface FontSet {
  body: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
  mono: PDFFont
  monoBold: PDFFont
}

const CHAR_MAP: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u2013': '-',
  '\u2014': '--',
  '\u2026': '...',
  '\u2022': '-',
  '\u00B7': '-',
  '\u2212': '-',
  '\u00A0': ' ',
  '\u202F': ' ',
  '\u2192': '->',
  '\u2190': '<-',
  '\u00D7': 'x',
}

/** Standard PDF fonts only encode WinAnsi. Map punctuation, drop the rest. */
export function pdfEncode(text: string): string {
  let output = ''
  for (const char of text) {
    if (CHAR_MAP[char]) {
      output += CHAR_MAP[char]
      continue
    }
    const code = char.codePointAt(0) ?? 0
    if (code === 9) {
      output += '  '
      continue
    }
    if (code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      output += char
      continue
    }
  }
  return output
}

function hexRgb(hex: string): RGB {
  const value = hex.trim().replace('#', '')
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return rgb(0.16, 0.16, 0.15)
  return rgb(
    Number.parseInt(full.slice(0, 2), 16) / 255,
    Number.parseInt(full.slice(2, 4), 16) / 255,
    Number.parseInt(full.slice(4, 6), 16) / 255,
  )
}

function dataUrlToBytes(src: string): Uint8Array | null {
  const match = src.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/)
  if (!match) return null
  const binary = atob(match[1])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function embedImage(pdf: PDFDocument, src: string): Promise<PDFImage | null> {
  if (!src) return null
  try {
    if (src.startsWith('data:image/png')) {
      const bytes = dataUrlToBytes(src)
      return bytes ? await pdf.embedPng(bytes) : null
    }
    if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
      const bytes = dataUrlToBytes(src)
      return bytes ? await pdf.embedJpg(bytes) : null
    }
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, image.naturalWidth)
    canvas.height = Math.max(1, image.naturalHeight)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null
    return await pdf.embedPng(await blob.arrayBuffer())
  } catch {
    return null
  }
}

function fontFor(fonts: FontSet, run: Run): PDFFont {
  if (run.code) return run.bold ? fonts.monoBold : fonts.mono
  if (run.bold && run.italic) return fonts.boldItalic
  if (run.bold) return fonts.bold
  if (run.italic) return fonts.italic
  return fonts.body
}

function measure(fonts: FontSet, run: Run, size: number): number {
  const text = pdfEncode(run.text)
  if (!text) return 0
  return fontFor(fonts, run).widthOfTextAtSize(text, size)
}

function wrapRuns(runs: Run[], fonts: FontSet, size: number, maxWidth: number): Run[][] {
  const lines: Run[][] = []
  let line: Run[] = []
  let width = 0

  const commit = () => {
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) line.pop()
    if (line.length > 0) lines.push(line)
    line = []
    width = 0
  }

  const pushRun = (run: Run) => {
    if (!run.text) return
    const runWidth = measure(fonts, run, size)
    const isSpace = /^\s+$/.test(run.text)
    if (width + runWidth > maxWidth && width > 0 && !isSpace) commit()
    if (isSpace && width === 0) return
    const last = line[line.length - 1]
    if (
      last
      && last.bold === run.bold
      && last.italic === run.italic
      && last.code === run.code
      && last.link === run.link
    ) {
      last.text += run.text
    } else {
      line.push({ ...run })
    }
    width += runWidth
  }

  const pushText = (run: Run) => {
    const pieces = run.text.split(/(\s+)/)
    for (const piece of pieces) {
      if (!piece) continue
      if (piece.includes('\n')) {
        const parts = piece.split('\n')
        parts.forEach((part, index) => {
          if (index > 0) commit()
          if (part) pushText({ ...run, text: part })
        })
        continue
      }
      const font = fontFor(fonts, run)
      const encoded = pdfEncode(piece)
      if (encoded && font.widthOfTextAtSize(encoded, size) > maxWidth && !/^\s+$/.test(piece)) {
        let chunk = ''
        for (const char of piece) {
          const next = chunk + char
          if (chunk && font.widthOfTextAtSize(pdfEncode(next), size) > maxWidth) {
            pushRun({ ...run, text: chunk })
            commit()
            chunk = char
          } else {
            chunk = next
          }
        }
        if (chunk) pushRun({ ...run, text: chunk })
        continue
      }
      pushRun({ ...run, text: piece })
    }
  }

  for (const run of runs) pushText(run)
  commit()
  return lines
}

function inlineRuns(node: Node): Run[] {
  const runs: Run[] = []
  const walk = (current: Node, style: Omit<Run, 'text'>) => {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent ?? ''
      if (text) runs.push({ text, ...style })
      return
    }
    if (!(current instanceof HTMLElement)) {
      current.childNodes.forEach((child) => walk(child, style))
      return
    }
    const tag = current.tagName
    if (tag === 'BR') {
      runs.push({ text: '\n', ...style })
      return
    }
    if (tag === 'INPUT') return
    const next = { ...style }
    if (tag === 'STRONG' || tag === 'B') next.bold = true
    if (tag === 'EM' || tag === 'I') next.italic = true
    if (tag === 'CODE' && current.parentElement?.tagName !== 'PRE') next.code = true
    if (tag === 'A') next.link = true
    current.childNodes.forEach((child) => walk(child, next))
  }
  walk(node, { bold: false, italic: false, code: false, link: false })
  return runs
}

async function loadFonts(pdf: PDFDocument, family: 'serif' | 'sans' | 'mono'): Promise<FontSet> {
  if (family === 'mono') {
    const body = await pdf.embedFont(StandardFonts.Courier)
    const bold = await pdf.embedFont(StandardFonts.CourierBold)
    const italic = await pdf.embedFont(StandardFonts.CourierOblique)
    return { body, bold, italic, boldItalic: bold, mono: body, monoBold: bold }
  }
  if (family === 'serif') {
    return {
      body: await pdf.embedFont(StandardFonts.TimesRoman),
      bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
      boldItalic: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
      mono: await pdf.embedFont(StandardFonts.Courier),
      monoBold: await pdf.embedFont(StandardFonts.CourierBold),
    }
  }
  return {
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  }
}

function drawWatermark(
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

/**
 * Typeset sanitized Markdown HTML into a real PDF (selectable text, true paper
 * size in points). This is not a screenshot of the HTML preview.
 */
export async function createMarkdownPdf(
  title: string,
  html: string,
  settings: ExportSettings,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title || 'Untitled document')
  pdf.setSubject('Created locally with QuietMarkdown')
  pdf.setAuthor('QuietMarkdown')
  pdf.setCreator('quietmark.vercel.app')
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

  const drawChrome = () => {
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

  const addPage = () => {
    page = pdf.addPage([size.width, size.height])
    page.drawRectangle({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      color: colors.background,
    })
    drawChrome()
    cursor = margin
  }

  addPage()

  const remaining = () => size.height - margin - cursor

  const ensure = (height: number, keepWith = 0) => {
    if (height + keepWith > remaining() && cursor > margin + 1) addPage()
  }

  const baseline = (fromTop: number, fontSize: number) => size.height - fromTop - fontSize * 0.78

  const drawRunsLine = (runs: Run[], x: number, fontSize: number, color: RGB) => {
    let left = x
    for (const run of runs) {
      const text = pdfEncode(run.text)
      if (!text) continue
      const font = fontFor(fonts, run)
      const paint = run.link ? colors.accent : run.code ? colors.heading : color
      page.drawText(text, {
        x: left,
        y: baseline(cursor, fontSize),
        size: fontSize,
        font,
        color: paint,
      })
      left += font.widthOfTextAtSize(text, fontSize)
    }
    cursor += fontSize * lineHeight
  }

  const drawParagraph = (runs: Run[], options: {
    size?: number
    color?: RGB
    indent?: number
    width?: number
    firstLineIndent?: number
    align?: 'left' | 'center'
  } = {}) => {
    const fontSize = options.size ?? bodySize
    const color = options.color ?? colors.body
    const indent = options.indent ?? 0
    const width = options.width ?? contentWidth - indent
    const lines = wrapRuns(runs, fonts, fontSize, width)
    if (lines.length === 0) return
    const skip = fontSize * lineHeight
    ensure(skip * Math.min(lines.length, 3), skip)
    lines.forEach((line, index) => {
      ensure(skip)
      let x = margin + indent + (index === 0 ? options.firstLineIndent ?? 0 : 0)
      if (options.align === 'center') {
        const lineWidth = line.reduce((sum, run) => sum + measure(fonts, run, fontSize), 0)
        x = margin + indent + Math.max(0, (width - lineWidth) / 2)
      }
      drawRunsLine(line, x, fontSize, color)
    })
  }

  const drawImage = async (element: HTMLImageElement, indent = 0) => {
    const image = await embedImage(pdf, element.getAttribute('src') ?? '')
    if (!image) return
    const available = contentWidth - indent
    const scale = Math.min(1, available / image.width, (size.height - 2 * margin) * 0.7 / image.height)
    const width = image.width * scale
    const height = image.height * scale
    ensure(height + 8)
    page.drawImage(image, {
      x: margin + indent + (available - width) / 2,
      y: size.height - cursor - height,
      width,
      height,
    })
    cursor += height + 10
  }

  const drawList = async (list: HTMLElement, ordered: boolean, level: number) => {
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
      const lines = wrapRuns(runs.length ? runs : [{ text: item.textContent?.trim() ?? '', bold: false, italic: false, code: false, link: false }], fonts, bodySize, contentWidth - indent - markerWidth)
      const skip = bodySize * lineHeight
      ensure(skip * Math.max(1, Math.min(lines.length, 2)))
      const markerX = margin + indent
      page.drawText(pdfEncode(marker), {
        x: markerX,
        y: baseline(cursor, bodySize),
        size: bodySize,
        font: fonts.body,
        color: colors.accent,
      })
      if (lines.length === 0) cursor += skip
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) ensure(skip)
        drawRunsLine(line, markerX + markerWidth, bodySize, colors.body)
      })
      for (const child of nested) {
        await drawList(child, child.tagName === 'OL', level + 1)
      }
      index += 1
    }
  }

  const drawTable = (table: HTMLElement) => {
    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return
    const grid = rows.map((row) => Array.from(row.children).map((cell) => (cell.textContent ?? '').trim()))
    const columns = Math.max(...grid.map((row) => row.length), 1)
    const colWidth = contentWidth / columns
    const cellSize = 9
    const cellPad = 5
    const wrapped = grid.map((row) =>
      Array.from({ length: columns }, (_, column) =>
        wrapRuns(
          [{ text: row[column] ?? '', bold: false, italic: false, code: false, link: false }],
          fonts,
          cellSize,
          colWidth - cellPad * 2,
        ),
      ),
    )
    const rowHeights = wrapped.map((row) => {
      const lines = Math.max(1, ...row.map((cell) => cell.length))
      return lines * cellSize * 1.35 + cellPad * 2
    })

    wrapped.forEach((row, rowIndex) => {
      const height = rowHeights[rowIndex]
      ensure(height)
      const top = cursor
      if (rowIndex === 0) {
        page.drawRectangle({
          x: margin,
          y: size.height - top - height,
          width: contentWidth,
          height,
          color: rgb(
            colors.accent.red * 0.08 + colors.background.red * 0.92,
            colors.accent.green * 0.08 + colors.background.green * 0.92,
            colors.accent.blue * 0.08 + colors.background.blue * 0.92,
          ),
        })
      }
      page.drawLine({
        start: { x: margin, y: size.height - top },
        end: { x: margin + contentWidth, y: size.height - top },
        thickness: rowIndex === 0 ? 1.2 : 0.4,
        color: rowIndex === 0 ? colors.heading : colors.rule,
      })
      row.forEach((cell, column) => {
        let y = top + cellPad
        const textColor = rowIndex === 0 ? colors.heading : colors.body
        const font = rowIndex === 0 ? fonts.bold : fonts.body
        cell.forEach((line) => {
          const text = pdfEncode(line.map((run) => run.text).join(''))
          page.drawText(text, {
            x: margin + column * colWidth + cellPad,
            y: baseline(y, cellSize),
            size: cellSize,
            font,
            color: textColor,
          })
          y += cellSize * 1.35
        })
      })
      cursor += height
    })
    page.drawLine({
      start: { x: margin, y: size.height - cursor },
      end: { x: margin + contentWidth, y: size.height - cursor },
      thickness: 1.2,
      color: colors.heading,
    })
    cursor += 8
  }

  const drawPre = (pre: HTMLElement) => {
    const code = pdfEncode(pre.textContent?.replace(/\n$/, '') ?? '')
    const fontSize = 8.5
    const skip = fontSize * 1.4
    const tint = rgb(
      colors.body.red * 0.06 + colors.background.red * 0.94,
      colors.body.green * 0.06 + colors.background.green * 0.94,
      colors.body.blue * 0.06 + colors.background.blue * 0.94,
    )
    const lines = code.split('\n').flatMap((line) => {
      const run: Run = { text: line || ' ', bold: false, italic: false, code: true, link: false }
      return wrapRuns([run], fonts, fontSize, contentWidth - 16).map((wrapped) => wrapped.map((part) => part.text).join(''))
    })
    for (const line of lines) {
      ensure(skip)
      page.drawRectangle({
        x: margin,
        y: size.height - cursor - skip,
        width: contentWidth,
        height: skip,
        color: tint,
      })
      page.drawText(line || ' ', {
        x: margin + 8,
        y: baseline(cursor, fontSize),
        size: fontSize,
        font: fonts.mono,
        color: colors.heading,
      })
      cursor += skip
    }
    cursor += 10
  }

  const drawBlock = async (element: HTMLElement) => {
    const tag = element.tagName
    if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') {
      const sizes = { H1: recipe.h1, H2: recipe.h2, H3: recipe.h3, H4: recipe.bodySize, H5: recipe.bodySize, H6: recipe.bodySize }
      const fontSize = sizes[tag as keyof typeof sizes]
      const levelColor = tag === 'H1' ? colors.h1 : tag === 'H2' ? colors.h2 : tag === 'H3' ? colors.h3 : colors.heading
      cursor += tag === 'H1' ? 4 : 10
      let runs = inlineRuns(element).map((run) => ({ ...run, bold: true }))
      if (tag === 'H2' && recipe.h2Style === 'uppercase') {
        runs = runs.map((run) => ({ ...run, text: run.text.toUpperCase() }))
      }
      drawParagraph(runs, {
        size: fontSize,
        color: levelColor,
        align: tag === 'H1' ? recipe.h1Align : 'left',
      })
      if (tag === 'H2' && recipe.h2Style === 'rule') {
        page.drawLine({
          start: { x: margin, y: size.height - cursor - 2 },
          end: { x: margin + 36, y: size.height - cursor - 2 },
          thickness: 1.6,
          color: colors.accent,
        })
        cursor += 8
      }
      if (tag === 'H1' && recipe.h1Align === 'center') cursor += 2
      cursor += 4
      return
    }
    if (tag === 'P') {
      const image = element.querySelector(':scope > img')
      if (image instanceof HTMLImageElement && (element.textContent ?? '').trim().length < 40) {
        await drawImage(image)
        return
      }
      drawParagraph(inlineRuns(element), { firstLineIndent: recipe.firstLineIndent })
      cursor += recipe.paragraphGap
      return
    }
    if (tag === 'UL') {
      await drawList(element, false, 0)
      cursor += 4
      return
    }
    if (tag === 'OL') {
      await drawList(element, true, 0)
      cursor += 4
      return
    }
    if (tag === 'BLOCKQUOTE') {
      const start = cursor
      const inner = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      if (inner.length === 0) {
        drawParagraph(inlineRuns(element), { indent: 14, color: colors.muted })
      } else {
        for (const child of inner) {
          if (child.tagName === 'P') drawParagraph(inlineRuns(child), { indent: 14, color: colors.muted })
          else await drawBlock(child)
        }
      }
      const quoteHeight = cursor - start
      if (quoteHeight > 0) {
        page.drawRectangle({
          x: margin,
          y: size.height - cursor,
          width: 2.4,
          height: quoteHeight,
          color: colors.accent,
        })
      }
      cursor += 8
      return
    }
    if (tag === 'PRE') {
      drawPre(element)
      return
    }
    if (tag === 'TABLE') {
      drawTable(element)
      return
    }
    if (tag === 'HR') {
      ensure(16)
      cursor += 8
      page.drawLine({
        start: { x: margin, y: size.height - cursor },
        end: { x: margin + contentWidth, y: size.height - cursor },
        thickness: 0.6,
        color: colors.rule,
      })
      cursor += 10
      return
    }
    if (tag === 'IMG') {
      await drawImage(element as HTMLImageElement)
      return
    }
    if (element.children.length > 0) {
      for (const child of Array.from(element.children)) {
        if (child instanceof HTMLElement) await drawBlock(child)
      }
      return
    }
    if (element.textContent?.trim()) {
      drawParagraph(inlineRuns(element))
      cursor += 6
    }
  }

  const documentRoot = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = documentRoot.getElementById('root')
  if (root) {
    for (const child of Array.from(root.children)) {
      if (child instanceof HTMLElement) await drawBlock(child)
    }
  }

  if (pdf.getPageCount() === 0) addPage()
  const pages = pdf.getPages()
  pages.forEach((pdfPage, index) => {
    drawWatermark(pdfPage, settings, watermarkFont, size.width, size.height)
    if (!tune.pageNumbers || recipe.pageNumber === 'none') return
    const label = String(index + 1)
    const numberSize = 9
    const labelWidth = fonts.body.widthOfTextAtSize(label, numberSize)
    const x = recipe.pageNumber === 'center'
      ? (size.width - labelWidth) / 2
      : size.width - margin - labelWidth
    pdfPage.drawText(label, {
      x,
      y: recipe.chrome === 'folio' ? 28 : 22,
      size: numberSize,
      font: fonts.body,
      color: colors.muted,
    })
  })

  return pdf.save({ useObjectStreams: true })
}
