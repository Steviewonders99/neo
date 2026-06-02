# Contributing to NEO

Thanks for taking a look — contributions are very welcome.

## Quick orientation

- **Frontend** (React + TypeScript): `src/`
- **Backend** (Rust + Tauri): `src-tauri/src/`
- **Design + plan**: `docs/superpowers/`
- **Manual test checklist**: `docs/manual-test-checklist.md`

Read the design doc before proposing architecture changes — many decisions there look arbitrary out of context but tie to specific UX or performance tradeoffs.

## Dev setup

```bash
git clone https://github.com/stevenjunop/neo.git
cd neo
npm install
npm run tauri dev
```

First Rust compile takes 5–10 minutes. After that, hot-reload covers React/CSS and Tauri does incremental rebuilds on Rust changes.

## Before opening a PR

1. **Tests pass** — `npm test` and `cd src-tauri && cargo test --lib`. The activity state machine, attention regex set, tail buffer, and grid math all have unit tests; please add a test when you touch any of them.
2. **App boots** — `npm run tauri dev` opens the window without errors in the macOS Console or Tauri webview devtools.
3. **No new warnings** — run `npx tsc --noEmit` for the frontend and `cargo clippy --lib` for the backend. Existing dead-code warnings are tracked separately.
4. **Manual smoke** — run through `docs/manual-test-checklist.md` for anything you've touched in the UI/PTY/activity layers.

## Scope guidance

NEO is intentionally tight in v1. Things we **do** want:
- Bug fixes (especially around drag, vibrancy, PTY edge cases, Claude prompt detection)
- Better attention-pattern regexes (false negatives or new prompt phrasings)
- Performance improvements that don't add complexity
- Accessibility — keyboard shortcuts, focus management, screen reader support

Things to discuss in an issue **before** opening a PR:
- Settings UI / preferences (we deliberately deferred this)
- Cross-platform support (currently macOS-only by design)
- New plugins, MCP integrations, or LLM API calls
- Anything that significantly grows the install size or external surface area

Things we likely **won't** merge:
- Pane templates / profiles / saved sessions (planned but not in v1.5)
- Heavy theming systems (the matrix-green aesthetic is the brand)
- Replacing xterm.js with a custom renderer (massive scope; revisit if perf actually hurts)

## Commit style

- Imperative present tense: `Add attention regex for "are you sure" prompts`
- One topic per commit; squash WIP commits before pushing
- Reference issues when relevant: `Fix #42: pane border flickers on rapid output`

## License

By contributing you agree your code is offered under the [MIT License](LICENSE).
