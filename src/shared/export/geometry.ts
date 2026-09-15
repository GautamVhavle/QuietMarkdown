// Page geometry: paper sizes, orientation, margins, and tune helpers.
// Pure data + math; no DOM, no styles.
import type { FineTuneSettings, PaperSize } from '../settings/exportSettings'
import { MARGIN_PRESET_PX } from '../settings/exportSettings'

export const MARGIN_PRESETS: Array<{ value: FineTuneSettings['marginPreset']; label: string; detail: string }> = [
  { value: 'narrow', label: 'Narrow', detail: '48px' },
  { value: 'normal', label: 'Normal', detail: '72px' },
  { value: 'wide', label: 'Wide', detail: '96px' },
]

export const ORIENTATIONS: Array<{ value: FineTuneSettings['orientation']; label: string }> = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

// Resolve the effective page box after orientation (landscape swaps W/H).
export function orientedDimensions(paper: PaperSize, orientation: FineTuneSettings['orientation']) {
  const base = pageDimensions[paper]
  if (orientation === 'landscape') return { width: base.height, height: base.width, css: `${base.css} landscape` }
  return { width: base.width, height: base.height, css: base.css }
}

// Effective margin in px from the margin preset.
export function tuneMarginPx(tune: FineTuneSettings): number {
  return MARGIN_PRESET_PX[tune.marginPreset]
}

// Effective paper-size points after orientation.
export function tunePageSizePoints(paper: PaperSize, orientation: FineTuneSettings['orientation']) {
  const base = pageSizePoints[paper]
  if (orientation === 'landscape') return { width: base.height, height: base.width }
  return { width: base.width, height: base.height }
}

export function tuneHeadingColor(tune: FineTuneSettings, level: 1 | 2 | 3): string {
  if (tune.headingColorMode === 'each') {
    return level === 1 ? tune.h1Color : level === 2 ? tune.h2Color : tune.h3Color
  }
  return tune.headingColor
}

// CSS-pixel page boxes at 96dpi, matching common print sizes.
export const pageDimensions: Record<PaperSize, { width: number; height: number; css: string }> = {
  a5: { width: 559, height: 794, css: 'A5' },
  a4: { width: 794, height: 1123, css: 'A4' },
  a3: { width: 1123, height: 1588, css: 'A3' },
  letter: { width: 816, height: 1056, css: 'Letter' },
  legal: { width: 816, height: 1344, css: 'Legal' },
  tabloid: { width: 1056, height: 1632, css: 'Tabloid' },
}

export const paperSizeOptions: Array<{ value: PaperSize; label: string }> = [
  { value: 'a5', label: 'A5' },
  { value: 'a4', label: 'A4' },
  { value: 'a3', label: 'A3' },
  { value: 'letter', label: 'US Letter' },
  { value: 'legal', label: 'US Legal' },
  { value: 'tabloid', label: 'Tabloid' },
]

// ISO / US paper sizes in PDF points (1/72 inch).
export const pageSizePoints: Record<PaperSize, { width: number; height: number }> = {
  a5: { width: 419.53, height: 595.28 },
  a4: { width: 595.28, height: 841.89 },
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  tabloid: { width: 792, height: 1224 },
}

// CSS-pixel margins → PDF points (96dpi → 72dpi).
export function marginPoints(marginPx: number): number {
  return Math.round(marginPx * 0.75)
}
