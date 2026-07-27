import { describe, it, expect } from 'vitest'
import { movePaneOrder } from './reorder'

type P = { id: string; minimized?: boolean }
const ids = (list: P[]) => list.map((p) => p.id).join('')
const mk = (spec: string): P[] => spec.split('').map((id) => ({ id }))

describe('movePaneOrder', () => {
  it('moves a pane forward, shifting the rest left', () => {
    // Trello: dragging the first card onto the last gives [B,C,D,A]
    expect(ids(movePaneOrder(mk('ABCD'), 'A', 'D'))).toBe('BCDA')
  })

  it('moves a pane backward, shifting the rest right', () => {
    expect(ids(movePaneOrder(mk('ABCD'), 'D', 'B'))).toBe('ADBC')
  })

  it('handles an adjacent forward move', () => {
    expect(ids(movePaneOrder(mk('ABCD'), 'A', 'B'))).toBe('BACD')
  })

  it('handles an adjacent backward move', () => {
    expect(ids(movePaneOrder(mk('ABCD'), 'C', 'B'))).toBe('ACBD')
  })

  it('moves the last pane to the front', () => {
    expect(ids(movePaneOrder(mk('ABCD'), 'D', 'A'))).toBe('DABC')
  })

  it('returns the same reference when source and target match', () => {
    const list = mk('ABCD')
    expect(movePaneOrder(list, 'B', 'B')).toBe(list)
  })

  it('returns the same reference when the source id is unknown', () => {
    const list = mk('ABCD')
    expect(movePaneOrder(list, 'Z', 'B')).toBe(list)
  })

  it('returns the same reference when the target id is unknown', () => {
    const list = mk('ABCD')
    expect(movePaneOrder(list, 'B', 'Z')).toBe(list)
  })

  it('does not mutate the input list', () => {
    const list = mk('ABCD')
    movePaneOrder(list, 'A', 'D')
    expect(ids(list)).toBe('ABCD')
  })

  it('reorders the visible subsequence correctly with a minimized pane interleaved', () => {
    // Visible order is [A, C, D]; dragging A onto D must yield visible [C, D, A]
    const list: P[] = [
      { id: 'A', minimized: false },
      { id: 'B', minimized: true },
      { id: 'C', minimized: false },
      { id: 'D', minimized: false },
    ]
    const next = movePaneOrder(list, 'A', 'D')
    expect(ids(next)).toBe('BCDA')
    expect(ids(next.filter((p) => !p.minimized))).toBe('CDA')
  })

  it('keeps minimized panes in the list when reordering visible ones', () => {
    const list: P[] = [
      { id: 'A', minimized: false },
      { id: 'B', minimized: true },
      { id: 'C', minimized: false },
    ]
    const next = movePaneOrder(list, 'C', 'A')
    expect(next).toHaveLength(3)
    expect(next.find((p) => p.id === 'B')?.minimized).toBe(true)
  })
})
