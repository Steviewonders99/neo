import { useStore } from '../state/store'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)

  const isFocused = focusedId === pane.id
  const cls = [
    'pane',
    `status-${pane.status}`,
    isFocused ? 'focused' : '',
    pane.unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} onMouseDown={() => setFocus(pane.id)}>
      <PaneHeader pane={pane} onClose={onClose} />
      <div className="pane-body">
        <Terminal paneId={pane.id} />
      </div>
    </div>
  )
}
