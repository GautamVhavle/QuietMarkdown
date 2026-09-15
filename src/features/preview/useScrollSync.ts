// Proportional editor↔preview scroll sync. The origin ref breaks the
// feedback loop: each side ignores scrolls caused by the other.
import { useRef, type RefObject } from 'react'

export function useScrollSync(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  previewRef: RefObject<HTMLDivElement | null>,
) {
  const originRef = useRef<'editor' | 'preview' | null>(null)

  const syncScrollPosition = (source: HTMLElement, target: HTMLElement) => {
    const sourceRange = source.scrollHeight - source.clientHeight
    const targetRange = target.scrollHeight - target.clientHeight
    if (sourceRange <= 0 || targetRange <= 0) return
    target.scrollTop = (source.scrollTop / sourceRange) * targetRange
  }

  const handleEditorScroll = () => {
    const editor = editorRef.current
    const preview = previewRef.current
    if (!editor || !preview || originRef.current === 'preview') return
    originRef.current = 'editor'
    syncScrollPosition(editor, preview)
    requestAnimationFrame(() => { originRef.current = null })
  }

  const handlePreviewScroll = () => {
    const editor = editorRef.current
    const preview = previewRef.current
    if (!editor || !preview || originRef.current === 'editor') return
    originRef.current = 'preview'
    syncScrollPosition(preview, editor)
    requestAnimationFrame(() => { originRef.current = null })
  }

  return { handleEditorScroll, handlePreviewScroll }
}
