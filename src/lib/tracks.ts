/**
 * Grid track sizing for resizable pane gutters.
 *
 * Tracks are held as unitless fractions and rendered as `fr` units, which is
 * what makes pane proportions survive an OS window resize for free — the
 * browser rescales `fr` tracks and xterm refits from its ResizeObserver.
 */

/** A track can never be squeezed below this share of the grid. */
export const MIN_TRACK_FR = 0.15

export function evenTracks(n: number): number[] {
  return Array.from({ length: Math.max(1, n) }, () => 1)
}

export function tracksToTemplate(fr: number[], gutterPx: number): string {
  return fr.map((f) => `${f.toFixed(6)}fr`).join(` ${gutterPx}px `)
}

/**
 * Drag the gutter sitting between track `index` and `index + 1` by `deltaPx`.
 * The pair trades size, so the total is preserved and no other track moves.
 * Neither side is allowed below MIN_TRACK_FR; past that the gutter just stops.
 */
export function resizeTracks(
  start: number[],
  index: number,
  deltaPx: number,
  totalPx: number,
): number[] {
  if (index < 0 || index + 1 >= start.length) return start
  if (!Number.isFinite(totalPx) || totalPx <= 0) return start

  const sum = start.reduce((a, b) => a + b, 0)
  const wanted = (deltaPx / totalPx) * sum

  // Clamp the travel so both neighbours stay above the minimum.
  const maxRight = start[index + 1] - MIN_TRACK_FR
  const maxLeft = -(start[index] - MIN_TRACK_FR)
  const delta = Math.max(maxLeft, Math.min(maxRight, wanted))

  const next = start.slice()
  next[index] = start[index] + delta
  next[index + 1] = start[index + 1] - delta
  return next
}
