export type ViewMode = 'write' | 'split' | 'preview'
export type Theme = 'light' | 'dark'
export type ExportPreset = 'editorial' | 'minimal' | 'academic'
export type ExportFont = 'serif' | 'sans' | 'mono'
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
  watermark: WatermarkSettings
}

export const defaultExportSettings: ExportSettings = {
  preset: 'editorial',
  font: 'serif',
  paper: 'a4',
  margin: 64,
  accent: '#d85b3f',
  watermark: {
    enabled: true,
    text: 'DRAFT',
    position: 'center',
    opacity: 0.1,
    size: 76,
    rotation: -28,
    color: '#8f4232',
  },
}
