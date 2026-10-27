// Plain-text PDF used when the full typesetter throws. Skips custom fonts
// and images so a download still happens.
import { PDFDocument, StandardFonts } from 'pdf-lib'

import { pdfEncode } from './pdfEncode'

export async function createPlainTextPdf(title: string, markdown: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title || 'Untitled document')
  pdf.setProducer('QuietMarkdown')
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const width = 595.28
  const height = 841.89
  const margin = 64
  const size = 11
  const leading = 15
  let page = pdf.addPage([width, height])
  let cursor = height - margin
  const maxWidth = width - margin * 2

  const source = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  const draw = (text: string, useBold: boolean) => {
    const face = useBold ? bold : font
    const encoded = pdfEncode(text)
    if (!encoded.trim()) {
      cursor -= leading * 0.65
      return
    }
    const words = encoded.split(/\s+/).filter(Boolean)
    let line = ''
    const flush = (value: string) => {
      if (!value) return
      if (cursor < margin) {
        page = pdf.addPage([width, height])
        cursor = height - margin
      }
      page.drawText(value, { x: margin, y: cursor, size, font: face })
      cursor -= leading
    }
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (face.widthOfTextAtSize(next, size) > maxWidth && line) {
        flush(line)
        line = word
      } else {
        line = next
      }
    }
    if (line && face.widthOfTextAtSize(line, size) > maxWidth) {
      flush(line.slice(0, 80))
      return
    }
    flush(line)
  }

  for (const paragraph of source.split(/\n/)) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(paragraph)
    if (heading) draw(heading[2], true)
    else draw(paragraph.replace(/[*_`]/g, ''), false)
  }

  if (pdf.getPageCount() === 0) pdf.addPage([width, height])
  return pdf.save()
}
