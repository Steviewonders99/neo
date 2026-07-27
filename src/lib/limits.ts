/** Total panes NEO will keep alive at once, visible or archived. */
export const MAX_PANES = 20

/**
 * Panes the auto-tiled grid will show at once. `gridForCount` only has layouts
 * up to 10, and past that the tiles are too small to be useful anyway — panes
 * beyond this land in the archived dock with their PTY still running.
 */
export const MAX_VISIBLE = 10

export function visibleCount(panes: readonly { minimized: boolean }[]): number {
  let n = 0
  for (const p of panes) if (!p.minimized) n++
  return n
}
