import { getCurrentWindow } from '@tauri-apps/api/window'

function startDrag(e: React.MouseEvent) {
  // Only respond to a real primary-button drag — not right-click, not multi-touch.
  if (e.buttons !== 1) return
  // Don't hijack double-click (that's the OS "zoom" gesture).
  if (e.detail === 2) {
    getCurrentWindow().toggleMaximize().catch(() => {})
    return
  }
  getCurrentWindow().startDragging().catch(() => {})
}

export function WindowChrome() {
  return (
    <div className="window-chrome" onMouseDown={startDrag}>
      <div className="window-chrome-traffic-light-spacer" onMouseDown={startDrag} />
      <div className="window-chrome-drag" onMouseDown={startDrag} />
    </div>
  )
}
