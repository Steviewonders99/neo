/**
 * Insert-and-shift reordering, the semantics a Kanban board uses: the dragged
 * item takes the target's slot and everything from there on slides one place.
 *
 * This runs against the full pane list, minimized panes included. That is
 * deliberate — the visible grid is the full list filtered, so a splice here maps
 * to the same splice on the visible subsequence. Given
 * [A(vis), B(min), C(vis), D(vis)], moving A onto D yields [B, C, D, A], i.e.
 * visible [C, D, A] — insert-and-shift on visible [A, C, D].
 */
export function movePaneOrder<T extends { id: string }>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return list

  const from = list.findIndex((p) => p.id === fromId)
  const to = list.findIndex((p) => p.id === toId)
  if (from < 0 || to < 0) return list

  const next = list.slice()
  const [moved] = next.splice(from, 1)
  // `to` is the target's index in the ORIGINAL list. Using it directly after the
  // removal is what makes forward and backward drags both land correctly.
  next.splice(to, 0, moved)
  return next
}
