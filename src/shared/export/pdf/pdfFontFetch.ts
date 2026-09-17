// TrueType font fetching + embedding for the real PDF typesetter.
// Fonts come from the fontsource CDN (same files the preview uses via
// Google Fonts), so the PDF matches the HTML preview glyph-for-glyph.
// Cached per family+style; falls back to standard fonts offline.
import fontkit from '@pdf-lib/fontkit'
import type { PDFDocument, PDFFont } from 'pdf-lib'

import type { ExportFontDef } from '../../lib/fonts'

interface CachedBytes {
  promise: Promise<ArrayBuffer | null>
}

const bytesCache = new Map<string, CachedBytes>()
const fontkitDocs = new WeakSet<PDFDocument>()

function ensureFontkit(pdf: PDFDocument) {
  if (!fontkitDocs.has(pdf)) {
    pdf.registerFontkit(fontkit)
    fontkitDocs.add(pdf)
  }
}

async function fetchTtf(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

function fetchFaceBytes(slug: string, file: string): Promise<ArrayBuffer | null> {
  const key = `${slug}/${file}`
  const hit = bytesCache.get(key)
  if (hit) return hit.promise
  const promise = fetchTtf(`https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/${file}`)
  bytesCache.set(key, { promise })
  return promise
}

/** Embed one TTF face, or null when offline / missing (caller falls back). */
async function embedFace(pdf: PDFDocument, slug: string, file: string): Promise<PDFFont | null> {
  ensureFontkit(pdf)
  const bytes = await fetchFaceBytes(slug, file)
  if (!bytes) return null
  try {
    return await pdf.embedFont(bytes.slice(0), { subset: true })
  } catch {
    return null
  }
}

function slugOf(def: ExportFontDef): string {
  return def.id
}

export interface EmbeddedFaces {
  regular: PDFFont | null
  bold: PDFFont | null
  italic: PDFFont | null
  boldItalic: PDFFont | null
}

/** Fetch + embed regular/bold/italic/bold-italic for a body + heading pair.
 * Missing faces (offline, or a family without italics) resolve to null and
 * the caller substitutes the nearest available face. */
export async function embedFontFaces(
  pdf: PDFDocument,
  body: ExportFontDef,
  heading: ExportFontDef,
): Promise<{ body: EmbeddedFaces; heading: EmbeddedFaces }> {
  const load = async (def: ExportFontDef): Promise<EmbeddedFaces> => {
    const slug = slugOf(def)
    const [regular, bold, italic, boldItalic] = await Promise.all([
      embedFace(pdf, slug, 'latin-400-normal.ttf'),
      embedFace(pdf, slug, 'latin-700-normal.ttf'),
      embedFace(pdf, slug, 'latin-400-italic.ttf'),
      embedFace(pdf, slug, 'latin-700-italic.ttf'),
    ])
    return { regular, bold, italic, boldItalic }
  }
  const [bodyFaces, headingFaces] = await Promise.all([load(body), load(heading)])
  return { body: bodyFaces, heading: headingFaces }
}

/** Clear the in-memory TTF cache. Exported for unit tests only. */
export function clearFontCacheForTests() {
  bytesCache.clear()
}
