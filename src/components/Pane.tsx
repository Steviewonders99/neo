import { useEffect } from 'react'
import { useStore } from '../state/store'
import { meta as paneMetaIpc } from '../lib/ipc'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)

  useEffect(() => {
    paneMetaIpc.set(pane.id, pane.repo, pane.task || 'untitled').catch(() => {})
  }, [pane.id, pane.repo, pane.task])

  const isFocused = focusedId === pane.id
  const cls = ['pane', `status-${pane.status}`, isFocused ? 'focused' : '']
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
