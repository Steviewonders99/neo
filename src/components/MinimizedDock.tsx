import { useStore } from '../state/store'

export function MinimizedDock() {
  const minimized = useStore((s) => s.panes.filter((p) => p.minimized))
  const toggleMinimize = useStore((s) => s.toggleMinimize)
  const setFocus = useStore((s) => s.setFocus)

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
