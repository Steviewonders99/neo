import { useMemo } from 'react'
import { useStore } from '../state/store'
import { MAX_VISIBLE, visibleCount } from '../lib/limits'

export function MinimizedDock() {
  // Select the stable panes array, derive the filtered subset inside useMemo
  // so its identity only changes when `panes` actually changes. Returning
  // a fresh array from the selector breaks React 19's useSyncExternalStore
  // snapshot equality check and triggers an infinite re-render loop.
  const panes = useStore((s) => s.panes)
  const toggleMinimize = useStore((s) => s.toggleMinimize)
  const setFocus = useStore((s) => s.setFocus)
  const minimized = useMemo(() => panes.filter((p) => p.minimized), [panes])
  const visible = useMemo(() => visibleCount(panes), [panes])

  if (minimized.length === 0) return null

  // The grid tops out at MAX_VISIBLE, so restoring is blocked until something
  // is archived. Showing the count is what makes that read as deliberate.
  const gridFull = visible >= MAX_VISIBLE

  return (
    <div className="minimized-dock">
      <span className="minimized-dock-label">archived {minimized.length}</span>
      <span className="minimized-dock-count">
        · {visible}/{MAX_VISIBLE} visible
      </span>
      {minimized.map((p) => {
        const cls = [
          'minimized-chip',
          `status-${p.status}`,
          p.unread ? 'unread' : '',
          gridFull ? 'blocked' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={p.id}
            className={cls}
            disabled={gridFull}
            onClick={() => {
              if (gridFull) return
              toggleMinimize(p.id)
              setFocus(p.id)
            }}
            title={
              gridFull
                ? `${MAX_VISIBLE}/${MAX_VISIBLE} visible — archive a pane first`
                : `${p.repo} · ${p.task || 'untitled'} — click to restore`
            }
          >
            <span className="minimized-chip-repo">{p.repo}</span>
            {p.task && <span className="minimized-chip-task">· {p.task}</span>}
          </button>
        )
      })}
    </div>
  )
}
