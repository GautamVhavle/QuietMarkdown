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
    text: 'quietmarkdown.vercel.app',
    position: 'bottom-right',
    opacity: 0.1,
    size: 24,
    rotation: 0,
    color: '#8f4232',
  },
}
