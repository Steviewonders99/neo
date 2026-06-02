# Terminal Panes — Design

**Status:** Draft for implementation
**Date:** 2026-06-02
**Owner:** Steven Junop

A native macOS Tauri application for running up to 10 Claude Code sessions side-by-side in a single window. Frosted-glass chrome, matrix-green phosphor on the terminals, per-pane activity awareness so you can monitor many agents at once and know exactly when one needs you.

---

## 1. Goals & non-goals

### Goals

- Run 1–10 Claude Code (or shell) sessions in parallel inside one native macOS window.
- Auto-grid layout: app picks the optimal grid for the current pane count; user can nudge dividers but doesn't compose splits manually.
- Per-pane awareness: each pane shows the repo it's running in and a user-set "primary task" string, plus a visual status indicator (`idle | working | attention | exited`).
- "Attention" detection: when a Claude session is waiting on the user (permission prompt, y/n confirmation, idle at prompt), the pane border pulses and — if the window isn't focused — a macOS notification fires with `{repo}: {task}`.
- Frosted-glass background via real `NSVisualEffectView`, indistinguishable from native apps like Outlook for macOS.
- Matrix-green phosphor aesthetic: terminal text in `#39FF14` with a soft CSS text-shadow glow.
- macOS-native packaging: signed, notarized `.app` bundle from `tauri build`.

### Non-goals (v1)

- Session persistence / restore on relaunch.
- Drag-to-reorder panes.
- Pane templates or profiles.
- Broadcast-input across panes.
- In-app scrollback search.
- Settings UI (constants live in code/config for v1).
- Auto-update mechanism.
- Windows or Linux support.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Tauri 2 | Native macOS bundle, small runtime, first-class Rust |
| Frontend | React + Vite + TypeScript | Most-documented xterm.js integration path |
| State | Zustand | Simple store for ~10 panes; Redux overkill |
| Terminal renderer | xterm.js (DOM renderer) | Allows CSS `text-shadow` for phosphor glow; perf is fine at 10 panes |
| PTY | `portable-pty` crate | Cross-platform PTY abstraction; we only use macOS path |
| Vibrancy | `tauri-plugin-window-vibrancy` | Wraps `NSVisualEffectView` |
| Notifications | `tauri-plugin-notification` | Native macOS Notification Center |

---

## 3. Architecture

Three layers with explicit IPC seams.

```
┌─────────────────────────────────────────────────────────────────┐
│  WEBVIEW (React + xterm.js)                                     │
│  • GridLayout — auto-grid from pane count                       │
│  • Pane — header (repo, task, status) + xterm.js mount          │
│  • PaneLauncher — recent dirs, "+ Claude" / "+ shell"           │
│  • Activity overlay — border pulses, badges, focus highlight    │
└──────────▲────────────────────────────────▲─────────────────────┘
           │ pane_spawn / pane_write        │ pty:data:{id}
           │ pane_resize / pane_kill        │ pty:exit:{id}
           │ pane_focus                     │ activity:{id}
           ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAURI CORE (Rust)                                              │
│  • PtyManager — one portable_pty child per pane                 │
│  • ActivityDetector — per-pane state machine on output stream   │
│  • Window — vibrancy + traffic-light positioning                │
│  • Notifier — macOS notifications, dock badge                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 PtyManager

- Owns a `HashMap<PaneId, PaneHandle>`.
- `PaneHandle` contains the master FD, the spawned child, the write half of an `mpsc` channel for input, and a `JoinHandle` for the reader task.
- On `pane_spawn`: opens a PTY, sets initial cols/rows from the request, then spawns the child in the chosen `cwd`. For `kind: claude` the child is `$SHELL -l -c 'claude'` (so the user's PATH and any aliases resolve `claude` correctly). For `kind: shell` it's `$SHELL -l`. Starts a tokio task that reads bytes in 4 KB chunks and emits `pty:data:{id}` to the webview.
- The same reader task tees output into the `ActivityDetector` for that pane.
- On `pane_kill`: send SIGHUP to the child, drop the handle, emit `pty:exit:{id}`.

### 3.2 ActivityDetector

A small state machine per pane.

States: `Starting → Idle | Working | Attention → Exited`.

Transitions:
- Any output → `Working`. Schedule a "silence" timer (800 ms).
- Silence timer fires:
  - Scan the last 4 KB of decoded, ANSI-stripped output (`tail`).
  - If `tail` matches any attention pattern → `Attention`.
  - Else → `Idle`.
- On output resuming and a new silence window completing, re-evaluate.
- `pane_focus` event from the webview clears any "unread" flag on a pane in `Attention`; the state itself doesn't change until output resumes.

Attention patterns (regex, case-insensitive, OR'd):

```
Do you want to proceed\?
\(y/N\)\s*$
\(y/n\)\s*$
permission to (run|edit|write|read)
\[y/n/a\]
❯\s*$
```

Tail buffer: ring buffer, 4 KB per pane. Cheap.

### 3.3 Window

- Single window, `tauri.conf.json`: `decorations: true`, `transparent: true`, `titleBarStyle: "Overlay"`, `hiddenTitle: true`, `backgroundColor: "#00000000"`.
- After window creation, call `apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(12.0))` for blurred rounded surface.
- Min size `900 × 600`, default `1400 × 900`.

### 3.4 Notifier

- Subscribes to `activity:{id}` events internally.
- Fires a macOS notification when **all** of: status transitions to `Attention`, the pane is not currently focused, and the window is not key (i.e., another app is foregrounded). Body: `{repo}: {task}`.
- Updates dock badge with the count of panes currently in `Attention`. Clears on focus.

---

## 4. Frontend

### 4.1 Component tree

```
<App>
  <WindowChrome/>                 ← drag region, optional title
  <GridLayout panes={paneList}>   ← computes grid from pane count
    <Pane id repo task status>
      <PaneHeader repo task status onRename/>
      <Terminal paneId/>
    </Pane>
    ...
  </GridLayout>
  <PaneLauncher open={isLauncherOpen}/>
</App>
```

### 4.2 Store

```ts
type PaneStatus = 'starting' | 'idle' | 'working' | 'attention' | 'exited'

type Pane = {
  id: string           // uuid; matches Rust-side PaneId
  repo: string         // basename of cwd
  cwd: string          // absolute path
  task: string         // user-entered, editable
  kind: 'claude' | 'shell'
  status: PaneStatus
  unread: boolean      // set on Attention while not focused
}

type State = {
  panes: Pane[]                              // ordered; grid follows this order
  focusedId: string | null
  isLauncherOpen: boolean

  addPane(args: AddPaneArgs): Promise<void>  // invokes pane_spawn, appends, focuses
  removePane(id: string): Promise<void>      // pane_kill + remove
  setFocus(id: string): void                 // also clears unread
  updateStatus(id: string, s: PaneStatus): void
  renameTask(id: string, task: string): void
  openLauncher(): void
  closeLauncher(): void
}
```

Single Zustand store. Pane order in the array is the grid order.

### 4.3 Auto-grid math

Deterministic lookup table on pane count, written as CSS Grid template strings:

| Count | Columns | Rows | Notes |
|---|---|---|---|
| 1 | `1fr` | `1fr` | |
| 2 | `1fr 1fr` | `1fr` | |
| 3 | `1fr 1fr 1fr` | `1fr` | |
| 4 | `1fr 1fr` | `1fr 1fr` | |
| 5 | `1fr 1fr 1fr` | `1fr 1fr` | 6th cell empty |
| 6 | `1fr 1fr 1fr` | `1fr 1fr` | |
| 7 | `1fr 1fr 1fr` | `1fr 1fr 1fr` | last 2 cells empty |
| 8 | `1fr 1fr 1fr` | `1fr 1fr 1fr` | last cell empty |
| 9 | `1fr 1fr 1fr` | `1fr 1fr 1fr` | |
| 10 | `1fr 1fr 1fr 1fr 1fr` | `1fr 1fr` | |

Dividers between cells can be dragged to nudge ratios (CSS grid `minmax` + a small drag handle component). Ratios reset on add/remove (acceptable for v1).

### 4.4 Pane lifecycle

1. User clicks "+" → `PaneLauncher` opens. List of recent cwds (persisted to `~/Library/Application Support/com.junop.terminalpanes/recent.json`), favorites pin, and a "Browse…" button using the Tauri dialog plugin. User picks a dir, types a "primary task," picks `Claude` or `Shell`, clicks Start.
2. `addPane` generates a uuid, calls `invoke('pane_spawn', { id, cwd, kind, cols, rows })`, appends a `Pane` row with `status: 'starting'`, sets it focused, closes the launcher.
3. The `<Terminal>` mounts an xterm.js instance, calls `listen('pty:data:' + id, …)`, writes incoming bytes to xterm.js. Keyboard/paste input is captured by xterm.js and forwarded via `invoke('pane_write', { id, data })`.
4. Resize: `ResizeObserver` on the pane element calls `fit()` (xterm.js addon) → `invoke('pane_resize', { id, cols, rows })`.
5. On `pty:exit:{id}`, status becomes `exited`; pane header shows the exit code; close-X stays.

---

## 5. Visual design

### 5.1 Tokens

```ts
export const theme = {
  surface:          'transparent',
  surfaceChrome:    'rgba(20, 22, 20, 0.45)',
  surfaceTerminal:  'rgba(0, 12, 0, 0.55)',
  border:           'rgba(57, 255, 20, 0.20)',
  borderFocus:      'rgba(57, 255, 20, 0.75)',
  borderAttn:       'rgba(57, 255, 20, 1.00)',

  green:            '#39FF14',
  greenDim:         '#27B30E',
  greenSoft:        '#1B6E07',
  greenGlow:        '0 0 6px rgba(57, 255, 20, 0.55)',

  text:             'rgba(220, 230, 220, 0.92)',
  textMuted:        'rgba(160, 175, 160, 0.65)',

  fontMono:         'JetBrains Mono, SF Mono, monospace',
  fontUI:           '-apple-system, BlinkMacSystemFont, sans-serif',
}
```

### 5.2 xterm.js theme

```ts
{
  background: 'rgba(0,0,0,0)',         // surface shows through
  foreground: '#39FF14',
  cursor: '#39FF14',
  cursorAccent: '#000000',
  selectionBackground: 'rgba(57,255,20,0.25)',
  black:'#0a0f0a', red:'#ff5c57', green:'#39FF14', yellow:'#f3f99d',
  blue:'#57c7ff', magenta:'#ff6ac1', cyan:'#9aedfe', white:'#f1f1f0',
  brightBlack:'#2a322a', brightRed:'#ff6e67', brightGreen:'#5cff3a',
  brightYellow:'#f9ffaa', brightBlue:'#82d7ff', brightMagenta:'#ff84d1',
  brightCyan:'#b3f3fe', brightWhite:'#ffffff',
}
```

xterm.js options: `allowTransparency: true`, `fontFamily: theme.fontMono`, `fontSize: 13`, `lineHeight: 1.2`. Renderer: **DOM** (default), so CSS `text-shadow: var(--green-glow)` applied to `.xterm-rows` gives the phosphor glow.

### 5.3 Status visualization

| Status | Border | Animation |
|---|---|---|
| `starting` | `border` dashed | none |
| `idle` | `borderFocus` solid (when focused) / `border` (when not) | none |
| `working` | `borderFocus` solid | 1.2 s opacity breathe (`0.6 → 1.0 → 0.6`) |
| `attention` | `borderAttn` + outer glow | 600 ms pulse, persists until pane focused |
| `exited` | `border` | header strikethrough |

All via CSS keyframes; no JS animation loop.

### 5.4 Pane header

```
┌────────────────────────────────────────────────────────┐
│  ● vyra · build UI                              [⋯][×] │  ← repo · task,  status dot,  menu, close
└────────────────────────────────────────────────────────┘
```

- Status dot color: `greenSoft` (idle), `greenDim` (working), `green` (attention).
- Click the task text → inline edit (input box) → Enter saves, Esc cancels.
- `[⋯]` menu: "Restart pane", "Open in Finder", "Copy cwd".
- `[×]` confirms before killing if `kind: claude`.

---

## 6. macOS integration

### 6.1 Window chrome

- `decorations: true` + `titleBarStyle: "Overlay"` + `hiddenTitle: true` so the macOS traffic lights float over our header area.
- Custom `WindowChrome` component reserves the top-left ~80 px for the traffic lights (`-webkit-app-region: drag` on the rest of the title strip for window dragging).

### 6.2 Vibrancy

```rust
use tauri_plugin_window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(12.0))?;
```

`HudWindow` material matches the Outlook-on-macOS aesthetic (lighter, less saturated than `Sidebar`). Corner radius 12 px to match modern macOS apps.

### 6.3 Notifications

Plugin: `tauri-plugin-notification`. Fired from Rust when a pane transitions to `Attention` AND the app's window is not key (i.e., the user is in another app). Body string: `{repo}: {task}`. Clicking the notification activates the app and focuses the pane via a `focus_pane` event keyed to the paneId.

### 6.4 Dock badge

`app.set_badge_label(Some(count_in_attention.to_string()))`. Updated whenever any pane's status transitions in/out of `Attention`. Cleared (`None`) when the count is zero.

### 6.5 Packaging

- Bundle identifier: `com.junop.terminalpanes`
- Category: `public.app-category.developer-tools`
- `tauri build` produces `.app` and `.dmg`. Codesigning + notarization via `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` env vars at build time.
- Icon: `src-tauri/icons/icon.icns` (custom matrix-green icon; placeholder until designed).

---

## 7. IPC contract

| Direction | Channel / command | Payload |
|---|---|---|
| Webview → Rust | `pane_spawn` | `{ id: string, cwd: string, kind: 'claude'\|'shell', cols: number, rows: number }` |
| Webview → Rust | `pane_write` | `{ id: string, data: number[] }` (UTF-8 bytes) |
| Webview → Rust | `pane_resize` | `{ id: string, cols: number, rows: number }` |
| Webview → Rust | `pane_kill` | `{ id: string }` |
| Webview → Rust | `pane_focus` | `{ id: string }` (clears unread; tells notifier) |
| Webview → Rust | `list_recent_dirs` | `{}` → `Array<{ cwd, repo, lastUsedAt }>` |
| Webview → Rust | `add_recent_dir` | `{ cwd: string }` |
| Rust → Webview | `pty:data:{id}` | `Uint8Array` (raw bytes) |
| Rust → Webview | `pty:exit:{id}` | `{ code: number \| null }` |
| Rust → Webview | `activity:{id}` | `{ status: PaneStatus }` |
| Rust → Webview | `focus_pane` | `{ id: string }` (from notification click) |

---

## 8. Error handling

- `pane_spawn` failure (binary not found, cwd doesn't exist, permission denied): Rust returns an `Err(String)`. Webview shows an inline error in the launcher; the row is not added.
- PTY reader task errors (EIO on child exit): emit `pty:exit:{id}` with the wait status, drop the handle. Webview transitions the pane to `exited`.
- `pane_write` to a missing/dead pane: silently dropped, logged.
- Vibrancy apply failure (older macOS, sandbox edge case): log and fall back to a solid dark surface (`#0c100c` with 0.9 alpha). App still works; just no real blur.
- Notification permission denied: log, no notifications fire; in-window border pulse still works.

---

## 9. Testing strategy

v1 is mostly hand-tested (this is a desktop app for a single user). Automated tests focus on the bits most likely to silently break:

- **Rust unit tests** (`#[cfg(test)]`):
  - `ActivityDetector` state machine: feed canned byte streams (working, idle, attention) and assert emitted state transitions.
  - Attention regex matrix: each pattern matches at least one real Claude prompt sample and rejects negative examples.
  - Auto-grid: pure function `gridForCount(n) → { cols, rows }` covered by a table-driven test.

- **Manual smoke checklist** (kept in `docs/manual-test-checklist.md`):
  - Spawn 1, 4, 10 panes; verify grid rebalances.
  - Kill a pane in the middle; verify others rearrange.
  - Trigger a Claude permission prompt; verify border pulses + notification fires when window isn't key.
  - Drag a divider; verify cells resize.
  - Window resize; verify xterm.js refits.
  - Verify vibrancy by dragging the window over a colorful wallpaper.

No e2e/UI automation for v1 — would burn the "ASAP" budget without proportionate value.

---

## 10. Project layout

```
terminal-panes/
├── src-tauri/                  # Rust
│   ├── src/
│   │   ├── main.rs             # tauri::Builder, plugin setup, command registration
│   │   ├── lib.rs              # re-exports for tests
│   │   ├── pty.rs              # PtyManager, PaneHandle, reader task
│   │   ├── activity.rs         # state machine, pattern matcher, tail buffer
│   │   ├── window.rs           # vibrancy, traffic light positioning helpers
│   │   ├── notifier.rs         # notification + dock badge logic
│   │   ├── recents.rs          # recent dirs persistence
│   │   └── commands.rs         # #[tauri::command] handlers
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                        # React + Vite
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── GridLayout.tsx
│   │   ├── Pane.tsx
│   │   ├── PaneHeader.tsx
│   │   ├── Terminal.tsx        # xterm.js wrapper
│   │   ├── PaneLauncher.tsx
│   │   └── WindowChrome.tsx
│   ├── state/
│   │   └── store.ts            # Zustand
│   ├── lib/
│   │   ├── grid.ts             # gridForCount()
│   │   └── ipc.ts              # typed invoke/listen wrappers
│   ├── theme.ts
│   └── styles.css
├── docs/
│   ├── superpowers/specs/2026-06-02-terminal-panes-design.md  # this file
│   └── manual-test-checklist.md
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 11. Open questions

None that block implementation. Defer to v1.1:

- Persistent layouts (save panes to disk, restore on relaunch).
- Drag-reorder panes.
- Settings UI (font size, glow intensity, attention regex list).
- Optional auto-update via `tauri-plugin-updater`.
