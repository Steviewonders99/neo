# NEO — pane drag-reorder, repo-summary removal, 20-pane cap, Matrix icon

**Date:** 2026-07-27
**Status:** Approved

Four independent changes to NEO, the Tauri 2 multi-pane terminal app.

---

## A. Drag-and-drop pane reordering

### Rationale

`GridLayout` renders `panes[]` in array order into an auto-tiled CSS grid sized by
`gridForCount(n)`. Array order therefore *is* screen position, so reordering is a pure
array operation — the tiling engine needs no changes and the grid stays full-bleed.

### Behaviour

- Drag a pane by its **header**; drop it on any other pane.
- **Insert-and-shift** semantics (Trello/Jira): the dragged pane takes the target's slot
  and everything from that point onward slides one position.
- The auto-tiled grid is preserved — panes never float, overlap, or leave gaps.

### Core: `src/lib/reorder.ts`

```ts
export function movePaneOrder<T extends { id: string }>(
  list: T[], fromId: string, toId: string,
): T[]
```

Splice the source out at its original index, splice it back in at the target's original
index. Returns the same reference when the move is a no-op (same id, or either id absent).

The function operates on the **full** `panes` array, including minimized panes. This is
correct: the visible sequence is the full array filtered, and a splice on the full array
maps to the expected splice on the visible subsequence. Verified case — given
`[A(vis), B(min), C(vis), D(vis)]`, dragging A onto D yields `[B, C, D, A]`, i.e. visible
`[C, D, A]`, which matches insert-and-shift on visible `[A, C, D]`.

### Drag mechanics: pointer events, not HTML5 DnD

xterm renders to a `<canvas>`, and the app already contends with Tauri's
`data-tauri-drag-region` (three commits in the history are drag fixes). `setPointerCapture`
is immune to both — the header element keeps receiving `pointermove` even while the cursor
is over a terminal canvas.

- **Handle:** the pane header, excluding the minimize/close buttons and the task
  text/input, so inline rename still works.
- **Threshold:** a drag begins only after 5px of movement, so a plain click still just
  focuses the pane.
- **Hit-test:** `document.elementFromPoint()` → nearest `[data-pane-id]` ancestor.
- **Ghost:** a single fixed-position chip moved via direct `style.transform` mutation, so
  there is no React re-render per pointer move. `pointer-events: none` so it never
  interferes with hit-testing.
- **Cancel:** Escape key, or release outside any pane.

### State

`src/state/store.ts` gains `draggingId`, `dropTargetId`, and the actions `beginDrag`,
`setDropTarget`, `endDrag`, `movePane`. `dropTargetId` only changes when the pointer
crosses a pane boundary, so store churn is bounded.

### Styling

New CSS: `.pane.dragging` (dimmed, slightly scaled down), `.pane.drop-target` (bright green
edge and inset glow), `.pane-drag-ghost`, and `grab`/`grabbing` cursors on the header. The
header is explicitly `-webkit-app-region: no-drag` so Tauri's window drag cannot hijack it.

### Tests

`src/lib/reorder.test.ts` covers: forward move, backward move, same-id no-op, unknown-id
no-op, adjacent swap, and order preservation with minimized panes interleaved.

---

## B. Remove the repo-summary feature

The repo-context builder read CLAUDE.md, README, the manifest, the last 5 commits and the
top-level layout, then injected them as a Claude pane's first message. It is being removed
entirely, along with an orphaned task summarizer discovered during exploration.

**Delete**
- `src-tauri/src/repo_context.rs`
- `src-tauri/src/summarizer.rs` — dead code; `summarize_task` was never wired into any
  command handler, and its paired `listenTaskSuggestion` had no consumer.

**Edit**
- `src-tauri/src/lib.rs` — drop both `mod` declarations and the
  `repo_context::build_repo_context_cmd` handler entry.
- `src/lib/ipc.ts` — drop the `repoContext` export and `listenTaskSuggestion`.
- `src/components/PaneLauncher.tsx` — drop the context-injection block in `start()`, drop
  the now-unused `ipc` import, relabel the radio to just "Claude".
- `README.md`, `docs/LAUNCH-POSTS.md`, `package.json` description,
  `docs/manual-test-checklist.md` — remove the feature claims.

No Cargo dependencies become orphaned; both deleted modules were std-only.

---

## C. Raise the pane cap to 20, cap visible panes at 10

New `src/lib/limits.ts` exporting `MAX_PANES = 20` and `MAX_VISIBLE = 10`.

- **`addPane`** — hard stop at `MAX_PANES`. When `MAX_VISIBLE` panes are already visible,
  the new pane is created with `minimized: true` and lands directly in the archived dock.
  The on-screen grid never rearranges itself underneath the user.
- **`toggleMinimize`** — restoring a pane while `MAX_VISIBLE` are visible is refused; state
  is left untouched.
- **`MinimizedDock`** — chips become `.blocked` with an explanatory `title` when the grid is
  full, and the dock label reads `archived N · 10/10 visible`. This makes the refusal
  self-explanatory without introducing a toast system.
- **`App.tsx`** — the FAB is disabled at `MAX_PANES`.
- **`gridForCount`** — its existing clamp to 10 is retained as a safety net; by
  construction the visible count can no longer exceed it.

Pre-existing behaviour left unchanged: archiving every pane shows the Welcome screen with
the dock still above it.

---

## D. Matrix app icon

The current icon is a hard-edged, full-bleed black square with a green `N` — it has neither
the corner rounding nor the margin that every native macOS icon has.

**Generator:** `scripts/gen-icon.py`, committed so the icon is reproducible rather than a
one-off binary drop. Emits `src-tauri/icons/icon-source.png` at 1024×1024.

- Apple squircle mask — superellipse with n ≈ 5, art box 824/1024 with transparent margin,
  matching the macOS icon grid.
- Near-black `#000806` fill, matching the rain's background.
- Dim rain columns clipped inside the squircle, drawn from the app's own `GLYPHS` string at
  roughly 12% alpha, with a few near-white heads.
- Hero glyph `角` (U+89D2) centred in `#39FF14` with a multi-pass phosphor glow, set in
  Hiragino Kaku Gothic W8.

`npx tauri icon src-tauri/icons/icon-source.png` then regenerates `.icns`, `.ico`, every PNG
size, and the iOS/Android sets.

Noted at design time: `角` is a kanji and is *not* a member of the rain's `GLYPHS` string
(katakana, Latin, digits, symbols). The icon therefore does not literally share a glyph with
the rain animation. Adding it to `GLYPHS` was offered and declined for now.

---

## Out of scope

Keyboard reorder shortcuts · dragging panes into or out of the dock · reordering dock chips ·
persisting pane order across restarts · free-form pane resize · rounding the app UI (the
rounding request applies to the icon only) · adding `角` to the rain's `GLYPHS`.

---

## Verification

- `npm test` — existing 10 grid tests plus the new reorder tests.
- `npm run build` — `tsc` then `vite build`.
- `cargo check` in `src-tauri` — confirm no unused-module or unused-import warnings after
  the deletions.
- Visual read-back of the regenerated `src-tauri/icons/icon.png`.
- `docs/manual-test-checklist.md` updated for the new drag, cap, and icon behaviour.
