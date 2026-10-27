import type { StorageFailure } from '../library/types'

export type { StorageFailure }

export function saveFailureMessage(failure: StorageFailure): string {
  switch (failure) {
    case 'quota':
      return 'Storage is full. Download this note, or remove an image.'
    case 'blocked':
      return 'This browser blocked saving. Download this note.'
    case 'corrupt':
      return 'This note could not be saved. Download this note.'
    default: {
      const neverFailure: never = failure
      return neverFailure
    }
  }
}

export function saveStatusText(
  state: 'saved' | 'saving' | 'error',
  failure: StorageFailure | null,
): string {
  if (state === 'saving') return 'Saving'
  if (state === 'error') return failure ? saveFailureMessage(failure) : 'This note could not be saved. Download this note.'
  return 'Saved in this browser.'
}
