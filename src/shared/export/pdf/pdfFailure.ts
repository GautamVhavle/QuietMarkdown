export type PdfFailureKind = 'font' | 'empty' | 'memory' | 'typeset'

export function classifyPdfError(error: unknown): PdfFailureKind {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/no pages|empty page|produced no pages/i.test(message)) return 'empty'
  if (
    name === 'QuotaExceededError'
    || name === 'RangeError'
    || /memory|allocation|out of memory|invalid string length|too large/i.test(message)
  ) return 'memory'
  if (/font/i.test(message)) return 'font'
  return 'typeset'
}

export function fontFallbackLabel(family: 'serif' | 'sans' | 'mono'): string {
  if (family === 'sans') return 'Helvetica'
  if (family === 'mono') return 'Courier'
  return 'Georgia'
}
