// Toolbar definition. Icons stay here so DocumentBar renders config,
// not a hardcoded list. Shortcuts come from the caller (Mac vs Windows).
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table2,
  type LucideIcon,
} from 'lucide-react'

export interface ToolbarItem {
  action: string
  icon: LucideIcon
  label: string
  shortcut: string
  group: string
  disabled?: boolean
}

export function toolbarConfig(options: {
  isMac: boolean
  canUndo: boolean
  canRedo: boolean
  hasContent: boolean
}): ToolbarItem[] {
  const { isMac, canUndo, canRedo, hasContent } = options
  return [
    { action: 'undo', icon: ArrowLeft, label: 'Undo', shortcut: isMac ? '⌘Z' : 'Ctrl+Z', group: 'history', disabled: !canUndo },
    { action: 'redo', icon: ArrowRight, label: 'Redo', shortcut: isMac ? '⌘⇧Z' : 'Ctrl+Y', group: 'history', disabled: !canRedo },
    { action: 'clear', icon: Eraser, label: 'Clear', shortcut: '', group: 'history', disabled: !hasContent },
    { action: 'heading1', icon: Heading1, label: 'Title', shortcut: '', group: 'headings' },
    { action: 'heading2', icon: Heading2, label: 'Section heading', shortcut: '', group: 'headings' },
    { action: 'heading3', icon: Heading3, label: 'Small heading', shortcut: '', group: 'headings' },
    { action: 'bold', icon: Bold, label: 'Bold', shortcut: isMac ? '⌘B' : 'Ctrl+B', group: 'inline' },
    { action: 'italic', icon: Italic, label: 'Italic', shortcut: isMac ? '⌘I' : 'Ctrl+I', group: 'inline' },
    { action: 'strike', icon: Strikethrough, label: 'Strikethrough', shortcut: '', group: 'inline' },
    { action: 'link', icon: Link2, label: 'Link', shortcut: isMac ? '⌘K' : 'Ctrl+K', group: 'insert' },
    { action: 'image', icon: ImagePlus, label: 'Image', shortcut: '', group: 'insert' },
    { action: 'code', icon: Code2, label: 'Code', shortcut: isMac ? '⌘E' : 'Ctrl+E', group: 'insert' },
    { action: 'table', icon: Table2, label: 'Table', shortcut: '', group: 'blocks' },
    { action: 'quote', icon: Quote, label: 'Quote', shortcut: '', group: 'blocks' },
    { action: 'bullet', icon: List, label: 'Bullet list', shortcut: '', group: 'blocks' },
    { action: 'number', icon: ListOrdered, label: 'Numbered list', shortcut: '', group: 'blocks' },
    { action: 'task', icon: ListChecks, label: 'Task list', shortcut: '', group: 'blocks' },
    { action: 'divider', icon: Minus, label: 'Divider', shortcut: '', group: 'blocks' },
  ]
}
