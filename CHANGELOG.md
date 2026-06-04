# Changelog

All notable changes to NEO are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project loosely adheres to [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.1] — 2026-06-04

Visual + behavioral simplification based on real-world use of v0.1.0.

### Changed
- Switched xterm.js palette from matrix-green phosphor to a neutral VS Code–style palette on solid black — easier on the eyes across long sessions.
- Pane styling reverted to a single, calm border state.

### Removed
- Per-pane activity awareness (working / idle / attention transitions, border pulse, glow text-shadow).
- Auto-generated task titles from Claude's first response.
- Attention-state macOS notifications and the dock badge counter that depended on activity transitions.

The underlying `activity.rs` detector remains in the codebase but is no longer wired to the event stream — kept for anyone who wants to reintroduce activity-driven UX in a follow-up.

## [0.1.0] — 2026-06-02

First public release.

### Added
- Up to 10 Claude Code (or shell) sessions in a single native macOS window, auto-tiled by count.
- `NSVisualEffectView` vibrancy (HudWindow material) with overlay traffic-light title bar.
- Matrix-rain welcome screen with centered `$ cd` prompt — type a path and Enter to spawn a session.
- Per-pane activity state machine in Rust: `starting | working | idle | attention | exited`.
- Attention detection — pulses the pane border and fires macOS notifications when Claude is waiting on a permission prompt (or matching configurable regex set).
- Auto-attach repo context on Claude pane spawn: CLAUDE.md, README, package.json/Cargo.toml/pyproject.toml, last 5 git commits, top-level directories.
- Auto-generated task titles from the heuristic extracted from Claude's first response (no external API required).
- Minimize/archive panes to a dock-strip while keeping their PTY alive (Claude Code does not persist chats; NEO sidesteps the loss).
- Dock badge with the count of attention-state panes.
- Custom matrix-green N icon set generated through `tauri icon`.
- 14 backend unit tests (activity state machine, attention regex set, tail buffer) and 10 frontend tests (grid math).
- GitHub Actions CI (frontend + backend on every PR).

### Known limitations
- macOS only.
- No persistent session restore (planned for v0.2).
- No settings UI — knobs live in code.
- Heuristic title may be off; click the pane title to rename manually.
