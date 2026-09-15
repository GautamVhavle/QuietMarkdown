// Find & replace over the real markdown. Matches are character offsets,
// so selection and replacement splice the source directly.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

export interface TextMatch {
  start: number
  end: number
}

export function useFindReplace(
  markdown: string,
  editorRef: RefObject<HTMLTextAreaElement | null>,
) {
  const [findPanel, setFindPanel] = useState<'closed' | 'find' | 'replace'>('closed')
  const [findQuery, setFindQuery] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [matchIndex, setMatchIndex] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)

  const matches: TextMatch[] = useMemo(() => {
    if (!findQuery) return []
    const found: TextMatch[] = []
    const haystack = matchCase ? markdown : markdown.toLowerCase()
    const needle = matchCase ? findQuery : findQuery.toLowerCase()
    let cursor = 0
    while (found.length < 2000) {
      const index = haystack.indexOf(needle, cursor)
      if (index === -1) break
      found.push({ start: index, end: index + needle.length })
      cursor = index + Math.max(1, needle.length)
    }
    return found
  }, [markdown, findQuery, matchCase])

  // Derived clamp keeps the active match valid as the query or text changes.
  const safeMatchIndex = matches.length === 0 ? 0 : matchIndex % matches.length

  useEffect(() => {
    if (findPanel === 'closed') return
    findInputRef.current?.focus()
    findInputRef.current?.select()
  }, [findPanel])

  const gotoMatch = (offset: number) => {
    if (matches.length === 0) return
    const nextIndex = (safeMatchIndex + offset + matches.length) % matches.length
    setMatchIndex(nextIndex)
    const match = matches[nextIndex]
    const area = editorRef.current
    if (!area) return
    area.focus()
    area.setSelectionRange(match.start, match.end)
    // Scroll the matched line into view.
    const line = markdown.slice(0, match.start).split('\n').length
    area.scrollTop = Math.max(0, (line - 4) * 27)
  }

  const openFindPanel = (mode: 'find' | 'replace') => {
    setFindPanel(mode)
    // Seed the query with the current selection when there is one.
    const area = editorRef.current
    const selected = area ? markdown.slice(area.selectionStart, area.selectionEnd) : ''
    if (selected && !selected.includes('\n')) setFindQuery(selected)
    setMatchIndex(0)
  }

  return {
    findPanel,
    setFindPanel,
    findQuery,
    setFindQuery,
    replaceWith,
    setReplaceWith,
    matchCase,
    setMatchCase,
    matchIndex,
    setMatchIndex,
    matches,
    safeMatchIndex,
    findInputRef,
    gotoMatch,
    openFindPanel,
  }
}
