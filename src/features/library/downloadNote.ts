// Turn a stored note into a Markdown file the reader can open elsewhere.
// Image references are expanded back to bytes when this browser still has them.
import { downloadBlob } from '../../shared/lib/download'
import { smartFilename } from '../../shared/lib/filenames'

import { expandImageRefs, imageIdsIn } from './imageRefs'
import { getImage, peekImage } from './imageStore'

export async function expandStoredImages(markdown: string): Promise<string> {
  const ids = imageIdsIn(markdown)
  if (ids.length === 0) return markdown
  const urls: Record<string, string> = {}
  await Promise.all(ids.map(async (id) => {
    const url = peekImage(id) ?? await getImage(id)
    if (url) urls[id] = url
  }))
  return expandImageRefs(markdown, urls)
}

export async function downloadNote(title: string, markdown: string): Promise<void> {
  const expanded = await expandStoredImages(markdown)
  downloadBlob(expanded, `${smartFilename(expanded, title)}.md`, 'text/markdown;charset=utf-8')
}
