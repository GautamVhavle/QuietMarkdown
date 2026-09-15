import type * as PdfJs from 'pdfjs-dist'

import { createMarkdownPdf } from '../../shared/export/pdf/pdfDocument'
import type { ExportSettings } from '../../shared/settings/exportSettings'


let pdfjsPromise: Promise<typeof PdfJs> | null = null

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(async (module) => {
      const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string
      module.GlobalWorkerOptions.workerSrc = worker
      return module
    })
  }
  return pdfjsPromise
}

/**
 * Render the real PDF bytes to PNG images, one per page. This guarantees
 * PNG splits match the downloaded PDF exactly, unlike HTML screenshots.
 */
export async function renderPdfToPngs(
  title: string,
  rendered: string,
  settings: ExportSettings,
  scale = 2,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob[]> {
  const bytes = await createMarkdownPdf(title, rendered, settings)
  if (bytes.byteLength < 8) throw new Error('PDF export produced no pages')
  const pdfjs = await loadPdfJs()
  const pdf = await pdfjs.getDocument({ data: bytes.slice().buffer as ArrayBuffer }).promise
  const blobs: Blob[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PNG encoding failed'))), 'image/png')
    })
    blobs.push(blob)
    onProgress?.(pageNumber, pdf.numPages)
    page.cleanup()
  }
  await pdf.cleanup()
  return blobs
}

export async function renderPdfPreviewUrls(
  rendered: string,
  settings: ExportSettings,
  signal?: { cancelled: boolean },
): Promise<Array<{ url: string; width: number; height: number }>> {
  const bytes = await createMarkdownPdf('preview', rendered, settings)
  const pdfjs = await loadPdfJs()
  const pdf = await pdfjs.getDocument({ data: bytes.slice().buffer as ArrayBuffer }).promise
  const images: Array<{ url: string; width: number; height: number }> = []
  const previewScale = 1.1
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    if (signal?.cancelled) break
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: previewScale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) continue
    await page.render({ canvas, canvasContext: context, viewport }).promise
    images.push({ url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height })
    page.cleanup()
  }
  await pdf.cleanup()
  return images
}
