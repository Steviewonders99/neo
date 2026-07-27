# Manual test checklist — Terminal Panes v1

## Visual / window
- [ ] Dock icon is the squircle Matrix tile with the 角 glyph, sized like native icons
- [ ] Icon still legible at menu-bar / Cmd-Tab size
- [ ] Window opens with real desktop blur (drag a colorful window behind it)
- [ ] Traffic lights visible, app dragable from header strip
- [ ] No title text shown
- [ ] Resize window — terminals refit, no scrollbar jitter

## Pane lifecycle
- [ ] App boots with one default shell pane in $HOME
- [ ] Click "+" — launcher opens; recent dirs visible after first use
- [ ] Add panes up to 10; each new count rebalances the grid (verify 1–10)
- [ ] Add an 11th pane — it starts archived, the grid does not rearrange
- [ ] Dock reads `archived N · 10/10 visible`; chips are dimmed and unclickable
- [ ] Archive a visible pane — dock chips become clickable again
- [ ] Restore an archived pane — it takes the freed slot
- [ ] Add panes up to 20; "+" becomes disabled at 20
- [ ] Close a middle pane — grid rebalances

## Drag to reorder
- [ ] Press and hold a pane header, move >5px — pane dims, a ghost chip follows the cursor
- [ ] Hover another pane — it shows a bright green drop-target border
- [ ] Release — dragged pane takes that slot, the rest shift (insert-and-shift)
- [ ] Drag the first pane onto the last — it lands last, others shift left
- [ ] Press Escape mid-drag — nothing moves, ghost disappears
- [ ] Release outside any pane — nothing moves
- [ ] A plain click on a header (no movement) still just focuses the pane
- [ ] Clicking the task text still opens inline rename; `−` and `×` still work
- [ ] Terminal scrollback and text selection still work after a drag

## Resize
- [ ] Hover the gap between two panes — cursor becomes col-resize/row-resize, a green line appears
- [ ] Drag it — both neighbouring panes resize, no gaps or overlap appear
- [ ] Terminals refit and reflow to the new width (check `stty size` in a shell pane)
- [ ] Neither pane can be squeezed past ~15% of the grid
- [ ] Double-click a gutter — those tracks reset to even
- [ ] Resize the OS window — pane proportions are preserved
- [ ] Add or close a pane — the grid shape changes and tracks reset to even
- [ ] Closing a `claude` pane prompts confirm (not yet implemented; can be skipped for v1 or filed as follow-up)

## Per-pane
- [ ] Repo + task visible in header
- [ ] Click task → inline edit; Enter saves; Esc cancels
- [ ] xterm renders matrix-green text with phosphor glow
- [ ] Type input — characters echo
- [ ] Long output scrolls; selection works; copy via Cmd-C works
- [ ] Web URLs in output are clickable

## Activity awareness
- [ ] Idle pane: dim green dot
- [ ] Working pane (during output): brighter green dot
- [ ] Pane that fires a `(y/N)` prompt: border pulses bright green
- [ ] Switching to another app + attention → macOS notification fires
- [ ] Dock badge shows count of attention panes; clears when all visited
- [ ] Clicking a notification activates the window
