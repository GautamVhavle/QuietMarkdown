// WinAnsi text encoding for pdf-lib's standard fonts, plus image embedding.
// Standard PDF fonts only encode WinAnsi: map punctuation, drop the rest.
// Embedded TTF subsets (see pdfFontFetch) accept full Unicode, so callers
// use encodeFor(fonts, text) to pick per active font set.
import type { PDFDocument} from 'pdf-lib';
import { rgb, type PDFImage, type RGB } from 'pdf-lib'

import type { FontSet } from './pdfFonts'

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

/** Encode text for the active font set. Embedded TTF subsets render full
 * Unicode (tabs still expand); standard-font fallback needs WinAnsi. */
export function encodeFor(fonts: FontSet, text: string): string {
  if (fonts.unicode) return text.replaceAll('\t', '  ')
  return pdfEncode(text)
}

export function hexRgb(hex: string): RGB {
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

export async function embedImage(pdf: PDFDocument, src: string): Promise<PDFImage | null> {
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
