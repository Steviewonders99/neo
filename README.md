<div align="center">

![NEO](docs/images/hero-welcome.png)

# NEO

**A native macOS multi-pane terminal for running up to 10 Claude Code sessions in parallel.**

Frosted-glass window, clean monochrome terminals, repo context auto-injection — built for managing many Claude sessions in one place.

[![License: MIT](https://img.shields.io/badge/License-MIT-39FF14.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2-39FF14.svg)](https://tauri.app)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20intel-39FF14.svg)](#)

</div>

---

## Why NEO

Claude Code is great for one focused task at a time. But when you want to run **5–10 agents in parallel** — one per repo, branch, or feature — a single terminal becomes the bottleneck. iTerm/Warp splits work fine, but they don't *know* anything about your repos.

NEO is built for that exact workflow:

- **Up to 10 Claude (or shell) panes** in one window, auto-tiled by count.
- **Auto-attached repo context** — when you spawn a pane in a repo, NEO pre-loads CLAUDE.md, README, package.json/Cargo.toml/pyproject.toml, the last 5 commits, and the top-level layout into the session so Claude starts with full project awareness.
- **Archive panes without killing them** — minimize to a chip in the dock to preserve a long-running session without taking up grid space (Claude Code doesn't save chats; NEO keeps them alive).
- **Native macOS feel** — `NSVisualEffectView` vibrancy, transparent overlay title bar, hidden titles.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (native macOS bundle) |
| Frontend | React 19 + Vite + TypeScript |
| State | Zustand |
| Terminal | xterm.js |
| PTY | `portable-pty` (Rust) |
| Vibrancy | `window-vibrancy` (`NSVisualEffectMaterial::HudWindow`) |

## Quick start

```bash
git clone https://github.com/Steviewonders99/neo.git
cd neo
npm install
npm run tauri dev
```

First Tauri build downloads + compiles ~440 Rust crates (5–10 min). Subsequent builds are instant.

## Building a signed `.app`

```bash
export APPLE_ID=you@example.com
export APPLE_PASSWORD=<app-specific password>
export APPLE_TEAM_ID=ABCDE12345

npm run tauri build
```

Output: `src-tauri/target/release/bundle/macos/NEO.app` (signed + notarized) and `.dmg`.

## Tests

```bash
npm test                              # frontend (vitest — grid math)
cd src-tauri && cargo test --lib      # backend
```

14 backend tests + 10 frontend tests, all green.

## Usage

1. Launch NEO. You'll see the matrix rain welcome with a `$ cd` prompt centered.
2. Type a path (e.g. `~/projects/your-repo` or `cd /Users/you/code/app`) and hit Enter.
3. A Claude pane spawns in that directory with repo context auto-injected as its first message.
4. Add more panes with the `+` button (bottom-right). Auto-grid rebalances for 1–10 visible panes.
5. Minimize panes you want to keep alive but hidden — click the `−` in any pane header.

## Configuration

NEO ships with sensible defaults. The most useful knobs live in code rather than a settings UI for v1:

- Theme tokens: `src/theme.ts`
- xterm.js options: `src/components/Terminal.tsx`

## Roadmap

v1.5+:
- Persistent layouts (restore panes on relaunch)
- Drag-reorder panes
- Settings UI
- Custom keybindings
- Optional LLM-call task summarization (OpenRouter / Anthropic)
- Cross-platform (Windows Mica, Linux compositor blur)

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Design + plan

The full design document and the 26-task implementation plan are committed in this repo:

- [`docs/superpowers/specs/2026-06-02-terminal-panes-design.md`](docs/superpowers/specs/2026-06-02-terminal-panes-design.md)
- [`docs/superpowers/plans/2026-06-02-terminal-panes.md`](docs/superpowers/plans/2026-06-02-terminal-panes.md)
- [`docs/manual-test-checklist.md`](docs/manual-test-checklist.md)

## License

[MIT](LICENSE) © 2026 Steven Junop
