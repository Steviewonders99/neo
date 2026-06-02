import { useEffect, useRef, useState } from 'react'
import { homeDir } from '@tauri-apps/api/path'
import { useStore } from '../state/store'
import { ipc, recentDirs, repoContext } from '../lib/ipc'
import { MatrixRain } from './MatrixRain'

const HOME_FALLBACK = '/Users/stevenjunop'

function parseCdInput(raw: string, home: string): string | null {
  let s = raw.trim()
  if (!s) return null
  // Strip a leading "cd " (and any extra whitespace)
  if (s.toLowerCase().startsWith('cd ')) s = s.slice(3).trim()
  // Strip wrapping quotes — "cd 'foo bar'" or "cd \"foo bar\""
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1)
  }
  // Expand ~
  if (s === '~') s = home
  else if (s.startsWith('~/')) s = `${home}/${s.slice(2)}`
  return s || null
}

export function Welcome() {
  const addPane = useStore((s) => s.addPane)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [home, setHome] = useState(HOME_FALLBACK)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    homeDir().then(setHome).catch(() => {})
    // Pre-fill with most recent cwd if we have one, otherwise leave blank
    recentDirs.list().then((rs) => {
      if (rs[0]?.cwd) setInput(rs[0].cwd)
    }).catch(() => {})
    // Auto-focus the input
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  async function launch() {
    const cwd = parseCdInput(input, home)
    if (!cwd) {
      setError('Type a path (or "cd /path/to/repo") and press Enter')
      return
    }
    try {
      await addPane({ cwd, task: '', kind: 'claude' })
      await recentDirs.add(cwd)
      // Inject repo context shortly after spawn — same pattern as the launcher
      const pane = useStore
        .getState()
        .panes
        .filter((p) => p.cwd === cwd)
        .pop()
      if (pane) {
        const ctx = await repoContext.build(cwd).catch(() => '')
        if (ctx.trim()) {
          setTimeout(() => {
            const bytes = Array.from(
              new TextEncoder().encode(
                `Here is project context for our session:\n\n${ctx}\n`,
              ),
            )
            ipc.write(pane.id, bytes).catch(() => {})
          }, 1200)
        }
      }
      setInput('')
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      launch()
    }
  }

  return (
    <div className="welcome">
      <MatrixRain />
      <div className="welcome-overlay">
        <h1 className="welcome-title">NEO</h1>
        <p className="welcome-sub">enter the matrix</p>
        <div className="welcome-prompt">
          <span className="welcome-prompt-prefix">$&nbsp;cd&nbsp;</span>
          <input
            ref={inputRef}
            className="welcome-prompt-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(null)
            }}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            placeholder="~/projects/your-repo"
          />
          <span className="welcome-prompt-cursor" />
        </div>
        {error && <div className="welcome-error">{error}</div>}
      </div>
    </div>
  )
}
