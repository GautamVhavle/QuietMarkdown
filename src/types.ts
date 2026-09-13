export type ViewMode = 'write' | 'split' | 'preview'
export type Theme = 'light' | 'dark'
export type ExportPreset =
  | 'editorial'
  | 'minimal'
  | 'academic'
  | 'manuscript'
  | 'swiss'
  | 'letterpress'
  | 'executive'
  | 'notebook'
export type PdfTemplateId =
  | 'novel'
  | 'brief'
  | 'thesis'
  | 'memo'
  | 'field-notes'
  | 'letter'
  | 'technical'
  | 'magazine'
export type PaperSize = 'a5' | 'a4' | 'a3' | 'letter' | 'legal' | 'tabloid'
export type PageOrientation = 'portrait' | 'landscape'
export type MarginPreset = 'narrow' | 'normal' | 'wide'
export type HeadingColorMode = 'same' | 'each'
export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'tiled'

export interface WatermarkSettings {
  enabled: boolean
  text: string
  position: WatermarkPosition
  opacity: number
  size: number
  rotation: number
  color: string
}

export interface FineTuneSettings {
  bodyFont: string
  bodyColor: string
  headingFont: string
  headingColor: string
  headingColorMode: HeadingColorMode
  h1Color: string
  h2Color: string
  h3Color: string
  linkColor: string
  paper: PaperSize
  marginPreset: MarginPreset
  orientation: PageOrientation
  pageNumbers: boolean
}

export interface ExportSettings {
  preset: ExportPreset
  pdfTemplate: PdfTemplateId
  paper: PaperSize
  margin: number
  accent: string
  background: string
  watermark: WatermarkSettings
  fineTune: FineTuneSettings
}

export const defaultFineTune: FineTuneSettings = {
  bodyFont: 'newsreader',
  bodyColor: '#282723',
  headingFont: 'newsreader',
  headingColor: '#1f1e1b',
  headingColorMode: 'same',
  h1Color: '#1f1e1b',
  h2Color: '#1f1e1b',
  h3Color: '#1f1e1b',
  linkColor: '#d85b3f',
  paper: 'a4',
  marginPreset: 'normal',
  orientation: 'portrait',
  pageNumbers: true,
}

export const defaultExportSettings: ExportSettings = {
  preset: 'editorial',
  pdfTemplate: 'novel',
  paper: 'a4',
  margin: 76,
  accent: '#d85b3f',
  background: '#ffffff',
  watermark: {
    enabled: true,
    text: 'quietmark.vercel.app',
    position: 'bottom-right',
    opacity: 0.1,
    size: 24,
    rotation: 0,
    color: '#8f4232',
  },
  fineTune: { ...defaultFineTune },
}

const EXPORT_PRESETS: ExportPreset[] = [
  'editorial', 'minimal', 'academic', 'manuscript', 'swiss', 'letterpress', 'executive', 'notebook',
]
const PDF_TEMPLATE_IDS: PdfTemplateId[] = [
  'novel', 'brief', 'thesis', 'memo', 'field-notes', 'letter', 'technical', 'magazine',
]
export const PAPER_SIZES: PaperSize[] = ['a5', 'a4', 'a3', 'letter', 'legal', 'tabloid']
const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tiled',
]
const MARGIN_PRESETS: MarginPreset[] = ['narrow', 'normal', 'wide']
const ORIENTATIONS: PageOrientation[] = ['portrait', 'landscape']
const HEADING_COLOR_MODES: HeadingColorMode[] = ['same', 'each']

export const MARGIN_PRESET_PX: Record<MarginPreset, number> = {
  narrow: 48,
  normal: 72,
  wide: 96,
}

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Coerce persisted export preferences into a complete, valid settings object.
 * Corrupt or partial localStorage payloads must never crash the studio.
 */
export function normalizeExportSettings(value: unknown): ExportSettings {
  const parsed = (value && typeof value === 'object' ? value : {}) as Partial<ExportSettings>
  const defaults = defaultExportSettings
  const watermarkIn = parsed.watermark && typeof parsed.watermark === 'object' && !Array.isArray(parsed.watermark)
    ? parsed.watermark as Partial<WatermarkSettings>
    : {}

  const fineTuneIn = parsed.fineTune && typeof parsed.fineTune === 'object' && !Array.isArray(parsed.fineTune)
    ? parsed.fineTune as Partial<FineTuneSettings>
    : {}
  const tuneDefaults = defaults.fineTune

  return {
    preset: pick(parsed.preset, EXPORT_PRESETS, defaults.preset),
    pdfTemplate: pick(parsed.pdfTemplate, PDF_TEMPLATE_IDS, defaults.pdfTemplate),
    paper: pick(parsed.paper, PAPER_SIZES, defaults.paper),
    margin: Math.round(clamp(parsed.margin, 36, 104, defaults.margin)),
    accent: isHexColor(parsed.accent) ? parsed.accent : defaults.accent,
    background: isHexColor(parsed.background) ? parsed.background : defaults.background,
    watermark: {
      enabled: typeof watermarkIn.enabled === 'boolean' ? watermarkIn.enabled : defaults.watermark.enabled,
      text: typeof watermarkIn.text === 'string' ? watermarkIn.text.slice(0, 42) : defaults.watermark.text,
      position: pick(watermarkIn.position, WATERMARK_POSITIONS, defaults.watermark.position),
      opacity: clamp(watermarkIn.opacity, 0.03, 0.35, defaults.watermark.opacity),
      size: Math.round(clamp(watermarkIn.size, 24, 120, defaults.watermark.size)),
      rotation: Math.round(clamp(watermarkIn.rotation, -60, 60, defaults.watermark.rotation)),
      color: isHexColor(watermarkIn.color) ? watermarkIn.color : defaults.watermark.color,
    },
    fineTune: {
      bodyFont: typeof fineTuneIn.bodyFont === 'string' && fineTuneIn.bodyFont ? fineTuneIn.bodyFont : tuneDefaults.bodyFont,
      bodyColor: isHexColor(fineTuneIn.bodyColor) ? fineTuneIn.bodyColor : tuneDefaults.bodyColor,
      headingFont: typeof fineTuneIn.headingFont === 'string' && fineTuneIn.headingFont ? fineTuneIn.headingFont : tuneDefaults.headingFont,
      headingColor: isHexColor(fineTuneIn.headingColor) ? fineTuneIn.headingColor : tuneDefaults.headingColor,
      headingColorMode: pick(fineTuneIn.headingColorMode, HEADING_COLOR_MODES, tuneDefaults.headingColorMode),
      h1Color: isHexColor(fineTuneIn.h1Color) ? fineTuneIn.h1Color : tuneDefaults.h1Color,
      h2Color: isHexColor(fineTuneIn.h2Color) ? fineTuneIn.h2Color : tuneDefaults.h2Color,
      h3Color: isHexColor(fineTuneIn.h3Color) ? fineTuneIn.h3Color : tuneDefaults.h3Color,
      linkColor: isHexColor(fineTuneIn.linkColor) ? fineTuneIn.linkColor : tuneDefaults.linkColor,
      paper: pick(fineTuneIn.paper, PAPER_SIZES, tuneDefaults.paper),
      marginPreset: pick(fineTuneIn.marginPreset, MARGIN_PRESETS, tuneDefaults.marginPreset),
      orientation: pick(fineTuneIn.orientation, ORIENTATIONS, tuneDefaults.orientation),
      pageNumbers: typeof fineTuneIn.pageNumbers === 'boolean' ? fineTuneIn.pageNumbers : tuneDefaults.pageNumbers,
    },
  }
}
