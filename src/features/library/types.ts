// Document library domain types. Persistence and CRUD live in libraryStore.
export interface LibraryDoc {
  id: string
  title: string
  markdown: string
  updatedAt: number
}

export interface Library {
  activeId: string
  docs: LibraryDoc[]
}

export const MAX_LIBRARY_DOCS = 100
