// Image embedding: files become local data URLs inserted on their own
// line. GIFs keep raw bytes (canvas would keep only the first frame);
// other rasters downscale through canvas (max 1600px).
import type { RefObject } from 'react'

import { collapseImageUrls, mapDisplayCaretToReal } from '../editor/imagePlaceholders'

export function useImageEmbed(
  markdown: string,
  editorRef: RefObject<HTMLTextAreaElement | null>,
  setEditorValue: (next: string, selectionStart: number, selectionEnd: number) => void,
  onToast: (message: string) => void,
) {
  const insertIntoEditor = (snippet: string) => {
    // The textarea shows collapsed placeholders, so translate its caret
    // through the display text to find the matching offset in real markdown.
    const area = editorRef.current
    const display = collapseImageUrls(markdown)
    const caret = area ? Math.min(area.selectionStart ?? display.length, display.length) : display.length
    const endCaret = area ? Math.min(area.selectionEnd ?? caret, display.length) : caret
    const realStart = mapDisplayCaretToReal(display, markdown, caret)
    const realEnd = realStart + (endCaret - caret)
    const before = markdown.slice(0, realStart)
    const after = markdown.slice(realEnd)
    // Keep Markdown tidy: embedded images sit on their own line.
    const prefix = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const cursor = before.length + prefix.length + snippet.length + 2
    setEditorValue(`${before}${prefix}${snippet}\n\n${after}`, cursor, cursor)
  }

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })

  const embedImageFile = async (file: File): Promise<void> => {
    try {
      let dataUrl: string
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        dataUrl = await readAsDataUrl(file)
      } else {
        // Primary decode path; falls back to <img> because createImageBitmap
        // rejects some images browsers happily render (lenient CRCs, etc).
        let sourceWidth = 0
        let sourceHeight = 0
        let drawable: ImageBitmap | HTMLImageElement | null = null
        try {
          const bitmap = await createImageBitmap(file)
          drawable = bitmap
          sourceWidth = bitmap.width
          sourceHeight = bitmap.height
        } catch {
          drawable = null
        }
        if (!drawable) {
          const objectUrl = URL.createObjectURL(file)
          try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
              const element = new Image()
              element.onload = () => resolve(element)
              element.onerror = () => reject(new Error('image could not be decoded'))
              element.src = objectUrl
            })
            drawable = image
            sourceWidth = image.naturalWidth
            sourceHeight = image.naturalHeight
          } finally {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
          }
        }
        if (!drawable || sourceWidth === 0 || sourceHeight === 0) throw new Error('undecodable image')

        const maxDim = 1600
        const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(sourceWidth * scale))
        canvas.height = Math.max(1, Math.round(sourceHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas unavailable')
        context.drawImage(drawable, 0, 0, canvas.width, canvas.height)
        if ('close' in drawable && typeof drawable.close === 'function') drawable.close()
        // PNG keeps crisp text and diagrams; JPEG keeps photos small.
        const preferPng = file.type === 'image/png' && file.size < 300_000
        dataUrl = canvas.toDataURL(preferPng ? 'image/png' : 'image/jpeg', 0.85)
      }
      if (dataUrl.length > 3_000_000) {
        onToast('Image is too large to embed locally')
        return
      }
      const name = file.name && !file.name.startsWith('blob') ? file.name.replace(/\.[a-z0-9]+$/i, '') : 'embedded image'
      insertIntoEditor(`![${name}](${dataUrl})`)
      onToast('Image embedded in the document')
    } catch {
      onToast('This image could not be embedded')
    }
  }

  return { insertIntoEditor, embedImageFile }
}
