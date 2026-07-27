import { useStore } from '../state/store'

/** Movement required before a press on a pane header becomes a drag. */
const DRAG_THRESHOLD_PX = 5

function paneIdAt(x: number, y: number): string | null {
  const hit = document.elementFromPoint(x, y)?.closest('[data-pane-id]')
  return (hit as HTMLElement | null)?.dataset.paneId ?? null
}

/**
 * Begin a pane reorder drag from a pane header.
 *
 * Deliberately built on pointer capture rather than HTML5 drag-and-drop: xterm
 * renders into a <canvas> and the window already contends with Tauri's
 * `data-tauri-drag-region`, both of which interfere with native DnD. Capture
 * keeps every move event on the header no matter what the cursor passes over.
 */
export function startPaneDrag(e: React.PointerEvent<HTMLElement>, paneId: string) {
  if (e.button !== 0) return

  const handle = e.currentTarget
  const pointerId = e.pointerId
  const startX = e.clientX
  const startY = e.clientY
  let dragging = false

  function onMove(ev: PointerEvent) {
    if (!dragging) {
      const moved =
        Math.abs(ev.clientX - startX) >= DRAG_THRESHOLD_PX ||
        Math.abs(ev.clientY - startY) >= DRAG_THRESHOLD_PX
      if (!moved) return
      dragging = true
      useStore.getState().beginDrag(paneId)
      document.body.classList.add('reordering')
    }
    const over = paneIdAt(ev.clientX, ev.clientY)
    useStore.getState().setDropTarget(over && over !== paneId ? over : null)
  }

  function finish(commit: boolean) {
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    try {
      handle.releasePointerCapture(pointerId)
    } catch {
      /* capture already released */
    }
    if (!dragging) return
    document.body.classList.remove('reordering')
    const { draggingId, dropTargetId, movePane, endDrag } = useStore.getState()
    if (commit && draggingId && dropTargetId) movePane(draggingId, dropTargetId)
    endDrag()
  }

  function onUp() {
    finish(true)
  }
  function onCancel() {
    finish(false)
  }
  function onKey(ev: KeyboardEvent) {
    if (ev.key === 'Escape') finish(false)
  }

  handle.setPointerCapture(pointerId)
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
}
