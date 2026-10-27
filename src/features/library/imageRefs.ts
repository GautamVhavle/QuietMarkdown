// Image bytes leave the Markdown as soon as they are stored. The note keeps
// a short reference (`qm-image:<id>`) and the bytes live in IndexedDB.
const DATA_IMAGE = /!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/g
const IMAGE_REF = /qm-image:(img-[a-z0-9-]+)/g

export interface DetachedImage {
  id: string
  dataUrl: string
}

export function imageIdFor(dataUrl: string): string {
  let hash = 2166136261
  for (let index = 0; index < dataUrl.length; index += 1) {
    hash ^= dataUrl.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `img-${(hash >>> 0).toString(16)}-${dataUrl.length.toString(36)}`
}

export function detachDataUrls(markdown: string): { markdown: string; images: DetachedImage[] } {
  const images: DetachedImage[] = []
  const seen = new Set<string>()
  const next = markdown.replace(DATA_IMAGE, (match, alt: string, dataUrl: string) => {
    if (/[\r\n]/.test(match)) return match
    const id = imageIdFor(dataUrl)
    if (!seen.has(id)) {
      seen.add(id)
      images.push({ id, dataUrl })
    }
    return `![${alt}](qm-image:${id})`
  })
  return { markdown: next, images }
}

export function imageIdsIn(markdown: string): string[] {
  return [...markdown.matchAll(IMAGE_REF)].map((match) => match[1])
}

export function expandImageRefs(markdown: string, urls: Record<string, string>): string {
  if (!markdown.includes('qm-image:')) return markdown
  return markdown.replace(IMAGE_REF, (match, id: string) => urls[id] ?? match)
}
