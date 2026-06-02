import { useStore } from '../state/store'
import { gridForCount } from '../lib/grid'
import { Pane } from './Pane'

export function GridLayout() {
  const panes = useStore((s) => s.panes)
  const removePane = useStore((s) => s.removePane)
  const visible = panes.filter((p) => !p.minimized)
  const spec = gridForCount(visible.length)

  return (
    <div
      className="grid-layout"
      style={{
        gridTemplateColumns: spec.columns,
        gridTemplateRows: spec.rows,
      }}
    >
      {visible.map((p) => (
        <Pane key={p.id} pane={p} onClose={() => removePane(p.id)} />
      ))}
    </div>
  )
}
