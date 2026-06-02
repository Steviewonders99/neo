# Manual test checklist — Terminal Panes v1

## Visual / window
- [ ] Window opens with real desktop blur (drag a colorful window behind it)
- [ ] Traffic lights visible, app dragable from header strip
- [ ] No title text shown
- [ ] Resize window — terminals refit, no scrollbar jitter

## Pane lifecycle
- [ ] App boots with one default shell pane in $HOME
- [ ] Click "+" — launcher opens; recent dirs visible after first use
- [ ] Add panes up to 10; "+" becomes disabled at 10
- [ ] Each new count rebalances the grid (verify 1,2,3,4,5,6,7,8,9,10)
- [ ] Close a middle pane — grid rebalances
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
