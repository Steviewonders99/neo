import { describe, it, expect } from 'vitest'
import { gridForCount } from './grid'

describe('gridForCount', () => {
  it('returns 1x1 for 1 pane', () => {
    expect(gridForCount(1)).toEqual({ columns: '1fr', rows: '1fr', cells: 1 })
  })
  it('returns 2x1 for 2 panes', () => {
    expect(gridForCount(2)).toEqual({ columns: '1fr 1fr', rows: '1fr', cells: 2 })
  })
  it('returns 3x1 for 3 panes', () => {
    expect(gridForCount(3)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr', cells: 3 })
  })
  it('returns 2x2 for 4 panes', () => {
    expect(gridForCount(4)).toEqual({ columns: '1fr 1fr', rows: '1fr 1fr', cells: 4 })
  })
  it('returns 3x2 for 5 panes (1 empty cell)', () => {
    expect(gridForCount(5)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr', cells: 6 })
  })
  it('returns 3x2 for 6 panes', () => {
    expect(gridForCount(6)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr', cells: 6 })
  })
  it('returns 3x3 for 7,8,9 panes', () => {
    for (const n of [7, 8, 9]) {
      expect(gridForCount(n)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr 1fr', cells: 9 })
    }
  })
  it('returns 5x2 for 10 panes', () => {
    expect(gridForCount(10)).toEqual({ columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr', cells: 10 })
  })
  it('clamps below 1 to 1', () => {
    expect(gridForCount(0)).toEqual({ columns: '1fr', rows: '1fr', cells: 1 })
  })
  it('clamps above 10 to 10', () => {
    expect(gridForCount(11)).toEqual({ columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr', cells: 10 })
  })
})
