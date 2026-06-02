import { useMemo } from 'react'
import { useStore } from '../state/store'

export function MinimizedDock() {
  // Select the stable panes array, derive the filtered subset inside useMemo
  // so its identity only changes when `panes` actually changes. Returning
  // a fresh array from the selector breaks React 19's useSyncExternalStore
  // snapshot equality check and triggers an infinite re-render loop.
  const panes = useStore((s) => s.panes)
  const toggleMinimize = useStore((s) => s.toggleMinimize)
  const setFocus = useStore((s) => s.setFocus)
  const minimized = useMemo(() => panes.filter((p) => p.minimized), [panes])

  if (minimized.length === 0) return null

  return (
    <div className="minimized-dock">
      <span className="minimized-dock-label">archived</span>
      {minimized.map((p) => {
        const cls = [
          'minimized-chip',
          `status-${p.status}`,
          p.unread ? 'unread' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={p.id}
            className={cls}
            onClick={() => {
              toggleMinimize(p.id)
              setFocus(p.id)
            }}
            title={`${p.repo} · ${p.task || 'untitled'} — click to restore`}
          >
            <span className="minimized-chip-repo">{p.repo}</span>
            {p.task && <span className="minimized-chip-task">· {p.task}</span>}
          </button>
        )
      })}
    </div>
  )
}
