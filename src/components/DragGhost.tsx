import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'

/**
 * The chip that trails the cursor while a pane is being dragged.
 *
 * Position is written straight to the DOM from a window-level pointermove
 * listener — routing it through React state would re-render every pane, and
 * every xterm, on every frame of the drag.
 */
export function DragGhost() {
  const draggingId = useStore((s) => s.draggingId)
  const panes = useStore((s) => s.panes)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!draggingId) return
    const el = ref.current
    if (!el) return

    function onMove(ev: PointerEvent) {
      el!.style.transform = `translate3d(${ev.clientX + 14}px, ${ev.clientY + 14}px, 0)`
      // Held at 0 until the first move so the chip never flashes at the origin.
      el!.style.opacity = '1'
    }

    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [draggingId])

  if (!draggingId) return null
  const pane = panes.find((p) => p.id === draggingId)
  if (!pane) return null

  return (
    <div ref={ref} className="pane-drag-ghost">
      <span className="pane-drag-ghost-repo">{pane.repo}</span>
      {pane.task && <span className="pane-drag-ghost-task">· {pane.task}</span>}
    </div>
  )
}
