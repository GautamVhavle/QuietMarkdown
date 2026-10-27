// Image bytes live in IndexedDB so a few screenshots cannot fill the
// localStorage quota that the notes themselves need.
import { storageFailureFrom, type StorageResult } from '../../shared/lib/storage'

import type { DetachedImage } from './imageRefs'

const DB_NAME = 'quietmarkdown'
const STORE = 'images'

const memory = new Map<string, string>()
let dbPromise: Promise<IDBDatabase> | null = null
let chain: Promise<unknown> = Promise.resolve()
let failedImages: DetachedImage[] = []

export function rememberImage(id: string, dataUrl: string): void {
  memory.set(id, dataUrl)
}

export function peekImage(id: string): string | undefined {
  return memory.get(id)
}

export function resetImageStoreForTests(): void {
  memory.clear()
  dbPromise = null
  chain = Promise.resolve()
  failedImages = []
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = null
        reject(request.error ?? new Error('IndexedDB open failed'))
      }
    })
  }
  return dbPromise
}

export async function putImage(id: string, dataUrl: string): Promise<StorageResult> {
  rememberImage(id, dataUrl)
  if (typeof indexedDB === 'undefined') {
    // shortcut: memory map when IndexedDB is missing (unit tests). Browsers have it.
    return import.meta.env.MODE === 'test' ? { ok: true } : { ok: false, error: 'blocked' }
  }
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'))
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: storageFailureFrom(error) }
  }
}

export async function getImage(id: string): Promise<string | null> {
  const cached = memory.get(id)
  if (cached) return cached
  if (typeof indexedDB === 'undefined') return null
  try {
    const db = await openDb()
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (typeof value !== 'string') return null
    memory.set(id, value)
    return value
  } catch {
    return null
  }
}

export async function storeImages(images: DetachedImage[]): Promise<'quota' | 'blocked' | null> {
  let error: 'quota' | 'blocked' | null = null
  const stillFailed: DetachedImage[] = []
  for (const image of images) {
    const result = await putImage(image.id, image.dataUrl)
    if (!result.ok) {
      error = result.error === 'quota' ? 'quota' : 'blocked'
      stillFailed.push(image)
    }
  }
  const written = new Set(images.map((image) => image.id))
  failedImages = [
    ...failedImages.filter((image) => !written.has(image.id)),
    ...stillFailed,
  ]
  return error
}

export function enqueueImages(images: DetachedImage[]): Promise<'quota' | 'blocked' | null> {
  if (images.length === 0) return Promise.resolve(null)
  for (const image of images) rememberImage(image.id, image.dataUrl)
  const job = storeImages(images)
  chain = chain.then(() => job)
  return job
}

export function retryFailedImages(): Promise<'quota' | 'blocked' | null> {
  if (failedImages.length === 0) return Promise.resolve(null)
  return enqueueImages(failedImages)
}

export function imageWrites(): Promise<unknown> {
  return chain
}
