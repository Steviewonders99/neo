import { describe, it, expect } from 'vitest'
import { evenTracks, resizeTracks, tracksToTemplate, MIN_TRACK_FR } from './tracks'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

describe('evenTracks', () => {
  it('builds n equal tracks', () => {
    expect(evenTracks(3)).toEqual([1, 1, 1])
  })
  it('never returns an empty template', () => {
    expect(evenTracks(0)).toEqual([1])
  })
})

describe('tracksToTemplate', () => {
  it('interleaves fixed-width gutters between fr tracks', () => {
    expect(tracksToTemplate([1, 1, 1], 8)).toBe(
      '1.000000fr 8px 1.000000fr 8px 1.000000fr',
    )
  })
  it('emits no gutter for a single track', () => {
    expect(tracksToTemplate([1], 8)).toBe('1.000000fr')
  })
})

describe('resizeTracks', () => {
  it('moves size from the right track to the left one', () => {
    // 1000px wide, 3 even tracks; +100px is a tenth of the grid
    const next = resizeTracks([1, 1, 1], 0, 100, 1000)
    expect(next[0]).toBeCloseTo(1.3)
    expect(next[1]).toBeCloseTo(0.7)
    expect(next[2]).toBe(1)
  })

  it('moves size the other way for a negative delta', () => {
    const next = resizeTracks([1, 1, 1], 0, -100, 1000)
    expect(next[0]).toBeCloseTo(0.7)
    expect(next[1]).toBeCloseTo(1.3)
  })

  it('preserves the total across a resize', () => {
    expect(sum(resizeTracks([1, 1, 1], 1, 250, 1000))).toBeCloseTo(3)
  })

  it('clamps so the right track never drops below the minimum', () => {
    const next = resizeTracks([1, 1], 0, 100_000, 1000)
    expect(next[1]).toBeCloseTo(MIN_TRACK_FR)
    expect(sum(next)).toBeCloseTo(2)
  })

  it('clamps so the left track never drops below the minimum', () => {
    const next = resizeTracks([1, 1], 0, -100_000, 1000)
    expect(next[0]).toBeCloseTo(MIN_TRACK_FR)
    expect(sum(next)).toBeCloseTo(2)
  })

  it('only touches the dragged pair', () => {
    const next = resizeTracks([1, 1, 1, 1], 1, 120, 1000)
    expect(next[0]).toBe(1)
    expect(next[3]).toBe(1)
  })

  it('returns the input when the gutter index is out of range', () => {
    const start = [1, 1]
    expect(resizeTracks(start, 1, 50, 1000)).toBe(start)
    expect(resizeTracks(start, -1, 50, 1000)).toBe(start)
  })

  it('returns the input when the grid has no measurable width', () => {
    const start = [1, 1]
    expect(resizeTracks(start, 0, 50, 0)).toBe(start)
  })

  it('does not mutate the input', () => {
    const start = [1, 1, 1]
    resizeTracks(start, 0, 100, 1000)
    expect(start).toEqual([1, 1, 1])
  })
})
