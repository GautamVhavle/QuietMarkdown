// Every localStorage key in one place. Values and schema are owned by
// their feature; this module only fixes the key strings.
export const WELCOME_KEY = 'quietmarkdown:welcome:v1'
/** Single-blob library. Read only to migrate into the v2 index. */
export const LIBRARY_KEY = 'quietmarkdown:library:v1'
/** Index of id, title, updated time, and schema version. Bodies live on their own keys. */
export const LIBRARY_INDEX_KEY = 'quietmarkdown:library:v2'
export const LIBRARY_SCHEMA_VERSION = 2
export const DOC_BODY_PREFIX = 'quietmarkdown:doc:'
export const LEGACY_DOCUMENT_KEY = 'quietmarkdown:document:v1'
export const LEGACY_DOCUMENT_KEY_V2 = 'quietmarkdown:document:v2'
export const SETTINGS_KEY = 'quietmarkdown:export:v2'
export const LEGACY_SETTINGS_KEY = 'quietmarkdown:export:v1'
export const THEME_KEY = 'quietmarkdown:theme:v1'
export const PAGE_PREVIEW_KEY = 'quietmarkdown:page-preview:v1'
