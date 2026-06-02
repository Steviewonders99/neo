import { useEffect, useRef, useState } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { homeDir } from '@tauri-apps/api/path'
import { useStore } from '../state/store'
import { dirs, ipc, recentDirs, repoContext, type RecentDir } from '../lib/ipc'

const HOME_FALLBACK = '/Users/stevenjunop'

export function PaneLauncher() {
  const isOpen = useStore((s) => s.isLauncherOpen)
  const close = useStore((s) => s.closeLauncher)
  const addPane = useStore((s) => s.addPane)

  const [recents, setRecents] = useState<RecentDir[]>([])
  const [cwd, setCwd] = useState('')
  const [kind, setKind] = useState<'claude' | 'shell'>('claude')
  const [error, setError] = useState<string | null>(null)
  const [completions, setCompletions] = useState<string[]>([])
  const [highlight, setHighlight] = useState(0)
  const [showCompletions, setShowCompletions] = useState(false)
  const cwdInputRef = useRef<HTMLInputElement | null>(null)

  // On open: load recents, default cwd to last-used or $HOME
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setCompletions([])
    setShowCompletions(false)
    setHighlight(0)
    recentDirs.list().then(async (rs) => {
      setRecents(rs)
      if (!cwd) {
        const fallback = rs[0]?.cwd
          ?? (await homeDir().catch(() => HOME_FALLBACK))
        setCwd(fallback)
      }
    }).catch(() => setRecents([]))
    // Focus the dir input shortly after the modal mounts
    setTimeout(() => cwdInputRef.current?.focus(), 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Filesystem autocomplete — debounced on cwd input
  useEffect(() => {
    if (!isOpen) return
    if (!cwd) {
      setCompletions([])
      return
    }
    const t = setTimeout(() => {
      dirs.list(cwd).then(setCompletions).catch(() => setCompletions([]))
    }, 80)
    return () => clearTimeout(t)
  }, [cwd, isOpen])

  if (!isOpen) return null

  async function browse() {
    const picked = await openDialog({ directory: true, multiple: false })
    if (typeof picked === 'string') setCwd(picked)
  }

  function applyCompletion(idx: number) {
    const match = completions[idx]
    if (!match) return
    setCwd(match)
    setShowCompletions(false)
  }

  async function start() {
    if (!cwd) {
      setError('Pick a directory first')
      return
    }
    try {
      // Spawn the pane first
      await addPane({ cwd, task: '', kind })
      await recentDirs.add(cwd)
      // For Claude panes, pre-load repo context so Claude has full project awareness
      if (kind === 'claude') {
        const pane = useStore
          .getState()
          .panes
          .filter((p) => p.cwd === cwd)
          .pop()
        if (pane) {
          const ctx = await repoContext.build(cwd).catch(() => '')
          if (ctx.trim()) {
            // Wait briefly for Claude to be ready, then paste the context as a user message.
            // We send the context followed by a newline so it lands as the first prompt.
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
      }
      close()
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  function onCwdKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showCompletions && (e.key === 'Tab' || e.key === 'ArrowDown')) {
      if (completions.length > 0) {
        e.preventDefault()
        setShowCompletions(true)
        setHighlight(0)
      }
      return
    }
    if (showCompletions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, completions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        applyCompletion(highlight)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowCompletions(false)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      start()
    }
  }

  return (
    <div className="launcher-backdrop" onClick={close}>
      <div className="launcher" onClick={(e) => e.stopPropagation()}>
        <h2>New pane</h2>

        <label>Directory</label>
        <div className="launcher-row launcher-cwd-row">
          <div className="launcher-cwd-wrap">
            <input
              ref={cwdInputRef}
              value={cwd}
              onChange={(e) => {
                setCwd(e.target.value)
                setShowCompletions(true)
                setHighlight(0)
              }}
              onKeyDown={onCwdKeyDown}
              onFocus={() => setShowCompletions(true)}
              placeholder="/path/to/repo  (Tab to autocomplete)"
              spellCheck={false}
              autoComplete="off"
            />
            {showCompletions && completions.length > 0 && (
              <div className="launcher-completions">
                {completions.map((c, i) => (
                  <button
                    key={c}
                    className={`launcher-completion ${i === highlight ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => applyCompletion(i)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
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

        <label>Kind</label>
        <div className="launcher-row">
          <label className="radio">
            <input
              type="radio"
              checked={kind === 'claude'}
              onChange={() => setKind('claude')}
            />
            Claude (with auto-injected repo context)
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
