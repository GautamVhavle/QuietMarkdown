// The error boundary sits above the tree, so the draft has to live outside
// React. App publishes it on every render; a child throw still leaves the
// latest note here for "Download this note".
const CRASH_KEY = 'quietmarkdown:crash-counts'
const QUARANTINE_KEY = 'quietmarkdown:quarantine'

export interface CrashDraft {
  id: string
  title: string
  markdown: string
}

let draft: CrashDraft = { id: '', title: '', markdown: '' }

export function publishCrashDraft(next: CrashDraft): void {
  draft = next
}

export function readCrashDraft(): CrashDraft {
  return draft
}

function readCounts(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(CRASH_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

function writeCounts(counts: Record<string, number>): void {
  try {
    sessionStorage.setItem(CRASH_KEY, JSON.stringify(counts))
  } catch {
    // Session storage can be blocked. The in-memory draft still downloads.
  }
}

export function crashCount(id: string): number {
  if (!id) return 0
  return readCounts()[id] ?? 0
}

export function noteCrash(id: string): number {
  if (!id) return 0
  const counts = readCounts()
  const next = (counts[id] ?? 0) + 1
  counts[id] = next
  writeCounts(counts)
  if (next >= 2) {
    try {
      sessionStorage.setItem(QUARANTINE_KEY, id)
    } catch {
      // Same as above: the fallback UI still refuses to remount this note.
    }
  }
  return next
}

export function clearCrash(id: string): void {
  if (!id) return
  const counts = readCounts()
  if (!counts[id]) return
  delete counts[id]
  writeCounts(counts)
}

export function peekQuarantine(): string | null {
  try {
    return sessionStorage.getItem(QUARANTINE_KEY)
  } catch {
    return null
  }
}

export function clearQuarantineFlag(): void {
  try {
    sessionStorage.removeItem(QUARANTINE_KEY)
  } catch {
    // The crash count still keeps the note from being mounted.
  }
}
