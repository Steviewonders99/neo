import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { gridForCount, trackCount } from '../lib/grid'
import { evenTracks, resizeTracks, tracksToTemplate } from '../lib/tracks'
import { Pane } from './Pane'
import { DragGhost } from './DragGhost'

/** Width of the draggable gutter between two tracks. */
const GUTTER_PX = 8

export function GridLayout() {
  const panes = useStore((s) => s.panes)
  const removePane = useStore((s) => s.removePane)
  const visible = useMemo(() => panes.filter((p) => !p.minimized), [panes])

  const spec = gridForCount(visible.length)
  const cols = trackCount(spec.columns)
  const rows = trackCount(spec.rows)

  const [colFr, setColFr] = useState<number[]>(() => evenTracks(cols))
  const [rowFr, setRowFr] = useState<number[]>(() => evenTracks(rows))
  const gridRef = useRef<HTMLDivElement | null>(null)

  // The tiling shape changes with the pane count, so any custom sizing from the
  // previous shape no longer means anything — start even again.
  useEffect(() => setColFr(evenTracks(cols)), [cols])
  useEffect(() => setRowFr(evenTracks(rows)), [rows])

  function startGutterDrag(
    e: React.PointerEvent<HTMLElement>,
    axis: 'col' | 'row',
    index: number,
  ) {
    if (e.button !== 0) return
    const grid = gridRef.current
    if (!grid) return

    const handle = e.currentTarget
    const pointerId = e.pointerId
    const isCol = axis === 'col'
    const start = isCol ? colFr : rowFr
    const startPos = isCol ? e.clientX : e.clientY
    const gutterTotal = ((isCol ? cols : rows) - 1) * GUTTER_PX
    const totalPx = (isCol ? grid.clientWidth : grid.clientHeight) - gutterTotal
    let latest = start

    function onMove(ev: PointerEvent) {
      const delta = (isCol ? ev.clientX : ev.clientY) - startPos
      latest = resizeTracks(start, index, delta, totalPx)
      // Written straight to the DOM during the drag: going through React state
      // would re-render every pane and refit every xterm on each frame.
      if (isCol) grid!.style.gridTemplateColumns = tracksToTemplate(latest, GUTTER_PX)
      else grid!.style.gridTemplateRows = tracksToTemplate(latest, GUTTER_PX)
    }

    function finish() {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', finish)
      handle.removeEventListener('pointercancel', finish)
      try {
        handle.releasePointerCapture(pointerId)
      } catch {
        /* capture already released */
      }
      document.body.classList.remove('resizing-col', 'resizing-row')
      if (isCol) setColFr(latest)
      else setRowFr(latest)
    }

    handle.setPointerCapture(pointerId)
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', finish)
    handle.addEventListener('pointercancel', finish)
    document.body.classList.add(isCol ? 'resizing-col' : 'resizing-row')
  }

  return (
    <>
      <div
        ref={gridRef}
        className="grid-layout"
        style={{
          gridTemplateColumns: tracksToTemplate(colFr, GUTTER_PX),
          gridTemplateRows: tracksToTemplate(rowFr, GUTTER_PX),
        }}
      >
        {visible.map((p, i) => (
          <Pane
            key={p.id}
            pane={p}
            onClose={() => removePane(p.id)}
            // Tracks alternate pane / gutter / pane, so cell n sits on line 2n+1.
            gridColumn={2 * (i % cols) + 1}
            gridRow={2 * Math.floor(i / cols) + 1}
          />
        ))}

        {/*
          Gutters are rendered one segment per adjacent cell rather than as a
          single full-span strip. A full-span column gutter and a full-span row
          gutter would overlap where they cross — dead centre of a 2x2 grid —
          and whichever rendered last would swallow the other's grab target.
          Segmenting leaves the intersections empty, so every gutter is
          grabbable along its whole length. All segments of one gutter share an
          index, so dragging any of them resizes the entire column or row.
        */}
        {Array.from({ length: Math.max(0, cols - 1) }, (_, c) =>
          Array.from({ length: rows }, (_, r) => (
            <div
              key={`col-gutter-${c}-${r}`}
              className="grid-gutter grid-gutter-col"
              style={{ gridColumn: 2 * (c + 1), gridRow: 2 * r + 1 }}
              onPointerDown={(e) => startGutterDrag(e, 'col', c)}
              onDoubleClick={() => setColFr(evenTracks(cols))}
              role={r === 0 ? 'separator' : undefined}
              aria-orientation={r === 0 ? 'vertical' : undefined}
              aria-label={r === 0 ? `Resize columns ${c + 1} and ${c + 2}` : undefined}
              aria-hidden={r === 0 ? undefined : true}
              title="Drag to resize · double-click to reset"
            />
          )),
        )}

        {Array.from({ length: Math.max(0, rows - 1) }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <div
              key={`row-gutter-${r}-${c}`}
              className="grid-gutter grid-gutter-row"
              style={{ gridRow: 2 * (r + 1), gridColumn: 2 * c + 1 }}
              onPointerDown={(e) => startGutterDrag(e, 'row', r)}
              onDoubleClick={() => setRowFr(evenTracks(rows))}
              role={c === 0 ? 'separator' : undefined}
              aria-orientation={c === 0 ? 'horizontal' : undefined}
              aria-label={c === 0 ? `Resize rows ${r + 1} and ${r + 2}` : undefined}
              aria-hidden={c === 0 ? undefined : true}
              title="Drag to resize · double-click to reset"
            />
          )),
        )}
      </div>
      <DragGhost />
    </>
  )
}
