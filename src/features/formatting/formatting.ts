// Markdown formatting operations. Each takes explicit state and a
// setEditorValue callback; no hook internals, so toolbar and shortcuts
// share one implementation.
export type FormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'link'
  | 'code'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'bullet'
  | 'number'
  | 'task'
  | 'table'
  | 'image'
  | 'divider'

export function applyFormat(
  action: FormatAction,
  markdown: string,
  editor: HTMLTextAreaElement | null,
  setEditorValue: (next: string, selectionStart: number, selectionEnd: number) => void,
) {
  if (!editor) return
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const selected = markdown.slice(start, end)

  const insert = (value: string, selectionOffset = value.length, selectedLength = 0) => {
    setEditorValue(
      `${markdown.slice(0, start)}${value}${markdown.slice(end)}`,
      start + selectionOffset,
      start + selectionOffset + selectedLength,
    )
  }
  const wrap = (before: string, after: string, placeholder: string) => {
    const value = selected || placeholder
    const replacement = `${before}${value}${after}`
    insert(replacement, before.length, value.length)
  }

  if (action === 'bold') return wrap('**', '**', 'bold text')
  if (action === 'italic') return wrap('_', '_', 'italic text')
  if (action === 'strike') return wrap('~~', '~~', 'strikethrough')
  if (action === 'link') return wrap('[', '](https://)', selected || 'link text')
  if (action === 'image') return wrap('![', '](https://)', selected || 'image description')
  if (action === 'code') {
    return selected.includes('\n')
      ? wrap('```\n', '\n```', 'code')
      : wrap('`', '`', 'code')
  }
  if (action === 'table') {
    const table = `${start > 0 ? '\n\n' : ''}| Column one | Column two |\n| --- | --- |\n| Value | Value |\n\n`
    return insert(table, table.indexOf('Column one'), 'Column one'.length)
  }
  if (action === 'divider') {
    const divider = `${start > 0 ? '\n\n' : ''}---\n\n`
    return insert(divider)
  }

  const lineStart = markdown.lastIndexOf('\n', start - 1) + 1
  const nextLine = markdown.indexOf('\n', end)
  const lineEnd = nextLine === -1 ? markdown.length : nextLine
  const block = markdown.slice(lineStart, lineEnd)
  const prefixes = {
    heading1: '# ',
    heading2: '## ',
    heading3: '### ',
    quote: '> ',
    bullet: '- ',
    number: '1. ',
    task: '- [ ] ',
  } as const
  const prefix = prefixes[action]
  const transformed = block
    .split('\n')
    .map((line, index) => {
      const clean = line.replace(/^(#{1,6}\s+|>\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/, '')
      if (action === 'number') return `${index + 1}. ${clean}`
      return `${prefix}${clean}`
    })
    .join('\n')
  setEditorValue(
    `${markdown.slice(0, lineStart)}${transformed}${markdown.slice(lineEnd)}`,
    lineStart,
    lineStart + transformed.length,
  )
}
