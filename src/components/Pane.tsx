import { useEffect } from 'react'
import { useStore } from '../state/store'
import { listenActivity, listenTaskSuggestion, meta as paneMetaIpc } from '../lib/ipc'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)
  const updateStatus = useStore((s) => s.updateStatus)
  const renameTask = useStore((s) => s.renameTask)

  // Sync meta whenever it changes
  useEffect(() => {
    paneMetaIpc.set(pane.id, pane.repo, pane.task || 'untitled').catch(() => {})
  }, [pane.id, pane.repo, pane.task])

  // Listen for activity events
  useEffect(() => {
    let unsub: (() => void) | null = null
    listenActivity(pane.id, (status) => updateStatus(pane.id, status)).then(
      (u) => (unsub = u),
    )
    return () => {
      unsub?.()
    }
  }, [pane.id, updateStatus])

  // Listen for auto-generated task title — but only apply if task is still empty/untitled
  useEffect(() => {
    let unsub: (() => void) | null = null
    listenTaskSuggestion(pane.id, (title) => {
      const current = useStore.getState().panes.find((p) => p.id === pane.id)
      if (current && !current.task.trim()) {
        renameTask(pane.id, title)
      }
    }).then((u) => (unsub = u))
    return () => {
      unsub?.()
    }
  }, [pane.id, renameTask])

  const isFocused = focusedId === pane.id
  const cls = [
    'pane',
    `status-${pane.status}`,
    isFocused ? 'focused' : '',
    pane.unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function onMouseDown() {
    setFocus(pane.id)
    paneMetaIpc.focus(pane.id).catch(() => {})
  }

  return (
    <div className={cls} onMouseDown={onMouseDown}>
      <PaneHeader pane={pane} onClose={onClose} />
      <div className="pane-body">
        <Terminal paneId={pane.id} />
      </div>
    </div>
  )
}
