// Document library domain types. Persistence and CRUD live in libraryStore.
export type StorageFailure = 'quota' | 'blocked' | 'corrupt'

export interface LibraryDoc {
  id: string
  title: string
  markdown: string
  updatedAt: number
  /** Body JSON could not be parsed. `markdown` is the raw stored string. */
  corrupt?: boolean
}

export interface Library {
  activeId: string
  docs: LibraryDoc[]
}

export const MAX_LIBRARY_DOCS = 100
