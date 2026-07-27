import { useState } from 'react'
import { useStore } from '../state/store'
import { startPaneDrag } from '../lib/drag'
import type { Pane } from '../state/types'

type Props = { pane: Pane; onClose: () => void }

export function PaneHeader({ pane, onClose }: Props) {
  const renameTask = useStore((s) => s.renameTask)
  const toggleMinimize = useStore((s) => s.toggleMinimize)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(pane.task)

  const dot =
    pane.status === 'attention'
      ? 'var(--green)'
      : pane.status === 'working'
      ? 'var(--green-dim)'
      : pane.status === 'exited'
      ? 'var(--text-muted)'
      : 'var(--green-soft)'

  // Keeps a press on the task text or the buttons from arming a reorder drag.
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      className="pane-header"
      onPointerDown={(e) => startPaneDrag(e, pane.id)}
      title="Drag to reorder"
    >
      <span className="pane-status-dot" style={{ background: dot }} />
      <span className="pane-repo">{pane.repo}</span>
      <span className="pane-sep">·</span>
      {editing ? (
        <input
          className="pane-task-input"
          autoFocus
          value={draft}
          onPointerDown={stopDrag}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            renameTask(pane.id, draft.trim() || pane.task)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameTask(pane.id, draft.trim() || pane.task)
              setEditing(false)
            }
            if (e.key === 'Escape') {
              setDraft(pane.task)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span
          className="pane-task"
          onPointerDown={stopDrag}
          onClick={() => {
            setDraft(pane.task)
            setEditing(true)
          }}
        >
          {pane.task || <em className="placeholder">untitled</em>}
        </span>
      )}
      <span className="pane-spacer" />
      {pane.status === 'exited' && (
        <span className="pane-exit-code">exit {pane.exitCode ?? '?'}</span>
      )}
      <button
        className="pane-minimize"
        onPointerDown={stopDrag}
        onClick={(e) => {
          e.stopPropagation()
          toggleMinimize(pane.id)
        }}
        aria-label="minimize pane"
        title="Archive — keeps PTY alive"
      >
        −
      </button>
      <button
        className="pane-close"
        onPointerDown={stopDrag}
        onClick={onClose}
        aria-label="close pane"
      >
        ×
      </button>
    </div>
  )
}
