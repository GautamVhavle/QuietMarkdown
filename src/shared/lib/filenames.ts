export function safeFilename(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'untitled'
  )
}

// Derive a short, human filename from the document itself: the first `# H1`
// wins; otherwise the first non-empty line. Limited to ~6 words so an
// accidental sentence-long heading never becomes a sentence-long filename.
// Falls back to the library title, then 'untitled'.
export function smartFilename(markdown: string, fallbackTitle: string): string {
  const lines = markdown.split(/\r?\n/)
  let candidate = ''
  for (const line of lines) {
    const heading = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/)
    if (heading?.[1]?.trim()) {
      candidate = heading[1].trim()
      break
    }
  }
  if (!candidate) {
    for (const line of lines) {
      const stripped = line
        .replace(/^\s*(#{1,6}|>|-|\*|\+|\d+[.)])\s*/, '')
        .replace(/[*_`~[\]()!<>]+/g, '')
        .trim()
      if (stripped) {
        candidate = stripped
        break
      }
    }
  }
  if (!candidate) candidate = fallbackTitle
  const words = candidate.split(/\s+/).filter(Boolean).slice(0, 6).join(' ')
  return safeFilename(words)
}
