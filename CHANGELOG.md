# Changelog

All notable changes to NEO are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project loosely adheres to [SemVer](https://semver.org/).

## [Unreleased]

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
