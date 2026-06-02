import { getCurrentWindow } from '@tauri-apps/api/window'

function startDrag(e: React.MouseEvent) {
  if (e.button !== 0) return
  if (e.detail === 2) {
    getCurrentWindow()
      .toggleMaximize()
      .catch((err) => console.warn('toggleMaximize failed', err))
    return
  }
  getCurrentWindow()
    .startDragging()
    .catch((err) => console.warn('startDragging failed', err))
}

export function WindowChrome() {
  return (
    <div
      className="window-chrome"
      onMouseDown={startDrag}
      data-tauri-drag-region
    >
      <div
        className="window-chrome-traffic-light-spacer"
        onMouseDown={startDrag}
        data-tauri-drag-region
      />
      <div
        className="window-chrome-drag"
        onMouseDown={startDrag}
        data-tauri-drag-region
      >
        <span className="window-chrome-title">NEO</span>
      </div>
    </div>
  )
}
