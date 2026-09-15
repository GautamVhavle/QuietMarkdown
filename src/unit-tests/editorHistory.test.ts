import { describe, expect, it } from 'vitest'

import { editorReducer, isCoalesceableChange, type EditorState } from '../features/editor/editorHistory'

const seed = (markdown: string): EditorState => ({
  markdown,
  history: [markdown],
  historyIndex: 0,
  coalescing: false,
})

describe('isCoalesceableChange', () => {
  it('coalesces short typing runs', () => {
    expect(isCoalesceableChange('hello', 'hello!')).toBe(true)
    expect(isCoalesceableChange('hello!', 'hello')).toBe(true)
  })

  it('rejects large replacements', () => {
    expect(isCoalesceableChange('a', 'a'.repeat(100))).toBe(false)
    expect(isCoalesceableChange('hello world', 'goodbye world')).toBe(false)
  })
})

describe('editorReducer', () => {
  it('appends updates and moves the pointer', () => {
    const next = editorReducer(seed('a'), { type: 'UPDATE', markdown: 'ab' })
    expect(next.markdown).toBe('ab')
    expect(next.history).toEqual(['a', 'ab'])
    expect(next.historyIndex).toBe(1)
  })

  it('ignores no-op updates', () => {
    const state = seed('a')
    expect(editorReducer(state, { type: 'UPDATE', markdown: 'a' })).toBe(state)
  })

  it('coalesces consecutive typing into the tip', () => {
    const first = editorReducer(seed('a'), { type: 'UPDATE', markdown: 'ab', coalesce: true })
    const second = editorReducer(
      { ...first, coalescing: true },
      { type: 'UPDATE', markdown: 'abc', coalesce: true },
    )
    expect(second.history).toEqual(['a', 'abc'])
    expect(second.historyIndex).toBe(1)
  })

  it('undoes and redoes along the pointer', () => {
    const updated = editorReducer(seed('a'), { type: 'UPDATE', markdown: 'b' })
    const undone = editorReducer(updated, { type: 'UNDO' })
    expect(undone.markdown).toBe('a')
    const redone = editorReducer(undone, { type: 'REDO' })
    expect(redone.markdown).toBe('b')
  })

  it('resets the stack', () => {
    const updated = editorReducer(seed('a'), { type: 'UPDATE', markdown: 'b' })
    const reset = editorReducer(updated, { type: 'RESET', markdown: 'fresh' })
    expect(reset).toEqual({ markdown: 'fresh', history: ['fresh'], historyIndex: 0, coalescing: false })
  })
})
