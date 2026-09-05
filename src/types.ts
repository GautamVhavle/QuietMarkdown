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
export type ExportFont = 'serif' | 'classic' | 'sans' | 'humanist' | 'mono' | 'typewriter'
export type PaperSize = 'a4' | 'letter'
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

export interface ExportSettings {
  preset: ExportPreset
  font: ExportFont
  paper: PaperSize
  margin: number
  accent: string
  background: string
  watermark: WatermarkSettings
}

export const defaultExportSettings: ExportSettings = {
  preset: 'editorial',
  font: 'serif',
  paper: 'a4',
  margin: 64,
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
}

const EXPORT_PRESETS: ExportPreset[] = [
  'editorial', 'minimal', 'academic', 'manuscript', 'swiss', 'letterpress', 'executive', 'notebook',
]
const EXPORT_FONTS: ExportFont[] = ['serif', 'classic', 'sans', 'humanist', 'mono', 'typewriter']
const PAPER_SIZES: PaperSize[] = ['a4', 'letter']
const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tiled',
]

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

  return {
    preset: pick(parsed.preset, EXPORT_PRESETS, defaults.preset),
    font: pick(parsed.font, EXPORT_FONTS, defaults.font),
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
  }
}
