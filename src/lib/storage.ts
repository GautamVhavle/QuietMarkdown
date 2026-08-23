/**
 * Local storage access that never throws.
 *
 * Browsers reject writes when storage is full or blocked (private mode,
 * disabled site data). A bare `localStorage.setItem` call would throw an
 * uncaught QuotaExceededError and the editor would keep showing "Saving"
 * forever. Every read/write goes through here so the UI can react honestly.
 */

export type StorageResult = { ok: true } | { ok: false; error: 'quota' | 'blocked' | 'serialize' }

const isQuotaError = (error: unknown): boolean => {
  const domException = error as { name?: string; code?: number }
  return (
    domException?.name === 'QuotaExceededError'
    || domException?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || domException?.code === 22
    || domException?.code === 1014
  )
}

export function readStorageJson<T>(key: string): { value: T | null; corrupted: boolean } {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { value: null, corrupted: false }
    try {
      return { value: JSON.parse(raw) as T, corrupted: false }
    } catch {
      // Valid key, invalid JSON — treat as corrupted rather than crashing.
      return { value: null, corrupted: true }
    }
  } catch {
    // Reading can throw in some hardened browser configurations.
    return { value: null, corrupted: false }
  }
}

export function writeStorageJson(key: string, value: unknown): StorageResult {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    return { ok: false, error: 'serialize' }
  }
  try {
    localStorage.setItem(key, serialized)
    return { ok: true }
  } catch (error) {
    if (isQuotaError(error)) return { ok: false, error: 'quota' }
    return { ok: false, error: 'blocked' }
  }
}

export function removeStorageKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing sensible to do; removal failures are harmless.
  }
}
