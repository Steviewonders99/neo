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
