# Launch post drafts

Three variants for different channels. Tone is calibrated per platform. Pick one, edit voice to taste.

The repo URL: **https://github.com/Steviewonders99/neo**
The hero image: **docs/images/hero-welcome.png**

---

## Twitter / X (thread, 6 tweets)

**Tweet 1 (hook + hero image attached):**
> built a native macOS app that runs 10 Claude Code sessions side-by-side in one window. matrix-green phosphor on frosted glass. open source.
>
> github.com/Steviewonders99/neo

**Tweet 2:**
> Claude Code is great for one focused task. but when you want 5–10 agents running in parallel — one per repo, one per branch — a single terminal becomes the bottleneck. you can't tell which agent is thinking, finished, or waiting.

**Tweet 3:**
> NEO solves that. each pane has activity state baked in:
> 🟢 idle — Claude is waiting on you
> ⏳ working — output streaming
> 🚨 attention — permission prompt detected, border pulses, macOS notification fires if you're in another app

**Tweet 4:**
> when you spawn a Claude pane in a repo, NEO auto-injects CLAUDE.md + README + package.json + last 5 commits + top-level layout as the first message. Claude starts with full project awareness instead of having to discover the codebase from scratch.

**Tweet 5:**
> you can also archive panes without killing them. Claude Code doesn't persist chats — kill a pane, lose the conversation. NEO sidesteps that: minimize keeps the PTY alive in a dock strip. click the chip, the pane comes back.

**Tweet 6:**
> tauri 2 + rust pty + react + xterm.js + zustand. real NSVisualEffectView vibrancy (not CSS blur). full design doc + 26-task plan in the repo. MIT licensed. macOS-only for now.
>
> github.com/Steviewonders99/neo
>
> would love feedback from anyone running 3+ Claude agents at once.

---

## Show HN

**Title:** *Show HN: NEO – A native macOS multiplexer for running 10 Claude Code sessions in parallel*

**Body:**

Hi HN. I've been running 3-5 Claude Code agents at a time and the workflow has been falling apart — Cmd-Tab between iTerm tabs, missing permission prompts while in another window, losing the thread when a session ends because Claude Code doesn't persist chats. So I built NEO.

It's a native macOS Tauri 2 app that runs up to 10 Claude Code (or shell) sessions in a single auto-tiled window with frosted-glass vibrancy and matrix-green phosphor terminals. The differentiator vs iTerm/Warp splits is that the app is **Claude-aware**:

- Per-pane activity state machine in Rust reads the PTY output and emits `idle | working | attention` events. Attention regex set matches Claude's common permission prompts ("Do you want to proceed?", "(y/N)", "[y/n/a]", "permission to run/edit/write").
- When attention fires and the NEO window isn't focused, a macOS notification appears with the repo and task title. Dock badge shows the count of attention panes.
- On Claude pane spawn, the app reads CLAUDE.md, README, package.json/Cargo.toml, last 5 git commits, and top-level dirs, then pastes that as the first message — so Claude starts with full project context instead of having to discover the repo.
- Auto-generated pane titles (heuristic from first Claude response — no external API call needed).
- Minimize archives a pane to a dock chip while keeping the PTY alive. Workaround for Claude Code's no-persistence.

Stack: Tauri 2 + Rust (`portable-pty` for PTYs, `regex` + `once_cell` for activity detection, `window-vibrancy` for NSVisualEffectView, `tauri-plugin-notification` for native notifications) + React 19 + Vite + xterm.js + Zustand.

Build pipeline produces a signed/notarized `.app` and `.dmg` via `tauri-apps/tauri-action`. macOS only by design — the frosted-glass aesthetic depends on NSVisualEffectView, which doesn't have equivalents on other OSes that I'd be willing to ship.

The full design doc and the 26-task implementation plan are in the repo (`docs/superpowers/`). Total build time was about 14 hours of pair programming with Claude — the spec, the plan, and the implementation are all version-controlled.

MIT licensed. Would love feedback, especially from anyone else running multiple agents in parallel — the attention regex set is the part most likely to drift as Claude's prompt phrasings evolve.

https://github.com/Steviewonders99/neo

---

## LinkedIn / personal blog

**Title:** *Why I built a 10-pane terminal for Claude Code in 14 hours*

**Body:**

A few weeks into running Claude Code for everything, I noticed a pattern: every time I tried to parallelize — one agent on the Vyra refactor, one on the Toast plugin, one on the SEO dashboard — I'd lose 30% of my time to context-switching. Not the AI's context. *Mine.*

iTerm splits help, but they're dumb terminals. You can't tell from a glance which Claude is thinking, which one has output something new, or which one is waiting on a permission prompt. You miss notifications because you're in another app. And when you finally close a tab, Claude Code doesn't save the chat — so any unfinished work lives in your head until the next morning.

So I built NEO.

It's a native macOS Tauri 2 app that runs up to 20 Claude Code sessions in a single auto-tiled window, 10 on screen at a time. The differentiator isn't the layout — it's that **the app reads Claude's output and knows what state each session is in**. Idle, working, or waiting on permission. The pane border pulses when Claude needs you. If the window isn't focused, you get a real macOS notification with the repo and task title.

Three more things that made the workflow snap into place:

1. **Drag-to-reorder and resizable panes** — grab a pane by its header and drop it on another to rearrange the grid, insert-and-shift like a Kanban board. Drag the gutter between two panes to resize them; double-click it to even them out. Sizes are fractions, so the proportions survive a window resize.

2. **Archive without killing** — Claude Code doesn't persist chats, so closing a tab loses the conversation. NEO's "minimize" button moves a pane into a dock strip while keeping the PTY alive. Click the chip, the conversation comes back.

3. **Matrix-themed glass aesthetic** — because I wanted to actually enjoy looking at it. Real `NSVisualEffectView` vibrancy, matrix-green phosphor terminals with CSS text-shadow glow, falling katakana on the welcome screen. Open the app and you feel like Neo about to enter the matrix.

The full project — design doc, 26-task implementation plan, source code — is on GitHub under MIT. Built in 14 hours of focused pair-programming with Claude itself.

Stack notes for the engineers: Tauri 2 + Rust (`portable-pty` + a custom activity state machine) + React 19 + xterm.js + Zustand. Two bugs that took the longest to find: Tauri 2's capability gate silently denying `window.startDragging()` until I added the right permission (an *hour* of CSS and JS tweaks I didn't need), and a React 19 + Zustand infinite re-render loop where a selector returning `panes.filter(...)` froze the entire JS thread (which is why the app looked "blank" — it was actually running a runaway render loop). Both fixes are in the commit history.

If you're running Claude Code for multiple things at once, give it a try. If you have ideas for v0.2 (persistent sessions, settings UI, cross-platform), open an issue.

→ https://github.com/Steviewonders99/neo

---

## r/MacOSApps / r/LocalLLaMA / Discord

**Short version (3 paragraphs):**

Hey — I built **NEO**, a native macOS app for running up to 20 Claude Code sessions in parallel in one window (10 visible at a time). Frosted glass background (real NSVisualEffectView), matrix-green phosphor terminals, per-pane activity awareness, macOS notifications when an inactive agent needs you, drag-to-reorder and resizable panes, archive-without-kill for long sessions.

Built with Tauri 2 + Rust + React + xterm.js. macOS only. MIT licensed. Full design doc and 26-task plan in the repo.

https://github.com/Steviewonders99/neo

Looking for feedback especially from anyone else running multiple Claude agents — the attention-detection regex set is the part most likely to need tuning.

---

## Notes on timing

- Twitter: post during a US morning window (9–11 AM ET) for max reach.
- Show HN: late Sunday night or early Tuesday morning UTC tends to land on the front page longer.
- LinkedIn: Tuesday or Wednesday mid-morning.
- Reddit: depends on subreddit; check the mod rules first.

## Hashtags (where they help — Twitter/LinkedIn only)

`#ClaudeCode #MacOS #Tauri #OpenSource #DeveloperTools #AI`

Don't use hashtags on Show HN or Reddit; they read as spam.
