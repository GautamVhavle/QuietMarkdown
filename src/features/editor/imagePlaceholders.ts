// Display mapping for embedded images. The textarea shows a short
// placeholder per image line; state, preview, and exports keep the full
// data URL. Placeholders round-trip by position: survivors restore their
// URL, deleted ones stay deleted, user-typed ones stay as typed.
export const IMAGE_URL_PATTERN = /!\[[^\]]*\]\((data:image\/[^)\s]+|blob:[^)\s]+)\)/g
export const COLLAPSED_PATTERN = /!\[[^\]]*\]\(embedded:image\)/g

// Collapse pasted-image data URLs to a short placeholder for display only.
// A data URL split across lines stays visible as raw text instead of
// silently dropping the image on the way back.
export function collapseImageUrls(source: string): string {
  return source.replace(IMAGE_URL_PATTERN, (match) => {
    if (/[\r\n]/.test(match)) return match
    const alt = match.slice(2, match.indexOf(']')).trim() || 'image'
    return `![${alt}](embedded:image)`
  })
}

export function expandImageUrls(displayValue: string, realMarkdown: string): string {
  const realMatches = [...realMarkdown.matchAll(IMAGE_URL_PATTERN)]
    .map((match) => match[0])
    .filter((url) => !/[\r\n]/.test(url))
  if (realMatches.length === 0) return displayValue
  let index = 0
  return displayValue.replace(COLLAPSED_PATTERN, () => realMatches[index++] ?? '')
}

// Translate a caret in collapsed display coordinates to the matching offset
// in real markdown. Needed because the textarea reports display offsets
// while inserts must splice the real string.
export function mapDisplayCaretToReal(display: string, real: string, caret: number): number {
  let di = 0
  let ri = 0
  IMAGE_URL_PATTERN.lastIndex = 0
  const nextMatch = (): RegExpExecArray | null => {
    let match = IMAGE_URL_PATTERN.exec(real)
    while (match && /[\r\n]/.test(match[0])) match = IMAGE_URL_PATTERN.exec(real)
    return match
  }
  let pending = nextMatch()
  while (di < caret) {
    if (pending && ri === pending.index) {
      const alt = pending[0].slice(2, pending[0].indexOf(']')).trim() || 'image'
      const placeholder = `![${alt}](embedded:image)`
      if (di + placeholder.length > caret) break
      di += placeholder.length
      ri += pending[0].length
      pending = nextMatch()
    } else {
      const stop = pending ? Math.min(pending.index, real.length) : real.length
      const step = Math.min(stop - ri, caret - di)
      di += step
      ri += step
    }
  }
  void display
  return ri
}
