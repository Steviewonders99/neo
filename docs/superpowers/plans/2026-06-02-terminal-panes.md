# Terminal Panes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native macOS Tauri 2 app that runs 1–10 Claude Code (or shell) sessions in parallel inside a single frosted-glass window with matrix-green phosphor terminals and per-pane activity awareness.

**Architecture:** Three layers separated by Tauri IPC. Rust owns PTYs (`portable-pty`) and an activity-detection state machine. The webview hosts a React app that renders an auto-grid of xterm.js terminals, with a Zustand store as the single source of truth. macOS-native vibrancy via `tauri-plugin-window-vibrancy`; notifications via `tauri-plugin-notification`.

**Tech Stack:** Tauri 2, Rust (tokio, portable-pty, regex, serde), React 18 + Vite + TypeScript, xterm.js (DOM renderer + fit + web-links addons), Zustand, uuid.

**Spec:** `docs/superpowers/specs/2026-06-02-terminal-panes-design.md` — read this before starting.

**Working directory:** `/Users/stevenjunop/terminal-panes` (already initialized as a git repo with the spec committed).

---

## Phase 0 — Scaffold

### Task 1: Initialize Tauri 2 + React + Vite project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Scaffold via `create-tauri-app`**

Run from `/Users/stevenjunop/terminal-panes`:

```bash
npm create tauri-app@latest -- --yes \
  --template react-ts \
  --manager npm \
  --identifier com.junop.terminalpanes \
  --rc false \
  ./tmp-scaffold
```

This creates a fresh scaffold in `./tmp-scaffold`. We will move its contents to the repo root.

- [ ] **Step 2: Merge scaffold into repo root**

```bash
shopt -s dotglob
mv tmp-scaffold/* tmp-scaffold/.[!.]* ./ 2>/dev/null || true
rmdir tmp-scaffold
shopt -u dotglob
```

Then delete the Vite default content we will not use:

```bash
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg public/tauri.svg
rm -f src-tauri/src/main.rs src-tauri/src/lib.rs
```

- [ ] **Step 3: Replace `src-tauri/src/main.rs`**

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    terminal_panes_lib::run();
}
```

- [ ] **Step 4: Create `src-tauri/src/lib.rs`**

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Update `src-tauri/Cargo.toml` package name to match the lib reference**

Open `src-tauri/Cargo.toml`. Ensure:

```toml
[package]
name = "terminal-panes"
version = "0.1.0"
edition = "2021"

[lib]
name = "terminal_panes_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 6: Replace `src/main.tsx`**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 7: Replace `src/App.tsx`**

```tsx
// src/App.tsx
export default function App() {
  return <div style={{ color: '#39FF14', padding: 24 }}>terminal-panes scaffold OK</div>
}
```

- [ ] **Step 8: Create `src/styles.css` placeholder**

```css
/* src/styles.css */
:root { color-scheme: dark; }
html, body, #root { margin: 0; height: 100%; background: transparent; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
```

- [ ] **Step 9: Install + run once**

```bash
npm install
npm run tauri dev
```

Expected: a window opens showing the green "terminal-panes scaffold OK" text on a default-styled background.

Quit the dev process (Ctrl+C) once verified.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "Scaffold Tauri 2 + React + Vite + TS"
```

---

### Task 2: Add Rust dependencies (PTY, vibrancy, notifications, regex, tokio)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add crates to `src-tauri/Cargo.toml`**

Append to the `[dependencies]` table:

```toml
window-vibrancy = "0.7"
tauri-plugin-notification = "2"
portable-pty = "0.8"
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync", "io-util", "time"] }
regex = "1"
once_cell = "1"
uuid = { version = "1", features = ["v4", "serde"] }
parking_lot = "0.12"
bytes = "1"
strip-ansi-escapes = "0.2"
dirs = "5"
```

- [ ] **Step 2: Register plugins in `lib.rs`**

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify build**

```bash
npm run tauri dev
```

Expected: same scaffold window opens. No build errors.

Quit when verified.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs
git commit -m "Add PTY, vibrancy, notification, regex, tokio deps"
```

---

### Task 3: Add frontend dependencies (xterm.js, zustand, uuid)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install xterm @xterm/addon-fit @xterm/addon-web-links zustand uuid
npm install -D @types/uuid
```

- [ ] **Step 2: Verify dev server still boots**

```bash
npm run tauri dev
```

Expected: scaffold window opens.

Quit when verified.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add xterm.js, zustand, uuid frontend deps"
```

---

## Phase 1 — Native macOS window

### Task 4: Configure Tauri window for transparency + overlay title bar

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Edit window config**

Open `src-tauri/tauri.conf.json`. Replace the `app.windows` array with:

```json
"windows": [
  {
    "title": "Terminal Panes",
    "width": 1400,
    "height": 900,
    "minWidth": 900,
    "minHeight": 600,
    "decorations": true,
    "transparent": true,
    "titleBarStyle": "Overlay",
    "hiddenTitle": true,
    "backgroundColor": "#00000000"
  }
]
```

Also set `app.macOSPrivateApi`:

```json
"app": {
  "macOSPrivateApi": true,
  "windows": [ ... ]
}
```

(`macOSPrivateApi: true` is required for transparency + vibrancy to compose correctly on recent macOS versions.)

- [ ] **Step 2: Boot to verify**

```bash
npm run tauri dev
```

Expected: window opens with no title text, traffic lights visible in the top-left, transparent (will currently show whatever the default backdrop is until vibrancy is applied next task).

Quit when verified.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "Configure window: transparent, overlay title bar, no title"
```

---

### Task 5: Apply NSVisualEffectView vibrancy

**Files:**
- Create: `src-tauri/src/window.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `src-tauri/src/window.rs`**

```rust
// src-tauri/src/window.rs
use tauri::{WebviewWindow, Manager, Runtime};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

pub fn apply_macos_vibrancy<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        let _ = apply_vibrancy(
            window,
            NSVisualEffectMaterial::HudWindow,
            None,
            Some(12.0),
        );
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window;
    Ok(())
}

pub fn configure_main_window<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        apply_macos_vibrancy(&window)?;
    }
    Ok(())
}
```

- [ ] **Step 2: Wire into `lib.rs`**

```rust
// src-tauri/src/lib.rs
mod window;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            window::configure_main_window(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Boot to verify**

```bash
npm run tauri dev
```

Expected: window now has the live frosted/blurred backdrop showing your desktop wallpaper through it. Drag a colorful window behind it to confirm real-time blur.

Quit when verified.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/window.rs src-tauri/src/lib.rs
git commit -m "Apply NSVisualEffectView HudWindow vibrancy"
```

---

### Task 6: WindowChrome component (drag region + traffic light reservation)

**Files:**
- Create: `src/components/WindowChrome.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/WindowChrome.tsx`**

```tsx
// src/components/WindowChrome.tsx
export function WindowChrome() {
  return (
    <div className="window-chrome">
      <div className="window-chrome-traffic-light-spacer" />
      <div className="window-chrome-drag" />
    </div>
  )
}
```

- [ ] **Step 2: Add CSS to `src/styles.css`**

```css
.window-chrome {
  display: flex;
  align-items: stretch;
  height: 32px;
  user-select: none;
}
.window-chrome-traffic-light-spacer {
  width: 80px;
  flex-shrink: 0;
}
.window-chrome-drag {
  flex: 1;
  -webkit-app-region: drag;
}
```

- [ ] **Step 3: Mount in `App.tsx`**

```tsx
// src/App.tsx
import { WindowChrome } from './components/WindowChrome'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WindowChrome />
      <div style={{ flex: 1, color: '#39FF14', padding: 24 }}>
        terminal-panes scaffold OK
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Boot to verify**

```bash
npm run tauri dev
```

Expected: window can be dragged by grabbing the empty area right of the traffic lights. Traffic lights are not overlapped by app content.

Quit when verified.

- [ ] **Step 5: Commit**

```bash
git add src/components/WindowChrome.tsx src/App.tsx src/styles.css
git commit -m "Add WindowChrome with drag region and traffic-light spacer"
```

---

## Phase 2 — Theme tokens

### Task 7: Theme tokens and global CSS

**Files:**
- Create: `src/theme.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/theme.ts`**

```ts
// src/theme.ts
export const theme = {
  surface: 'transparent',
  surfaceChrome: 'rgba(20, 22, 20, 0.45)',
  surfaceTerminal: 'rgba(0, 12, 0, 0.55)',
  border: 'rgba(57, 255, 20, 0.20)',
  borderFocus: 'rgba(57, 255, 20, 0.75)',
  borderAttn: 'rgba(57, 255, 20, 1.00)',

  green: '#39FF14',
  greenDim: '#27B30E',
  greenSoft: '#1B6E07',
  greenGlow: '0 0 6px rgba(57, 255, 20, 0.55)',

  text: 'rgba(220, 230, 220, 0.92)',
  textMuted: 'rgba(160, 175, 160, 0.65)',

  fontMono: 'JetBrains Mono, SF Mono, ui-monospace, monospace',
  fontUI: '-apple-system, BlinkMacSystemFont, sans-serif',
} as const

export const xtermTheme = {
  background: 'rgba(0,0,0,0)',
  foreground: theme.green,
  cursor: theme.green,
  cursorAccent: '#000000',
  selectionBackground: 'rgba(57,255,20,0.25)',
  black: '#0a0f0a',
  red: '#ff5c57',
  green: theme.green,
  yellow: '#f3f99d',
  blue: '#57c7ff',
  magenta: '#ff6ac1',
  cyan: '#9aedfe',
  white: '#f1f1f0',
  brightBlack: '#2a322a',
  brightRed: '#ff6e67',
  brightGreen: '#5cff3a',
  brightYellow: '#f9ffaa',
  brightBlue: '#82d7ff',
  brightMagenta: '#ff84d1',
  brightCyan: '#b3f3fe',
  brightWhite: '#ffffff',
} as const
```

- [ ] **Step 2: Expose tokens as CSS custom properties**

Append to `src/styles.css`:

```css
:root {
  --green: #39FF14;
  --green-dim: #27B30E;
  --green-soft: #1B6E07;
  --green-glow: 0 0 6px rgba(57, 255, 20, 0.55);

  --surface-chrome: rgba(20, 22, 20, 0.45);
  --surface-terminal: rgba(0, 12, 0, 0.55);

  --border: rgba(57, 255, 20, 0.20);
  --border-focus: rgba(57, 255, 20, 0.75);
  --border-attn: rgba(57, 255, 20, 1.00);

  --text: rgba(220, 230, 220, 0.92);
  --text-muted: rgba(160, 175, 160, 0.65);

  --font-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
  --font-ui: -apple-system, BlinkMacSystemFont, sans-serif;
}

body { color: var(--text); }
```

- [ ] **Step 3: Commit**

```bash
git add src/theme.ts src/styles.css
git commit -m "Add theme tokens (TS + CSS variables)"
```

---

## Phase 3 — Frontend state & grid math (pure, TDD)

### Task 8: Grid math (gridForCount) with tests

**Files:**
- Create: `src/lib/grid.ts`
- Create: `src/lib/grid.test.ts`
- Modify: `package.json` (add vitest)

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add `test` script to `package.json`**

In `package.json`, in the `scripts` section, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write failing tests in `src/lib/grid.test.ts`**

```ts
// src/lib/grid.test.ts
import { describe, it, expect } from 'vitest'
import { gridForCount } from './grid'

describe('gridForCount', () => {
  it('returns 1x1 for 1 pane', () => {
    expect(gridForCount(1)).toEqual({ columns: '1fr', rows: '1fr', cells: 1 })
  })
  it('returns 2x1 for 2 panes', () => {
    expect(gridForCount(2)).toEqual({ columns: '1fr 1fr', rows: '1fr', cells: 2 })
  })
  it('returns 3x1 for 3 panes', () => {
    expect(gridForCount(3)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr', cells: 3 })
  })
  it('returns 2x2 for 4 panes', () => {
    expect(gridForCount(4)).toEqual({ columns: '1fr 1fr', rows: '1fr 1fr', cells: 4 })
  })
  it('returns 3x2 for 5 panes (1 empty cell)', () => {
    expect(gridForCount(5)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr', cells: 6 })
  })
  it('returns 3x2 for 6 panes', () => {
    expect(gridForCount(6)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr', cells: 6 })
  })
  it('returns 3x3 for 7,8,9 panes', () => {
    for (const n of [7, 8, 9]) {
      expect(gridForCount(n)).toEqual({ columns: '1fr 1fr 1fr', rows: '1fr 1fr 1fr', cells: 9 })
    }
  })
  it('returns 5x2 for 10 panes', () => {
    expect(gridForCount(10)).toEqual({ columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr', cells: 10 })
  })
  it('clamps below 1 to 1', () => {
    expect(gridForCount(0)).toEqual({ columns: '1fr', rows: '1fr', cells: 1 })
  })
  it('clamps above 10 to 10', () => {
    expect(gridForCount(11)).toEqual({ columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr', cells: 10 })
  })
})
```

- [ ] **Step 4: Run to confirm failure**

```bash
npm test -- grid
```

Expected: FAIL (`gridForCount` not exported).

- [ ] **Step 5: Implement `src/lib/grid.ts`**

```ts
// src/lib/grid.ts
export type GridSpec = { columns: string; rows: string; cells: number }

const TABLE: Record<number, GridSpec> = {
  1:  { columns: '1fr',                 rows: '1fr',          cells: 1 },
  2:  { columns: '1fr 1fr',             rows: '1fr',          cells: 2 },
  3:  { columns: '1fr 1fr 1fr',         rows: '1fr',          cells: 3 },
  4:  { columns: '1fr 1fr',             rows: '1fr 1fr',      cells: 4 },
  5:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr',      cells: 6 },
  6:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr',      cells: 6 },
  7:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  8:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  9:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  10: { columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr',      cells: 10 },
}

export function gridForCount(n: number): GridSpec {
  const clamped = Math.min(10, Math.max(1, n | 0))
  return TABLE[clamped]
}
```

- [ ] **Step 6: Run tests, expect PASS**

```bash
npm test -- grid
```

Expected: 10 passed.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/grid.ts src/lib/grid.test.ts
git commit -m "Add gridForCount() with table-driven tests"
```

---

### Task 9: Pane types + Zustand store

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/store.ts`

- [ ] **Step 1: Create `src/state/types.ts`**

```ts
// src/state/types.ts
export type PaneStatus = 'starting' | 'idle' | 'working' | 'attention' | 'exited'
export type PaneKind = 'claude' | 'shell'

export type Pane = {
  id: string
  repo: string
  cwd: string
  task: string
  kind: PaneKind
  status: PaneStatus
  unread: boolean
  exitCode: number | null
}

export type AddPaneArgs = {
  cwd: string
  task: string
  kind: PaneKind
}
```

- [ ] **Step 2: Create `src/state/store.ts`**

```ts
// src/state/store.ts
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Pane, PaneStatus, AddPaneArgs } from './types'

type State = {
  panes: Pane[]
  focusedId: string | null
  isLauncherOpen: boolean

  // mutations (pure store ops — IPC wiring happens in lib/ipc.ts)
  insertPane(pane: Pane): void
  removePaneLocal(id: string): void
  setFocus(id: string): void
  updateStatus(id: string, status: PaneStatus): void
  setExitCode(id: string, code: number | null): void
  renameTask(id: string, task: string): void
  openLauncher(): void
  closeLauncher(): void
}

export const useStore = create<State>((set) => ({
  panes: [],
  focusedId: null,
  isLauncherOpen: false,

  insertPane: (pane) =>
    set((s) => ({ panes: [...s.panes, pane], focusedId: pane.id })),

  removePaneLocal: (id) =>
    set((s) => {
      const panes = s.panes.filter((p) => p.id !== id)
      const focusedId = s.focusedId === id ? (panes[0]?.id ?? null) : s.focusedId
      return { panes, focusedId }
    }),

  setFocus: (id) =>
    set((s) => ({
      focusedId: id,
      panes: s.panes.map((p) => (p.id === id ? { ...p, unread: false } : p)),
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      panes: s.panes.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              unread:
                status === 'attention' && s.focusedId !== id ? true : p.unread,
            }
          : p,
      ),
    })),

  setExitCode: (id, code) =>
    set((s) => ({
      panes: s.panes.map((p) => (p.id === id ? { ...p, exitCode: code } : p)),
    })),

  renameTask: (id, task) =>
    set((s) => ({ panes: s.panes.map((p) => (p.id === id ? { ...p, task } : p)) })),

  openLauncher: () => set({ isLauncherOpen: true }),
  closeLauncher: () => set({ isLauncherOpen: false }),
}))

export function makePane(args: AddPaneArgs): Pane {
  const repo = args.cwd.split('/').filter(Boolean).pop() ?? args.cwd
  return {
    id: uuid(),
    repo,
    cwd: args.cwd,
    task: args.task,
    kind: args.kind,
    status: 'starting',
    unread: false,
    exitCode: null,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/state/types.ts src/state/store.ts
git commit -m "Add Pane types and Zustand store (local mutations only)"
```

---

## Phase 4 — Rust PTY core

### Task 10: PaneId + PtyManager skeleton with one-shot spawn test

**Files:**
- Create: `src-tauri/src/pty.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `src-tauri/src/pty.rs`**

```rust
// src-tauri/src/pty.rs
use std::collections::HashMap;
use std::io::Write;
use std::sync::Arc;

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

pub type PaneId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnRequest {
    pub id: PaneId,
    pub cwd: String,
    pub kind: PaneKind,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PaneKind {
    Claude,
    Shell,
}

pub struct PaneHandle {
    pub master_writer: Box<dyn Write + Send>,
    pub child_killer: Box<dyn portable_pty::ChildKiller + Send + Sync>,
    pub resize_handle: Box<dyn portable_pty::MasterPty + Send>,
    pub input_tx: mpsc::UnboundedSender<Vec<u8>>,
}

#[derive(Default)]
pub struct PtyManager {
    panes: Mutex<HashMap<PaneId, PaneHandle>>,
}

impl PtyManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn has(&self, id: &str) -> bool {
        self.panes.lock().contains_key(id)
    }

    pub fn remove(&self, id: &str) -> Option<PaneHandle> {
        self.panes.lock().remove(id)
    }

    pub fn insert(&self, id: PaneId, handle: PaneHandle) {
        self.panes.lock().insert(id, handle);
    }
}

pub fn build_command(kind: PaneKind, cwd: &str) -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l");
    if matches!(kind, PaneKind::Claude) {
        cmd.arg("-c");
        cmd.arg("claude");
    }
    cmd.cwd(cwd);
    // Preserve key env vars
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }
    cmd
}

pub fn open_pty(size: PtySize) -> portable_pty::PtyPair {
    native_pty_system()
        .openpty(size)
        .expect("failed to open PTY")
}
```

- [ ] **Step 2: Hold the manager in app state via `lib.rs`**

```rust
// src-tauri/src/lib.rs
mod pty;
mod window;

use std::sync::Arc;
use pty::PtyManager;

pub fn run() {
    let pty_manager = PtyManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage::<Arc<PtyManager>>(pty_manager)
        .setup(|app| {
            window::configure_main_window(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run tauri dev
```

Expected: app boots with the scaffold UI. No runtime errors. (We are not invoking pane_spawn yet.)

Quit when verified.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/pty.rs src-tauri/src/lib.rs
git commit -m "Add PtyManager skeleton and SpawnRequest types"
```

---

### Task 11: `pane_spawn` command + reader task → emit pty:data

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/pty.rs`

- [ ] **Step 1: Add a `spawn_pane` function to `pty.rs`**

Append to `src-tauri/src/pty.rs`:

```rust
use std::io::Read;
use tauri::{AppHandle, Emitter, Runtime};

pub async fn spawn_pane<R: Runtime>(
    app: AppHandle<R>,
    manager: Arc<PtyManager>,
    req: SpawnRequest,
) -> Result<(), String> {
    let pair = open_pty(PtySize {
        rows: req.rows,
        cols: req.cols,
        pixel_width: 0,
        pixel_height: 0,
    });

    let mut child = pair
        .slave
        .spawn_command(build_command(req.kind, &req.cwd))
        .map_err(|e| format!("spawn failed: {e}"))?;

    drop(pair.slave); // close slave end on parent side

    let mut master_reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("reader clone failed: {e}"))?;
    let master_writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("writer take failed: {e}"))?;
    let child_killer = child.clone_killer();

    let (input_tx, mut input_rx) = mpsc::unbounded_channel::<Vec<u8>>();
    manager.insert(
        req.id.clone(),
        PaneHandle {
            master_writer,
            child_killer,
            resize_handle: pair.master,
            input_tx,
        },
    );

    // Reader task: PTY stdout → emit pty:data:{id}
    let id_for_reader = req.id.clone();
    let app_for_reader = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match master_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = buf[..n].to_vec();
                    let _ = app_for_reader
                        .emit(&format!("pty:data:{id_for_reader}"), chunk);
                }
                Err(_) => break,
            }
        }
        // Child exited or pipe closed
        let code = child.wait().ok().and_then(|s| s.exit_code().map(|c| c as i32));
        let _ = app_for_reader.emit(&format!("pty:exit:{id_for_reader}"), code);
    });

    // Writer task: input channel → master writer
    let id_for_writer = req.id.clone();
    let manager_for_writer = manager.clone();
    std::thread::spawn(move || {
        while let Some(bytes) = input_rx.blocking_recv() {
            // Lock the manager, get a fresh writer reference
            let mut guard = manager_for_writer.panes.lock();
            if let Some(handle) = guard.get_mut(&id_for_writer) {
                let _ = handle.master_writer.write_all(&bytes);
                let _ = handle.master_writer.flush();
            } else {
                break;
            }
        }
    });

    Ok(())
}

pub fn resize_pane(manager: &PtyManager, id: &str, cols: u16, rows: u16) -> Result<(), String> {
    let mut guard = manager.panes.lock();
    let handle = guard.get_mut(id).ok_or_else(|| "no such pane".to_string())?;
    handle
        .resize_handle
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("resize failed: {e}"))
}

pub fn write_to_pane(manager: &PtyManager, id: &str, data: Vec<u8>) -> Result<(), String> {
    let guard = manager.panes.lock();
    let handle = guard.get(id).ok_or_else(|| "no such pane".to_string())?;
    handle
        .input_tx
        .send(data)
        .map_err(|_| "input channel closed".to_string())
}

pub fn kill_pane(manager: &PtyManager, id: &str) -> Result<(), String> {
    let mut handle = manager.remove(id).ok_or_else(|| "no such pane".to_string())?;
    handle.child_killer.kill().map_err(|e| format!("kill failed: {e}"))
}
```

(`manager.panes` field needs to be `pub(crate)` for the writer task to access. Update the struct above accordingly: change `panes: Mutex<...>` to `pub(crate) panes: Mutex<...>`.)

- [ ] **Step 2: Make `panes` field crate-visible**

In `src-tauri/src/pty.rs`, edit the struct:

```rust
#[derive(Default)]
pub struct PtyManager {
    pub(crate) panes: Mutex<HashMap<PaneId, PaneHandle>>,
}
```

- [ ] **Step 3: Create `src-tauri/src/commands.rs`**

```rust
// src-tauri/src/commands.rs
use std::sync::Arc;
use tauri::{AppHandle, Runtime, State};

use crate::pty::{kill_pane, resize_pane, spawn_pane, write_to_pane, PtyManager, SpawnRequest};

#[tauri::command]
pub async fn pane_spawn<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, Arc<PtyManager>>,
    req: SpawnRequest,
) -> Result<(), String> {
    spawn_pane(app, manager.inner().clone(), req).await
}

#[tauri::command]
pub fn pane_write(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    write_to_pane(manager.inner(), &id, data)
}

#[tauri::command]
pub fn pane_resize(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    resize_pane(manager.inner(), &id, cols, rows)
}

#[tauri::command]
pub fn pane_kill(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
) -> Result<(), String> {
    kill_pane(manager.inner(), &id)
}
```

- [ ] **Step 4: Register commands in `lib.rs`**

```rust
// src-tauri/src/lib.rs
mod commands;
mod pty;
mod window;

use std::sync::Arc;
use pty::PtyManager;

pub fn run() {
    let pty_manager = PtyManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage::<Arc<PtyManager>>(pty_manager)
        .setup(|app| {
            window::configure_main_window(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pane_spawn,
            commands::pane_write,
            commands::pane_resize,
            commands::pane_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Build to verify compilation**

```bash
npm run tauri dev
```

Expected: app boots, no compile errors.

Quit when verified.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/pty.rs src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "Add pane_spawn/write/resize/kill commands and PTY reader thread"
```

---

## Phase 5 — Typed IPC + terminal mount

### Task 12: Typed IPC wrappers

**Files:**
- Create: `src/lib/ipc.ts`

- [ ] **Step 1: Create `src/lib/ipc.ts`**

```ts
// src/lib/ipc.ts
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { PaneKind, PaneStatus } from '../state/types'

export type SpawnRequest = {
  id: string
  cwd: string
  kind: PaneKind
  cols: number
  rows: number
}

export const ipc = {
  spawn: (req: SpawnRequest) => invoke<void>('pane_spawn', { req }),
  write: (id: string, data: number[]) => invoke<void>('pane_write', { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    invoke<void>('pane_resize', { id, cols, rows }),
  kill: (id: string) => invoke<void>('pane_kill', { id }),
}

export function listenPtyData(
  id: string,
  cb: (bytes: Uint8Array) => void,
): Promise<UnlistenFn> {
  return listen<number[]>(`pty:data:${id}`, (e) => cb(new Uint8Array(e.payload)))
}

export function listenPtyExit(
  id: string,
  cb: (code: number | null) => void,
): Promise<UnlistenFn> {
  return listen<number | null>(`pty:exit:${id}`, (e) => cb(e.payload))
}

export function listenActivity(
  id: string,
  cb: (status: PaneStatus) => void,
): Promise<UnlistenFn> {
  return listen<PaneStatus>(`activity:${id}`, (e) => cb(e.payload))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ipc.ts
git commit -m "Add typed IPC wrappers"
```

---

### Task 13: Terminal component (xterm.js mount)

**Files:**
- Create: `src/components/Terminal.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/Terminal.tsx`**

```tsx
// src/components/Terminal.tsx
import { useEffect, useRef } from 'react'
import { Terminal as Xterm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'

import { ipc, listenPtyData, listenPtyExit } from '../lib/ipc'
import { xtermTheme, theme } from '../theme'
import { useStore } from '../state/store'

type Props = { paneId: string }

export function Terminal({ paneId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<Xterm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const setExitCode = useStore((s) => s.setExitCode)
  const updateStatus = useStore((s) => s.updateStatus)

  useEffect(() => {
    if (!containerRef.current) return
    const term = new Xterm({
      theme: xtermTheme,
      fontFamily: theme.fontMono,
      fontSize: 13,
      lineHeight: 1.2,
      allowTransparency: true,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)
    fit.fit()

    xtermRef.current = term
    fitRef.current = fit

    // Input: xterm → Rust
    const disposeData = term.onData((data) => {
      const bytes = Array.from(new TextEncoder().encode(data))
      ipc.write(paneId, bytes).catch(() => {})
    })

    // Output: Rust → xterm
    let unsubData: (() => void) | null = null
    let unsubExit: (() => void) | null = null
    listenPtyData(paneId, (bytes) => term.write(bytes)).then((u) => (unsubData = u))
    listenPtyExit(paneId, (code) => {
      setExitCode(paneId, code)
      updateStatus(paneId, 'exited')
    }).then((u) => (unsubExit = u))

    // Initial spawn must already have happened; just request a resize on mount
    const initialCols = term.cols
    const initialRows = term.rows
    ipc.resize(paneId, initialCols, initialRows).catch(() => {})

    // Window/container resize
    const ro = new ResizeObserver(() => {
      fit.fit()
      ipc.resize(paneId, term.cols, term.rows).catch(() => {})
    })
    ro.observe(containerRef.current)

    return () => {
      disposeData.dispose()
      unsubData?.()
      unsubExit?.()
      ro.disconnect()
      term.dispose()
    }
  }, [paneId, setExitCode, updateStatus])

  return <div ref={containerRef} className="terminal-mount" />
}
```

- [ ] **Step 2: Add CSS**

Append to `src/styles.css`:

```css
.terminal-mount {
  height: 100%;
  width: 100%;
  background: var(--surface-terminal);
  padding: 6px 8px;
  box-sizing: border-box;
}
.terminal-mount .xterm,
.terminal-mount .xterm-viewport,
.terminal-mount .xterm-screen {
  background: transparent !important;
}
.terminal-mount .xterm-rows {
  text-shadow: var(--green-glow);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal.tsx src/styles.css
git commit -m "Add Terminal component (xterm.js mount, input/output wiring)"
```

---

### Task 14: Pane + PaneHeader components

**Files:**
- Create: `src/components/Pane.tsx`
- Create: `src/components/PaneHeader.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/PaneHeader.tsx`**

```tsx
// src/components/PaneHeader.tsx
import { useState } from 'react'
import { useStore } from '../state/store'
import type { Pane } from '../state/types'

type Props = { pane: Pane; onClose: () => void }

export function PaneHeader({ pane, onClose }: Props) {
  const renameTask = useStore((s) => s.renameTask)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(pane.task)

  const dot =
    pane.status === 'attention'
      ? 'var(--green)'
      : pane.status === 'working'
      ? 'var(--green-dim)'
      : pane.status === 'exited'
      ? 'var(--text-muted)'
      : 'var(--green-soft)'

  return (
    <div className="pane-header">
      <span className="pane-status-dot" style={{ background: dot }} />
      <span className="pane-repo">{pane.repo}</span>
      <span className="pane-sep">·</span>
      {editing ? (
        <input
          className="pane-task-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            renameTask(pane.id, draft.trim() || pane.task)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameTask(pane.id, draft.trim() || pane.task)
              setEditing(false)
            }
            if (e.key === 'Escape') {
              setDraft(pane.task)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span
          className="pane-task"
          onClick={() => {
            setDraft(pane.task)
            setEditing(true)
          }}
        >
          {pane.task || <em className="placeholder">untitled</em>}
        </span>
      )}
      <span className="pane-spacer" />
      {pane.status === 'exited' && (
        <span className="pane-exit-code">exit {pane.exitCode ?? '?'}</span>
      )}
      <button className="pane-close" onClick={onClose} aria-label="close pane">
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/Pane.tsx`**

```tsx
// src/components/Pane.tsx
import { useStore } from '../state/store'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)

  const isFocused = focusedId === pane.id
  const cls = [
    'pane',
    `status-${pane.status}`,
    isFocused ? 'focused' : '',
    pane.unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} onMouseDown={() => setFocus(pane.id)}>
      <PaneHeader pane={pane} onClose={onClose} />
      <div className="pane-body">
        <Terminal paneId={pane.id} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Append styles**

Append to `src/styles.css`:

```css
.pane {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-chrome);
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  transition: border-color 120ms ease;
}
.pane.focused { border-color: var(--border-focus); }
.pane.status-working.focused .pane-body { animation: breathe 1.2s ease-in-out infinite; }
.pane.status-attention { border-color: var(--border-attn); box-shadow: 0 0 12px rgba(57,255,20,0.35); }
.pane.status-attention.unread { animation: attn-pulse 600ms ease-in-out infinite; }
.pane.status-exited { opacity: 0.7; }
.pane.status-exited .pane-repo,
.pane.status-exited .pane-task { text-decoration: line-through; }

.pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-family: var(--font-ui);
  font-size: 12px;
  background: rgba(0,0,0,0.18);
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.pane-status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 5px currentColor;
}
.pane-repo { color: var(--green); font-weight: 600; }
.pane-sep { color: var(--text-muted); }
.pane-task { color: var(--text); cursor: text; }
.pane-task .placeholder { color: var(--text-muted); font-style: italic; }
.pane-task-input {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border-focus);
  color: var(--text);
  font: inherit;
  padding: 1px 6px;
  border-radius: 3px;
  outline: none;
}
.pane-spacer { flex: 1; }
.pane-exit-code { color: var(--text-muted); font-size: 11px; }
.pane-close {
  background: transparent; border: none; color: var(--text-muted); font-size: 16px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.pane-close:hover { color: var(--green); }
.pane-body { flex: 1; min-height: 0; }

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
@keyframes attn-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(57,255,20,0.45); }
  50% { box-shadow: 0 0 18px rgba(57,255,20,0.85); }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Pane.tsx src/components/PaneHeader.tsx src/styles.css
git commit -m "Add Pane + PaneHeader components with status visuals"
```

---

### Task 15: GridLayout and addPane wiring

**Files:**
- Create: `src/components/GridLayout.tsx`
- Modify: `src/state/store.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `addPane` and `removePane` to the store**

In `src/state/store.ts`, extend the `State` type and implementation:

```ts
// inside State type, append:
  addPane(args: AddPaneArgs): Promise<void>
  removePane(id: string): Promise<void>
```

And the implementations (in the `create<State>((set, get) => ({` — change `(set)` to `(set, get)`):

```ts
addPane: async (args) => {
  if (get().panes.length >= 10) return
  const pane = makePane(args)
  set((s) => ({ panes: [...s.panes, pane], focusedId: pane.id }))
  const { ipc } = await import('../lib/ipc')
  try {
    await ipc.spawn({
      id: pane.id,
      cwd: pane.cwd,
      kind: pane.kind,
      cols: 80,
      rows: 24,
    })
  } catch (err) {
    set((s) => ({
      panes: s.panes.map((p) =>
        p.id === pane.id ? { ...p, status: 'exited', exitCode: -1 } : p,
      ),
    }))
    console.error('spawn failed', err)
  }
},

removePane: async (id) => {
  const { ipc } = await import('../lib/ipc')
  try {
    await ipc.kill(id)
  } catch {
    /* already dead */
  }
  set((s) => {
    const panes = s.panes.filter((p) => p.id !== id)
    const focusedId = s.focusedId === id ? (panes[0]?.id ?? null) : s.focusedId
    return { panes, focusedId }
  })
},
```

- [ ] **Step 2: Create `src/components/GridLayout.tsx`**

```tsx
// src/components/GridLayout.tsx
import { useStore } from '../state/store'
import { gridForCount } from '../lib/grid'
import { Pane } from './Pane'

export function GridLayout() {
  const panes = useStore((s) => s.panes)
  const removePane = useStore((s) => s.removePane)
  const spec = gridForCount(panes.length)

  return (
    <div
      className="grid-layout"
      style={{
        gridTemplateColumns: spec.columns,
        gridTemplateRows: spec.rows,
      }}
    >
      {panes.map((p) => (
        <Pane key={p.id} pane={p} onClose={() => removePane(p.id)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add grid CSS**

Append to `src/styles.css`:

```css
.grid-layout {
  flex: 1;
  display: grid;
  gap: 8px;
  padding: 8px;
  min-height: 0;
}
```

- [ ] **Step 4: Replace `src/App.tsx`**

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { WindowChrome } from './components/WindowChrome'
import { GridLayout } from './components/GridLayout'
import { useStore } from './state/store'

export default function App() {
  const panes = useStore((s) => s.panes)
  const addPane = useStore((s) => s.addPane)
  const openLauncher = useStore((s) => s.openLauncher)

  // Boot with one default Claude pane in the current home dir
  useEffect(() => {
    if (panes.length === 0) {
      const home =
        // @ts-expect-error tauri injects this
        (typeof window !== 'undefined' && window.__TAURI__?.path?.homeDir) || null
      addPane({ cwd: home || '/Users/stevenjunop', task: 'new session', kind: 'claude' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-root">
      <WindowChrome />
      <GridLayout />
      <button
        className="fab-new-pane"
        onClick={openLauncher}
        disabled={panes.length >= 10}
        aria-label="new pane"
      >
        ＋
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Add app-root + FAB CSS**

Append to `src/styles.css`:

```css
.app-root { height: 100vh; display: flex; flex-direction: column; }
.fab-new-pane {
  position: fixed;
  bottom: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-focus);
  background: rgba(57,255,20,0.18);
  color: var(--green);
  font-size: 22px;
  font-family: var(--font-mono);
  cursor: pointer;
  backdrop-filter: blur(8px);
  text-shadow: var(--green-glow);
  transition: transform 100ms ease;
}
.fab-new-pane:hover { transform: scale(1.06); }
.fab-new-pane:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 6: Boot and verify ONE working terminal**

```bash
npm run tauri dev
```

Expected: window opens; after ~1 second a single pane appears running `claude` (or showing an error if `claude` isn't on PATH — that's still a valid PTY spawn). You can type and see input echoed.

If `claude` isn't installed, the pane will show `command not found` from your shell — that proves PTY plumbing works. We will revisit shell PATH issues in Task 23 (launcher) by allowing `kind: shell`.

Quit when verified.

- [ ] **Step 7: Commit**

```bash
git add src/components/GridLayout.tsx src/App.tsx src/state/store.ts src/styles.css
git commit -m "Add GridLayout, addPane/removePane wiring, default boot pane"
```

---

## Phase 6 — Rust activity detection (TDD)

### Task 16: ANSI strip + tail buffer (unit-tested)

**Files:**
- Create: `src-tauri/src/activity.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod activity;`)

- [ ] **Step 1: Add `mod activity;` to `src-tauri/src/lib.rs`**

After `mod commands;`:

```rust
mod activity;
```

- [ ] **Step 2: Write failing tests**

Create `src-tauri/src/activity.rs`:

```rust
// src-tauri/src/activity.rs

/// Ring buffer of the last `cap` bytes of decoded, ANSI-stripped text.
pub struct TailBuffer {
    buf: Vec<u8>,
    cap: usize,
}

impl TailBuffer {
    pub fn new(cap: usize) -> Self {
        Self { buf: Vec::with_capacity(cap), cap }
    }

    pub fn push(&mut self, chunk: &[u8]) {
        let stripped = strip_ansi_escapes::strip(chunk);
        for &b in stripped.iter() {
            if self.buf.len() == self.cap {
                self.buf.remove(0);
            }
            self.buf.push(b);
        }
    }

    pub fn as_str(&self) -> std::borrow::Cow<'_, str> {
        String::from_utf8_lossy(&self.buf)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_ansi_color_codes() {
        let mut tb = TailBuffer::new(1024);
        tb.push(b"\x1b[31mhello\x1b[0m world");
        assert_eq!(tb.as_str(), "hello world");
    }

    #[test]
    fn drops_oldest_when_capacity_exceeded() {
        let mut tb = TailBuffer::new(4);
        tb.push(b"abcdef");
        assert_eq!(tb.as_str(), "cdef");
    }

    #[test]
    fn handles_empty_chunk() {
        let mut tb = TailBuffer::new(16);
        tb.push(b"");
        assert_eq!(tb.as_str(), "");
    }
}
```

- [ ] **Step 3: Run tests (fail first, then pass)**

```bash
cd src-tauri && cargo test activity::
```

Expected: 3 tests pass (the code is already complete; TDD checkpoint is structural — if any fail, fix before moving on).

- [ ] **Step 4: Commit**

```bash
cd .. && git add src-tauri/src/activity.rs src-tauri/src/lib.rs
git commit -m "Add TailBuffer with ANSI strip + ring drop tests"
```

---

### Task 17: Attention pattern matcher (TDD)

**Files:**
- Modify: `src-tauri/src/activity.rs`

- [ ] **Step 1: Append failing tests to `src-tauri/src/activity.rs`**

```rust
// append to activity.rs

use once_cell::sync::Lazy;
use regex::RegexSet;

static ATTENTION_PATTERNS: Lazy<RegexSet> = Lazy::new(|| {
    RegexSet::new([
        r"(?i)Do you want to proceed\?",
        r"\(y/N\)\s*$",
        r"\(y/n\)\s*$",
        r"(?i)permission to (run|edit|write|read)",
        r"\[y/n/a\]",
        r"❯\s*$",
    ])
    .expect("valid regex set")
});

pub fn is_attention(tail: &str) -> bool {
    ATTENTION_PATTERNS.is_match(tail.trim_end_matches(|c: char| c.is_whitespace() && c != '\n').trim_end())
}

#[cfg(test)]
mod attention_tests {
    use super::*;

    #[test]
    fn detects_do_you_want_to_proceed() {
        assert!(is_attention("Some output\nDo you want to proceed?"));
    }

    #[test]
    fn detects_y_n_prompt() {
        assert!(is_attention("continue? (y/N) "));
        assert!(is_attention("are you sure? (y/n)"));
    }

    #[test]
    fn detects_permission_phrasing() {
        assert!(is_attention("Claude needs permission to run rm -rf"));
        assert!(is_attention("permission to edit file"));
    }

    #[test]
    fn detects_y_n_a_choice() {
        assert!(is_attention("approve? [y/n/a]"));
    }

    #[test]
    fn detects_idle_prompt_arrow() {
        assert!(is_attention("some stuff\n❯ "));
    }

    #[test]
    fn ignores_normal_output() {
        assert!(!is_attention("npm install completed"));
        assert!(!is_attention("warning: foo"));
    }
}
```

- [ ] **Step 2: Run tests**

```bash
cd src-tauri && cargo test activity::
```

Expected: all 9 tests pass.

- [ ] **Step 3: Commit**

```bash
cd .. && git add src-tauri/src/activity.rs
git commit -m "Add attention pattern matcher with regex set"
```

---

### Task 18: Activity state machine (TDD)

**Files:**
- Modify: `src-tauri/src/activity.rs`

- [ ] **Step 1: Append failing tests**

```rust
// append to activity.rs

use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ActivityState {
    Starting,
    Working,
    Idle,
    Attention,
}

pub struct ActivityDetector {
    tail: TailBuffer,
    state: ActivityState,
    last_output: Instant,
    silence_threshold: Duration,
}

impl ActivityDetector {
    pub fn new() -> Self {
        Self {
            tail: TailBuffer::new(4096),
            state: ActivityState::Starting,
            last_output: Instant::now(),
            silence_threshold: Duration::from_millis(800),
        }
    }

    /// Call when bytes arrive on the PTY. Returns the new state if it changed.
    pub fn on_output(&mut self, chunk: &[u8]) -> Option<ActivityState> {
        self.tail.push(chunk);
        self.last_output = Instant::now();
        self.set(ActivityState::Working)
    }

    /// Call periodically (e.g. every 250 ms). Returns the new state if it changed.
    pub fn tick(&mut self) -> Option<ActivityState> {
        if self.state == ActivityState::Working
            && self.last_output.elapsed() >= self.silence_threshold
        {
            let next = if is_attention(&self.tail.as_str()) {
                ActivityState::Attention
            } else {
                ActivityState::Idle
            };
            return self.set(next);
        }
        None
    }

    fn set(&mut self, next: ActivityState) -> Option<ActivityState> {
        if self.state == next {
            None
        } else {
            self.state = next;
            Some(next)
        }
    }

    pub fn state(&self) -> ActivityState {
        self.state
    }
}

#[cfg(test)]
mod state_machine_tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn output_transitions_to_working() {
        let mut d = ActivityDetector::new();
        assert_eq!(d.on_output(b"some output"), Some(ActivityState::Working));
        assert_eq!(d.state(), ActivityState::Working);
    }

    #[test]
    fn no_double_emit_when_already_working() {
        let mut d = ActivityDetector::new();
        d.on_output(b"a");
        assert_eq!(d.on_output(b"b"), None);
    }

    #[test]
    fn silence_with_normal_tail_goes_idle() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_millis(20);
        d.on_output(b"build complete\n");
        sleep(Duration::from_millis(40));
        assert_eq!(d.tick(), Some(ActivityState::Idle));
    }

    #[test]
    fn silence_with_attention_tail_goes_attention() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_millis(20);
        d.on_output(b"Run command? (y/N) ");
        sleep(Duration::from_millis(40));
        assert_eq!(d.tick(), Some(ActivityState::Attention));
    }

    #[test]
    fn tick_before_silence_returns_none() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_secs(10);
        d.on_output(b"x");
        assert_eq!(d.tick(), None);
    }
}
```

- [ ] **Step 2: Run tests**

```bash
cd src-tauri && cargo test activity::
```

Expected: all activity tests pass (3 tail + 6 attention + 5 state machine = 14).

- [ ] **Step 3: Commit**

```bash
cd .. && git add src-tauri/src/activity.rs
git commit -m "Add ActivityDetector state machine with silence-window TDD"
```

---

### Task 19: Wire ActivityDetector into the PTY reader

**Files:**
- Modify: `src-tauri/src/pty.rs`

- [ ] **Step 1: Update `PaneHandle` to hold the detector + add a per-pane ticker thread**

In `src-tauri/src/pty.rs`, change `PaneHandle`:

```rust
use std::sync::Arc;
use parking_lot::Mutex as PLMutex;
use crate::activity::{ActivityDetector, ActivityState};

pub struct PaneHandle {
    pub master_writer: Box<dyn Write + Send>,
    pub child_killer: Box<dyn portable_pty::ChildKiller + Send + Sync>,
    pub resize_handle: Box<dyn portable_pty::MasterPty + Send>,
    pub input_tx: mpsc::UnboundedSender<Vec<u8>>,
    pub detector: Arc<PLMutex<ActivityDetector>>,
    pub alive: Arc<std::sync::atomic::AtomicBool>,
}
```

And update `spawn_pane` (replace the reader thread and add a ticker thread):

```rust
pub async fn spawn_pane<R: Runtime>(
    app: AppHandle<R>,
    manager: Arc<PtyManager>,
    req: SpawnRequest,
) -> Result<(), String> {
    use std::sync::atomic::{AtomicBool, Ordering};

    let pair = open_pty(PtySize {
        rows: req.rows, cols: req.cols, pixel_width: 0, pixel_height: 0,
    });

    let mut child = pair
        .slave
        .spawn_command(build_command(req.kind, &req.cwd))
        .map_err(|e| format!("spawn failed: {e}"))?;
    drop(pair.slave);

    let mut master_reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let master_writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let child_killer = child.clone_killer();

    let (input_tx, mut input_rx) = mpsc::unbounded_channel::<Vec<u8>>();
    let detector = Arc::new(PLMutex::new(ActivityDetector::new()));
    let alive = Arc::new(AtomicBool::new(true));

    manager.insert(
        req.id.clone(),
        PaneHandle {
            master_writer,
            child_killer,
            resize_handle: pair.master,
            input_tx,
            detector: detector.clone(),
            alive: alive.clone(),
        },
    );

    // Reader thread
    let id_r = req.id.clone();
    let app_r = app.clone();
    let det_r = detector.clone();
    let alive_r = alive.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match master_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = buf[..n].to_vec();
                    // Activity hook
                    let changed = det_r.lock().on_output(&chunk);
                    if let Some(state) = changed {
                        let _ = app_r.emit(&format!("activity:{id_r}"), state);
                    }
                    let _ = app_r.emit(&format!("pty:data:{id_r}"), chunk);
                }
                Err(_) => break,
            }
        }
        let code = child.wait().ok().and_then(|s| s.exit_code().map(|c| c as i32));
        alive_r.store(false, Ordering::SeqCst);
        let _ = app_r.emit(&format!("pty:exit:{id_r}"), code);
    });

    // Writer thread (unchanged from before, kept here for completeness)
    let id_w = req.id.clone();
    let manager_w = manager.clone();
    std::thread::spawn(move || {
        while let Some(bytes) = input_rx.blocking_recv() {
            let mut guard = manager_w.panes.lock();
            if let Some(handle) = guard.get_mut(&id_w) {
                let _ = handle.master_writer.write_all(&bytes);
                let _ = handle.master_writer.flush();
            } else {
                break;
            }
        }
    });

    // Ticker thread — drives the silence-window check
    let id_t = req.id.clone();
    let app_t = app.clone();
    let det_t = detector.clone();
    let alive_t = alive.clone();
    std::thread::spawn(move || {
        use std::sync::atomic::Ordering;
        while alive_t.load(Ordering::SeqCst) {
            std::thread::sleep(std::time::Duration::from_millis(250));
            let changed = det_t.lock().tick();
            if let Some(state) = changed {
                let _ = app_t.emit(&format!("activity:{id_t}"), state);
            }
        }
    });

    Ok(())
}
```

- [ ] **Step 2: Build and boot**

```bash
npm run tauri dev
```

Expected: a Claude pane (or shell pane showing `command not found: claude`) boots. Open browser devtools (View → Developer → Show Web Inspector); in the console you should see no errors. The pane border behavior for activity will be visible after Task 20 wires the listener; for now we are confirming the Rust side still builds and runs.

Quit when verified.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/pty.rs
git commit -m "Wire ActivityDetector into PTY reader + ticker thread"
```

---

### Task 20: Frontend listens for activity events

**Files:**
- Modify: `src/components/Pane.tsx`

- [ ] **Step 1: Subscribe to activity events in `Pane.tsx`**

Add an effect to `src/components/Pane.tsx`:

```tsx
// src/components/Pane.tsx — full file
import { useEffect } from 'react'
import { useStore } from '../state/store'
import { listenActivity } from '../lib/ipc'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)
  const updateStatus = useStore((s) => s.updateStatus)

  useEffect(() => {
    let unsub: (() => void) | null = null
    listenActivity(pane.id, (status) => updateStatus(pane.id, status)).then(
      (u) => (unsub = u),
    )
    return () => {
      unsub?.()
    }
  }, [pane.id, updateStatus])

  const isFocused = focusedId === pane.id
  const cls = [
    'pane',
    `status-${pane.status}`,
    isFocused ? 'focused' : '',
    pane.unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} onMouseDown={() => setFocus(pane.id)}>
      <PaneHeader pane={pane} onClose={onClose} />
      <div className="pane-body">
        <Terminal paneId={pane.id} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Boot and verify**

```bash
npm run tauri dev
```

Expected: the pane status dot transitions from `idle` to `working` (greenDim) while text is streaming, then back to `idle` (greenSoft) when silent. Trigger a `(y/N)` prompt manually (e.g. spawn a shell pane and run `rm -i some-file` — we will add the launcher in the next task, so for now just rely on Claude or modify the App.tsx temporary boot to `kind: 'shell'`).

Quit when verified.

- [ ] **Step 3: Commit**

```bash
git add src/components/Pane.tsx
git commit -m "Listen for activity events and reflect in pane status"
```

---

## Phase 7 — Launcher + recent dirs

### Task 21: Recent-dirs persistence (Rust)

**Files:**
- Create: `src-tauri/src/recents.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: Create `src-tauri/src/recents.rs`**

```rust
// src-tauri/src/recents.rs
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentDir {
    pub cwd: String,
    pub repo: String,
    pub last_used_at: i64, // unix seconds
}

fn store_path() -> PathBuf {
    let mut p = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("com.junop.terminalpanes");
    fs::create_dir_all(&p).ok();
    p.push("recent.json");
    p
}

pub fn load() -> Vec<RecentDir> {
    let p = store_path();
    fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<RecentDir>>(&s).ok())
        .unwrap_or_default()
}

fn save(list: &[RecentDir]) -> std::io::Result<()> {
    let p = store_path();
    fs::write(&p, serde_json::to_string_pretty(list).unwrap_or_default())
}

pub fn add(cwd: &str) -> Vec<RecentDir> {
    let mut list = load();
    list.retain(|r| r.cwd != cwd);
    let repo = std::path::Path::new(cwd)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(cwd)
        .to_string();
    list.insert(
        0,
        RecentDir {
            cwd: cwd.to_string(),
            repo,
            last_used_at: chrono_secs(),
        },
    );
    list.truncate(20);
    save(&list).ok();
    list
}

fn chrono_secs() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
```

- [ ] **Step 2: Register module + add commands**

In `src-tauri/src/lib.rs`, add `mod recents;`. In `src-tauri/src/commands.rs`, append:

```rust
use crate::recents::{self, RecentDir};

#[tauri::command]
pub fn list_recent_dirs() -> Vec<RecentDir> {
    recents::load()
}

#[tauri::command]
pub fn add_recent_dir(cwd: String) -> Vec<RecentDir> {
    recents::add(&cwd)
}
```

And in `src-tauri/src/lib.rs`, append the two commands to `tauri::generate_handler!`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::pane_spawn,
    commands::pane_write,
    commands::pane_resize,
    commands::pane_kill,
    commands::list_recent_dirs,
    commands::add_recent_dir,
])
```

- [ ] **Step 3: Build and boot**

```bash
npm run tauri dev
```

Expected: compiles, boots.

Quit when verified.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/recents.rs src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "Add recent-dirs persistence + list/add commands"
```

---

### Task 22: PaneLauncher modal

**Files:**
- Create: `src/components/PaneLauncher.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/ipc.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend `src/lib/ipc.ts`**

Append to `src/lib/ipc.ts`:

```ts
export type RecentDir = { cwd: string; repo: string; lastUsedAt: number }

export const recentDirs = {
  list: () => invoke<RecentDir[]>('list_recent_dirs'),
  add: (cwd: string) => invoke<RecentDir[]>('add_recent_dir', { cwd }),
}
```

(Note: Rust returns `last_used_at` as snake_case; serde_json defaults preserve field names. If the Rust serialization keeps snake_case, also expose that field in the TS type accordingly. Adjust by adding `#[serde(rename_all = "camelCase")]` above the `RecentDir` struct in `src-tauri/src/recents.rs` to keep TS clean.)

Apply that rename — open `src-tauri/src/recents.rs` and change:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentDir {
    pub cwd: String,
    pub repo: String,
    pub last_used_at: i64,
}
```

- [ ] **Step 2: Create `src/components/PaneLauncher.tsx`**

```tsx
// src/components/PaneLauncher.tsx
import { useEffect, useState } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useStore } from '../state/store'
import { recentDirs, type RecentDir } from '../lib/ipc'

export function PaneLauncher() {
  const isOpen = useStore((s) => s.isLauncherOpen)
  const close = useStore((s) => s.closeLauncher)
  const addPane = useStore((s) => s.addPane)

  const [recents, setRecents] = useState<RecentDir[]>([])
  const [cwd, setCwd] = useState('')
  const [task, setTask] = useState('')
  const [kind, setKind] = useState<'claude' | 'shell'>('claude')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      recentDirs.list().then(setRecents).catch(() => setRecents([]))
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function browse() {
    const picked = await openDialog({ directory: true, multiple: false })
    if (typeof picked === 'string') setCwd(picked)
  }

  async function start() {
    if (!cwd) {
      setError('Pick a directory first')
      return
    }
    try {
      await addPane({ cwd, task: task.trim(), kind })
      await recentDirs.add(cwd)
      setCwd('')
      setTask('')
      close()
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  return (
    <div className="launcher-backdrop" onClick={close}>
      <div className="launcher" onClick={(e) => e.stopPropagation()}>
        <h2>New pane</h2>

        <label>Directory</label>
        <div className="launcher-row">
          <input
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            placeholder="/path/to/repo"
          />
          <button onClick={browse}>Browse…</button>
        </div>

        {recents.length > 0 && (
          <>
            <label>Recent</label>
            <div className="launcher-recents">
              {recents.map((r) => (
                <button
                  key={r.cwd}
                  className="launcher-recent"
                  onClick={() => setCwd(r.cwd)}
                  title={r.cwd}
                >
                  {r.repo} <span className="muted">{r.cwd}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <label>Primary task</label>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="what is Claude going to do?"
        />

        <label>Kind</label>
        <div className="launcher-row">
          <label className="radio">
            <input
              type="radio"
              checked={kind === 'claude'}
              onChange={() => setKind('claude')}
            />
            Claude
          </label>
          <label className="radio">
            <input
              type="radio"
              checked={kind === 'shell'}
              onChange={() => setKind('shell')}
            />
            Shell
          </label>
        </div>

        {error && <div className="launcher-error">{error}</div>}

        <div className="launcher-actions">
          <button onClick={close}>Cancel</button>
          <button className="primary" onClick={start}>
            Start
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Mount in `App.tsx`**

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { WindowChrome } from './components/WindowChrome'
import { GridLayout } from './components/GridLayout'
import { PaneLauncher } from './components/PaneLauncher'
import { useStore } from './state/store'

export default function App() {
  const panes = useStore((s) => s.panes)
  const addPane = useStore((s) => s.addPane)
  const openLauncher = useStore((s) => s.openLauncher)

  useEffect(() => {
    if (panes.length === 0) {
      addPane({ cwd: '/Users/stevenjunop', task: 'new session', kind: 'shell' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-root">
      <WindowChrome />
      <GridLayout />
      <button
        className="fab-new-pane"
        onClick={openLauncher}
        disabled={panes.length >= 10}
        aria-label="new pane"
      >
        ＋
      </button>
      <PaneLauncher />
    </div>
  )
}
```

(We default to `shell` on first boot so the user can verify PTY works even if Claude isn't installed yet.)

- [ ] **Step 4: Append launcher CSS**

Append to `src/styles.css`:

```css
.launcher-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 10;
}
.launcher {
  background: var(--surface-chrome);
  border: 1px solid var(--border-focus);
  border-radius: 10px;
  padding: 18px 20px;
  width: 520px;
  max-width: 90vw;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  display: flex; flex-direction: column; gap: 8px;
}
.launcher h2 { margin: 0 0 6px; color: var(--green); text-shadow: var(--green-glow); }
.launcher label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px; }
.launcher input[type="text"], .launcher input:not([type]) {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 8px;
  border-radius: 4px;
  font: inherit;
}
.launcher-row { display: flex; gap: 8px; align-items: center; }
.launcher-row input { flex: 1; }
.launcher button {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
}
.launcher button.primary {
  background: rgba(57,255,20,0.22);
  border-color: var(--border-focus);
  color: var(--green);
  text-shadow: var(--green-glow);
}
.launcher button:hover { border-color: var(--border-focus); }
.launcher .radio { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.launcher-recents { display: flex; flex-direction: column; gap: 2px; max-height: 130px; overflow-y: auto; }
.launcher-recent {
  text-align: left;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
}
.launcher-recent:hover { background: rgba(57,255,20,0.08); }
.launcher-recent .muted { color: var(--text-muted); font-size: 11px; margin-left: 8px; }
.launcher-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.launcher-error { color: #ff5c57; font-size: 12px; }
```

- [ ] **Step 5: Boot and verify**

```bash
npm run tauri dev
```

Expected:
1. First boot: one shell pane appears in your home directory.
2. Click the green "+" → launcher modal opens.
3. Browse, pick a directory, type a task, choose Claude or Shell, click Start.
4. New pane spawns; grid auto-rebalances to 2-up.
5. Repeat — add 3 more → grid becomes 2×2.
6. Close one → grid rebalances to 3-up.

Quit when verified.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaneLauncher.tsx src/lib/ipc.ts src/App.tsx src/styles.css src-tauri/src/recents.rs
git commit -m "Add PaneLauncher modal with recent dirs and Claude/shell choice"
```

---

## Phase 8 — Notifications + dock badge

### Task 23: Notifier — macOS notifications when window not key

**Files:**
- Create: `src-tauri/src/notifier.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/pty.rs`

- [ ] **Step 1: Create `src-tauri/src/notifier.rs`**

```rust
// src-tauri/src/notifier.rs
use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaneMeta {
    pub repo: String,
    pub task: String,
}

#[derive(Default)]
pub struct Notifier {
    /// Latest known repo + task per pane, set from the frontend.
    pub meta: Mutex<HashMap<String, PaneMeta>>,
    pub attention: Mutex<std::collections::HashSet<String>>,
}

impl Notifier {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn set_meta(&self, id: String, meta: PaneMeta) {
        self.meta.lock().insert(id, meta);
    }

    pub fn clear(&self, id: &str) {
        self.meta.lock().remove(id);
        self.attention.lock().remove(id);
    }

    pub fn on_attention<R: Runtime>(&self, app: &AppHandle<R>, id: &str) {
        let mut atts = self.attention.lock();
        let newly_added = atts.insert(id.to_string());
        let count = atts.len();
        drop(atts);

        if newly_added {
            let window_is_key = app
                .get_webview_window("main")
                .and_then(|w| w.is_focused().ok())
                .unwrap_or(false);

            if !window_is_key {
                let meta = self.meta.lock().get(id).cloned();
                if let Some(m) = meta {
                    let _ = app
                        .notification()
                        .builder()
                        .title(&format!("{} needs you", m.repo))
                        .body(&m.task)
                        .show();
                }
            }
        }

        set_badge(app, count);
    }

    pub fn on_not_attention<R: Runtime>(&self, app: &AppHandle<R>, id: &str) {
        let mut atts = self.attention.lock();
        atts.remove(id);
        let count = atts.len();
        drop(atts);
        set_badge(app, count);
    }
}

#[cfg(target_os = "macos")]
fn set_badge<R: Runtime>(app: &AppHandle<R>, count: usize) {
    let label = if count == 0 { None } else { Some(count.to_string()) };
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_badge_label(label);
    }
}

#[cfg(not(target_os = "macos"))]
fn set_badge<R: Runtime>(_app: &AppHandle<R>, _count: usize) {}
```

- [ ] **Step 2: Register Notifier in `lib.rs`**

```rust
// add to lib.rs
mod notifier;
use notifier::Notifier;

// inside run():
let notifier = Notifier::new();
// ...
.manage::<Arc<Notifier>>(notifier)
```

- [ ] **Step 3: Add `set_pane_meta` and `pane_focus` commands**

Append to `src-tauri/src/commands.rs`:

```rust
use crate::notifier::{Notifier, PaneMeta};

#[tauri::command]
pub fn set_pane_meta(
    notifier: State<'_, Arc<Notifier>>,
    id: String,
    repo: String,
    task: String,
) {
    notifier.set_meta(id, PaneMeta { repo, task });
}

#[tauri::command]
pub fn pane_focus(notifier: State<'_, Arc<Notifier>>, app: AppHandle, id: String) {
    notifier.on_not_attention(&app, &id);
}
```

Update `tauri::generate_handler!` in `lib.rs` to include them all:

```rust
.invoke_handler(tauri::generate_handler![
    commands::pane_spawn,
    commands::pane_write,
    commands::pane_resize,
    commands::pane_kill,
    commands::list_recent_dirs,
    commands::add_recent_dir,
    commands::set_pane_meta,
    commands::pane_focus,
])
```

- [ ] **Step 4: Emit notifier signals from the PTY ticker**

In `src-tauri/src/pty.rs`, modify the ticker thread inside `spawn_pane` to also call the Notifier:

```rust
// inside spawn_pane, replace the ticker thread block with:
let id_t = req.id.clone();
let app_t = app.clone();
let det_t = detector.clone();
let alive_t = alive.clone();
std::thread::spawn(move || {
    use std::sync::atomic::Ordering;
    while alive_t.load(Ordering::SeqCst) {
        std::thread::sleep(std::time::Duration::from_millis(250));
        let changed = det_t.lock().tick();
        if let Some(state) = changed {
            let _ = app_t.emit(&format!("activity:{id_t}"), state);
            if let Some(notifier) = app_t.try_state::<Arc<crate::notifier::Notifier>>() {
                match state {
                    crate::activity::ActivityState::Attention => {
                        notifier.inner().on_attention(&app_t, &id_t);
                    }
                    _ => {
                        notifier.inner().on_not_attention(&app_t, &id_t);
                    }
                }
            }
        }
    }
});
```

- [ ] **Step 5: Build/boot to verify**

```bash
npm run tauri dev
```

Expected: app boots normally. Notifications + badge will be wired in next.

Quit when verified.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/notifier.rs src-tauri/src/lib.rs src-tauri/src/commands.rs src-tauri/src/pty.rs
git commit -m "Add Notifier (notifications + dock badge) hooked to activity state"
```

---

### Task 24: Frontend sends pane meta and focus signals

**Files:**
- Modify: `src/lib/ipc.ts`
- Modify: `src/components/Pane.tsx`
- Modify: `src/state/store.ts`

- [ ] **Step 1: Extend `src/lib/ipc.ts`**

```ts
// append to src/lib/ipc.ts
export const meta = {
  set: (id: string, repo: string, task: string) =>
    invoke<void>('set_pane_meta', { id, repo, task }),
  focus: (id: string) => invoke<void>('pane_focus', { id }),
}
```

- [ ] **Step 2: Sync meta + focus from Pane component**

Replace `src/components/Pane.tsx`:

```tsx
import { useEffect } from 'react'
import { useStore } from '../state/store'
import { listenActivity, meta as paneMetaIpc } from '../lib/ipc'
import type { Pane as PaneType } from '../state/types'
import { PaneHeader } from './PaneHeader'
import { Terminal } from './Terminal'

type Props = { pane: PaneType; onClose: () => void }

export function Pane({ pane, onClose }: Props) {
  const focusedId = useStore((s) => s.focusedId)
  const setFocus = useStore((s) => s.setFocus)
  const updateStatus = useStore((s) => s.updateStatus)

  // Push meta whenever it changes so the Notifier has the latest title
  useEffect(() => {
    paneMetaIpc.set(pane.id, pane.repo, pane.task || 'untitled').catch(() => {})
  }, [pane.id, pane.repo, pane.task])

  // Listen for activity events
  useEffect(() => {
    let unsub: (() => void) | null = null
    listenActivity(pane.id, (status) => updateStatus(pane.id, status)).then(
      (u) => (unsub = u),
    )
    return () => {
      unsub?.()
    }
  }, [pane.id, updateStatus])

  const isFocused = focusedId === pane.id
  const cls = [
    'pane',
    `status-${pane.status}`,
    isFocused ? 'focused' : '',
    pane.unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function onMouseDown() {
    setFocus(pane.id)
    paneMetaIpc.focus(pane.id).catch(() => {})
  }

  return (
    <div className={cls} onMouseDown={onMouseDown}>
      <PaneHeader pane={pane} onClose={onClose} />
      <div className="pane-body">
        <Terminal paneId={pane.id} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Boot and verify**

```bash
npm run tauri dev
```

Expected:
1. Spawn a shell pane.
2. Run `read -p "Are you sure? (y/N) "` in it (or any command that ends with that prompt).
3. Switch to another app (Cmd-Tab to your browser).
4. A macOS notification appears: `{repo} needs you — {task}`.
5. The dock icon shows a `1` badge.
6. Click back to the app and click the pane → badge clears.

Quit when verified.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ipc.ts src/components/Pane.tsx
git commit -m "Sync pane meta + focus to Notifier; fire notifications and badge"
```

---

## Phase 9 — Final polish

### Task 25: Manual test checklist

**Files:**
- Create: `docs/manual-test-checklist.md`

- [ ] **Step 1: Write checklist**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/manual-test-checklist.md
git commit -m "Add manual test checklist"
```

---

### Task 26: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# Terminal Panes

Native macOS Tauri 2 app for running 1–10 Claude Code (or shell) sessions in parallel inside a single frosted-glass window. Matrix-green phosphor terminals. Per-pane activity awareness — know exactly which Claude is waiting on you.

## Dev

```bash
npm install
npm run tauri dev
```

## Tests

```bash
npm test                      # frontend (vitest)
cd src-tauri && cargo test    # backend (state machine, regex, tail buffer)
```

## Build a signed/notarized .app

Set `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and `APPLE_TEAM_ID`, then:

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/macos/Terminal Panes.app` and a notarized `.dmg`.

## Design + plan

- `docs/superpowers/specs/2026-06-02-terminal-panes-design.md`
- `docs/superpowers/plans/2026-06-02-terminal-panes.md`
- `docs/manual-test-checklist.md`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README"
```

---

## Done

Final boot check:

```bash
npm test
cd src-tauri && cargo test && cd ..
npm run tauri dev
```

Walk through `docs/manual-test-checklist.md`. Anything failing is a v1 bug; anything else is v1.1 scope.
