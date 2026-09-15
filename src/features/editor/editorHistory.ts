// Undo history for the Markdown source. Consecutive short typing runs
// coalesce into one undo step; large replacements always start a new entry.
export interface EditorState {
  markdown: string
  history: string[]
  historyIndex: number
  coalescing: boolean
}

export type EditorAction =
  | { type: 'UPDATE'; markdown: string; coalesce?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; markdown: string }

export const MAX_HISTORY = 100

// Short runs (typing, IME, backspace) collapse into one undo step.
export function isCoalesceableChange(previous: string, next: string): boolean {
  let prefix = 0
  const limit = Math.min(previous.length, next.length)
  while (prefix < limit && previous.charCodeAt(prefix) === next.charCodeAt(prefix)) prefix += 1
  let suffix = 0
  const prevTail = previous.length - prefix
  const nextTail = next.length - prefix
  while (
    suffix < prevTail
    && suffix < nextTail
    && previous.charCodeAt(previous.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix)
  ) suffix += 1
  const deleted = prevTail - suffix
  const inserted = nextTail - suffix
  return (deleted === 0 && inserted > 0 && inserted <= 8)
    || (inserted === 0 && deleted > 0 && deleted <= 8)
}

// Canonical model: history[i] IS the state at position i and historyIndex
// always points at the current entry. UPDATE appends; UNDO/REDO move the
// pointer; RESET replaces the stack.
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'UPDATE': {
      if (action.markdown === state.markdown) return state
      const atTip = state.historyIndex === state.history.length - 1
      const canCoalesce = Boolean(action.coalesce)
        && state.coalescing
        && atTip
        && isCoalesceableChange(state.markdown, action.markdown)
      if (canCoalesce) {
        const history = [...state.history.slice(0, -1), action.markdown]
        return {
          markdown: action.markdown,
          history,
          historyIndex: history.length - 1,
          coalescing: true,
        }
      }
      const history = [...state.history.slice(0, state.historyIndex + 1), action.markdown]
      const trimmed = history.slice(-MAX_HISTORY)
      return {
        markdown: action.markdown,
        history: trimmed,
        historyIndex: trimmed.length - 1,
        coalescing: Boolean(action.coalesce),
      }
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
        coalescing: false,
      }
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        ...state,
        markdown: state.history[newIndex],
        historyIndex: newIndex,
        coalescing: false,
      }
    }
    case 'RESET': {
      return {
        markdown: action.markdown,
        history: [action.markdown],
        historyIndex: 0,
        coalescing: false,
      }
    }
    default:
      return state
  }
}
