# Terminal Panes

Native macOS Tauri 2 app for running 1–10 Claude Code (or shell) sessions in parallel inside a single frosted-glass window. Matrix-green phosphor terminals. Per-pane activity awareness — know exactly which Claude is waiting on you.

## Dev

```bash
npm install
npm run tauri dev
```

## Tests

```bash
npm test                              # frontend (vitest)
cd src-tauri && cargo test --lib      # backend (state machine, regex, tail buffer)
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
