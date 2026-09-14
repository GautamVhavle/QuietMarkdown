import { useLayoutEffect, useRef, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent } from 'react'

const IMAGE_URL_PATTERN = /!\[[^\]]*\]\((data:image\/[^)\s]+|blob:[^)\s]+)\)/g

interface ImageChip {
  key: number
  alt: string
  top: number
  height: number
}

interface ImageAwareEditorProps {
  markdown: string
  editorRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onScroll: () => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (event: ReactClipboardEvent<HTMLTextAreaElement>) => void
}

/**
 * The textarea always holds the REAL markdown (full data URLs), so edits,
 * cursor positions, undo, and exports behave exactly like plain text.
 * A transparent overlay draws compact chips over image-URL lines so the
 * document stays readable. Chips are pointer-transparent except for the
 * remove button, so clicks and caret placement fall through to the text.
 */
export function ImageAwareEditor({
  markdown,
  editorRef,
  onChange,
  onScroll,
  onKeyDown,
  onPaste,
}: ImageAwareEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const area = editorRef.current
    const mirror = mirrorRef.current
    const overlay = overlayRef.current
    if (!area || !mirror || !overlay) return

    const computed = window.getComputedStyle(area)
    mirror.style.font = computed.font
    mirror.style.lineHeight = computed.lineHeight
    mirror.style.letterSpacing = computed.letterSpacing
    mirror.style.padding = computed.padding
    mirror.style.width = `${area.clientWidth}px`
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordBreak = 'break-word'

    // Mirror the text with image URLs replaced by spaces of equal length,
    // so line wrapping matches the textarea exactly.
    const masked = markdown.replace(IMAGE_URL_PATTERN, (match) => ' '.repeat(match.length))
    mirror.textContent = ''
    const lines = masked.split('\n')
    const chips: ImageChip[] = []
    let key = 0
    lines.forEach((line) => {
      const row = document.createElement('div')
      row.className = 'image-mirror-line'
      row.textContent = line || ' '
      mirror.append(row)
    })

    // Measure each image line's box in mirror coordinates.
    const rows = mirror.querySelectorAll('.image-mirror-line')
    const mirrorRect = mirror.getBoundingClientRect()
    IMAGE_URL_PATTERN.lastIndex = 0
    let urlMatch: RegExpExecArray | null
    while ((urlMatch = IMAGE_URL_PATTERN.exec(markdown)) !== null) {
      const before = markdown.slice(0, urlMatch.index)
      const lineIndex = before.split('\n').length - 1
      const row = rows[lineIndex] as HTMLElement | undefined
      if (row) {
        const rect = row.getBoundingClientRect()
        const alt = urlMatch[0].slice(2, urlMatch[0].indexOf(']')).trim() || 'image'
        chips.push({
          key: key++,
          alt,
          top: rect.top - mirrorRect.top,
          height: Math.max(rect.height, 22),
        })
      }
      if (urlMatch[0].length === 0) IMAGE_URL_PATTERN.lastIndex += 1
    }

    overlay.innerHTML = ''
    const scrollTop = area.scrollTop
    for (const chip of chips) {
      const el = document.createElement('div')
      el.className = 'image-chip'
      el.style.top = `${chip.top - scrollTop}px`
      el.style.height = `${chip.height}px`
      const label = document.createElement('span')
      label.className = 'image-chip-label'
      const icon = document.createElement('span')
      icon.className = 'image-chip-icon'
      icon.textContent = '▦'
      const text = document.createElement('span')
      text.textContent = chip.alt
      label.append(icon, text)
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'image-chip-remove'
      remove.textContent = '×'
      remove.setAttribute('aria-label', `Remove image ${chip.alt}`)
      remove.addEventListener('mousedown', (event) => event.preventDefault())
      remove.addEventListener('click', () => {
        const current = editorRef.current?.value ?? markdown
        IMAGE_URL_PATTERN.lastIndex = 0
        let index = 0
        const next = current.replace(IMAGE_URL_PATTERN, (match) => {
          const keep = index !== chip.key
          index += 1
          return keep ? match : ''
        })
        // Collapse leftover blank lines from the removal.
        onChange(next.replace(/\n{3,}/g, '\n\n'))
        requestAnimationFrame(() => editorRef.current?.focus())
      })
      el.append(label, remove)
      overlay.append(el)
    }
  }, [markdown, editorRef, onChange])

  const syncOverlayScroll = () => {
    const area = editorRef.current
    const overlay = overlayRef.current
    if (!area || !overlay) return
    overlay.style.transform = `translateY(${-area.scrollTop}px)`
    onScroll()
  }

  return (
    <div className="image-editor-wrap">
      <textarea
        ref={editorRef}
        value={markdown}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncOverlayScroll}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        spellCheck="true"
        autoCapitalize="sentences"
        aria-label="Markdown content"
      />
      <div ref={mirrorRef} className="image-mirror" aria-hidden="true" />
      <div ref={overlayRef} className="image-chip-layer" aria-hidden="true" />
    </div>
  )
}
