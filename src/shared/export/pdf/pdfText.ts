// Inline runs: HTML → styled runs → wrapped lines. Uses the browser's own
// font metrics via pdf-lib, so a split never lands inside a glyph.
import type { PDFFont } from 'pdf-lib'

import { pdfEncode } from './pdfEncode'
import type { FontSet } from './pdfFonts'

export interface Run {
  text: string
  bold: boolean
  italic: boolean
  code: boolean
  link: boolean
}

export function fontFor(fonts: FontSet, run: Run): PDFFont {
  if (run.code) return run.bold ? fonts.monoBold : fonts.mono
  if (run.bold && run.italic) return fonts.boldItalic
  if (run.bold) return fonts.bold
  if (run.italic) return fonts.italic
  return fonts.body
}

export function measure(fonts: FontSet, run: Run, size: number): number {
  const text = pdfEncode(run.text)
  if (!text) return 0
  return fontFor(fonts, run).widthOfTextAtSize(text, size)
}

export function wrapRuns(runs: Run[], fonts: FontSet, size: number, maxWidth: number): Run[][] {
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

export function inlineRuns(node: Node): Run[] {
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
