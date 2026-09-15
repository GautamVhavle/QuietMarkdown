/**
 * Curated font library for export fine-tuning.
 *
 * Google Fonts are loaded on demand via <link> tags (display=swap), so the
 * bundle stays small. Each entry carries a web stack for HTML/PNG/preview
 * and a pdf-lib StandardFonts mapping for the real PDF typesetter.
 */
export type PdfFontFamily = 'serif' | 'sans' | 'mono'

export interface ExportFontDef {
  id: string
  label: string
  /** CSS stack used in preview, HTML export, and PNG capture. */
  stack: string
  /** Google Fonts family name for on-demand loading. Null = system stack. */
  google: string | null
  /** pdf-lib base family used when typesetting the real PDF. */
  pdf: PdfFontFamily
}

export const EXPORT_FONTS: ExportFontDef[] = [
  { id: 'alegreya', label: 'Alegreya', stack: "'Alegreya', Georgia, serif", google: 'Alegreya', pdf: 'serif' },
  { id: 'alegreya-sans', label: 'Alegreya Sans', stack: "'Alegreya Sans', 'DM Sans', sans-serif", google: 'Alegreya Sans', pdf: 'sans' },
  { id: 'anonymous-pro', label: 'Anonymous Pro', stack: "'Anonymous Pro', 'DM Mono', monospace", google: 'Anonymous Pro', pdf: 'mono' },
  { id: 'archivo-narrow', label: 'Archivo Narrow', stack: "'Archivo Narrow', 'DM Sans', sans-serif", google: 'Archivo Narrow', pdf: 'sans' },
  { id: 'arvo', label: 'Arvo', stack: "'Arvo', Georgia, serif", google: 'Arvo', pdf: 'serif' },
  { id: 'baloo-2', label: 'Baloo 2', stack: "'Baloo 2', 'DM Sans', sans-serif", google: 'Baloo 2', pdf: 'sans' },
  { id: 'biorhyme', label: 'BioRhyme', stack: "'BioRhyme', Georgia, serif", google: 'BioRhyme', pdf: 'serif' },
  { id: 'bitter', label: 'Bitter', stack: "'Bitter', Georgia, serif", google: 'Bitter', pdf: 'serif' },
  { id: 'cabin', label: 'Cabin', stack: "'Cabin', 'DM Sans', sans-serif", google: 'Cabin', pdf: 'sans' },
  { id: 'cardo', label: 'Cardo', stack: "'Cardo', Georgia, serif", google: 'Cardo', pdf: 'serif' },
  { id: 'chivo', label: 'Chivo', stack: "'Chivo', 'DM Sans', sans-serif", google: 'Chivo', pdf: 'sans' },
  { id: 'cormorant', label: 'Cormorant', stack: "'Cormorant', Georgia, serif", google: 'Cormorant', pdf: 'serif' },
  { id: 'crimson-text', label: 'Crimson Text', stack: "'Crimson Text', Georgia, serif", google: 'Crimson Text', pdf: 'serif' },
  { id: 'dm-sans', label: 'DM Sans', stack: "'DM Sans', Inter, sans-serif", google: null, pdf: 'sans' },
  { id: 'domine', label: 'Domine', stack: "'Domine', Georgia, serif", google: 'Domine', pdf: 'serif' },
  { id: 'eb-garamond', label: 'EB Garamond', stack: "'EB Garamond', Georgia, serif", google: 'EB Garamond', pdf: 'serif' },
  { id: 'eczar', label: 'Eczar', stack: "'Eczar', Georgia, serif", google: 'Eczar', pdf: 'serif' },
  { id: 'fira-sans', label: 'Fira Sans', stack: "'Fira Sans', 'DM Sans', sans-serif", google: 'Fira Sans', pdf: 'sans' },
  { id: 'fraunces', label: 'Fraunces', stack: "'Fraunces', Georgia, serif", google: 'Fraunces', pdf: 'serif' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', stack: "'IBM Plex Mono', 'DM Mono', monospace", google: 'IBM Plex Mono', pdf: 'mono' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', stack: "'IBM Plex Sans', 'DM Sans', sans-serif", google: 'IBM Plex Sans', pdf: 'sans' },
  { id: 'ibm-plex-serif', label: 'IBM Plex Serif', stack: "'IBM Plex Serif', Georgia, serif", google: 'IBM Plex Serif', pdf: 'serif' },
  { id: 'inconsolata', label: 'Inconsolata', stack: "'Inconsolata', 'DM Mono', monospace", google: 'Inconsolata', pdf: 'mono' },
  { id: 'inter', label: 'Inter', stack: "'Inter', 'DM Sans', sans-serif", google: 'Inter', pdf: 'sans' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', stack: "'JetBrains Mono', 'DM Mono', monospace", google: 'JetBrains Mono', pdf: 'mono' },
  { id: 'karla', label: 'Karla', stack: "'Karla', 'DM Sans', sans-serif", google: 'Karla', pdf: 'sans' },
  { id: 'lato', label: 'Lato', stack: "'Lato', 'DM Sans', sans-serif", google: 'Lato', pdf: 'sans' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', stack: "'Libre Baskerville', Georgia, serif", google: 'Libre Baskerville', pdf: 'serif' },
  { id: 'libre-franklin', label: 'Libre Franklin', stack: "'Libre Franklin', 'DM Sans', sans-serif", google: 'Libre Franklin', pdf: 'sans' },
  { id: 'literata', label: 'Literata', stack: "'Literata', Georgia, serif", google: 'Literata', pdf: 'serif' },
  { id: 'lora', label: 'Lora', stack: "'Lora', Georgia, serif", google: 'Lora', pdf: 'serif' },
  { id: 'manrope', label: 'Manrope', stack: "'Manrope', 'DM Sans', sans-serif", google: 'Manrope', pdf: 'sans' },
  { id: 'merriweather', label: 'Merriweather', stack: "'Merriweather', Georgia, serif", google: 'Merriweather', pdf: 'serif' },
  { id: 'montserrat', label: 'Montserrat', stack: "'Montserrat', 'DM Sans', sans-serif", google: 'Montserrat', pdf: 'sans' },
  { id: 'mulish', label: 'Mulish', stack: "'Mulish', 'DM Sans', sans-serif", google: 'Mulish', pdf: 'sans' },
  { id: 'neuton', label: 'Neuton', stack: "'Neuton', Georgia, serif", google: 'Neuton', pdf: 'serif' },
  { id: 'newsreader', label: 'Newsreader', stack: "'Newsreader', Georgia, serif", google: null, pdf: 'serif' },
  { id: 'noto-sans', label: 'Noto Sans', stack: "'Noto Sans', 'DM Sans', sans-serif", google: 'Noto Sans', pdf: 'sans' },
  { id: 'noto-serif', label: 'Noto Serif', stack: "'Noto Serif', Georgia, serif", google: 'Noto Serif', pdf: 'serif' },
  { id: 'nunito-sans', label: 'Nunito Sans', stack: "'Nunito Sans', 'DM Sans', sans-serif", google: 'Nunito Sans', pdf: 'sans' },
  { id: 'open-sans', label: 'Open Sans', stack: "'Open Sans', 'DM Sans', sans-serif", google: 'Open Sans', pdf: 'sans' },
  { id: 'outfit', label: 'Outfit', stack: "'Outfit', 'DM Sans', sans-serif", google: 'Outfit', pdf: 'sans' },
  { id: 'playfair-display', label: 'Playfair Display', stack: "'Playfair Display', Georgia, serif", google: 'Playfair Display', pdf: 'serif' },
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', 'DM Sans', sans-serif", google: 'Plus Jakarta Sans', pdf: 'sans' },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', 'DM Sans', sans-serif", google: 'Poppins', pdf: 'sans' },
  { id: 'proza-libre', label: 'Proza Libre', stack: "'Proza Libre', 'DM Sans', sans-serif", google: 'Proza Libre', pdf: 'sans' },
  { id: 'pt-sans', label: 'PT Sans', stack: "'PT Sans', 'DM Sans', sans-serif", google: 'PT Sans', pdf: 'sans' },
  { id: 'pt-serif', label: 'PT Serif', stack: "'PT Serif', Georgia, serif", google: 'PT Serif', pdf: 'serif' },
  { id: 'raleway', label: 'Raleway', stack: "'Raleway', 'DM Sans', sans-serif", google: 'Raleway', pdf: 'sans' },
  { id: 'roboto', label: 'Roboto', stack: "'Roboto', 'DM Sans', sans-serif", google: 'Roboto', pdf: 'sans' },
  { id: 'roboto-slab', label: 'Roboto Slab', stack: "'Roboto Slab', Georgia, serif", google: 'Roboto Slab', pdf: 'serif' },
  { id: 'rubik', label: 'Rubik', stack: "'Rubik', 'DM Sans', sans-serif", google: 'Rubik', pdf: 'sans' },
  { id: 'sen', label: 'Sen', stack: "'Sen', 'DM Sans', sans-serif", google: 'Sen', pdf: 'sans' },
  { id: 'source-code-pro', label: 'Source Code Pro', stack: "'Source Code Pro', 'DM Mono', monospace", google: 'Source Code Pro', pdf: 'mono' },
  { id: 'source-sans-3', label: 'Source Sans 3', stack: "'Source Sans 3', 'DM Sans', sans-serif", google: 'Source Sans 3', pdf: 'sans' },
  { id: 'source-serif-4', label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", google: 'Source Serif 4', pdf: 'serif' },
  { id: 'space-mono', label: 'Space Mono', stack: "'Space Mono', 'DM Mono', monospace", google: 'Space Mono', pdf: 'mono' },
  { id: 'spectral', label: 'Spectral', stack: "'Spectral', Georgia, serif", google: 'Spectral', pdf: 'serif' },
  { id: 'ubuntu', label: 'Ubuntu', stack: "'Ubuntu', 'DM Sans', sans-serif", google: 'Ubuntu', pdf: 'sans' },
  { id: 'work-sans', label: 'Work Sans', stack: "'Work Sans', 'DM Sans', sans-serif", google: 'Work Sans', pdf: 'sans' },
]

const loadedFonts = new Set<string>()
let fontsBlockedNoticeShown = false

/** Load a Google Font on demand. Safe to call repeatedly; cached per family.
 * Export fonts are the single network call this app ever makes, and only
 * when the user picks a non-bundled font. If the fetch fails (offline,
 * tracker-blocked), the system fallback stack in `stack` still renders. */
export function ensureExportFont(id: string): void {
  const def = EXPORT_FONTS.find((font) => font.id === id)
  if (!def?.google || loadedFonts.has(def.google)) return
  loadedFonts.add(def.google)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(def.google).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap`
  link.onerror = () => {
    if (!fontsBlockedNoticeShown) {
      fontsBlockedNoticeShown = true
      console.info('Export font unavailable; using local fallback stack.')
    }
  }
  document.head.append(link)
}

export function getExportFont(id: string | undefined): ExportFontDef {
  return EXPORT_FONTS.find((font) => font.id === id) ?? EXPORT_FONTS.find((font) => font.id === 'newsreader')!
}
