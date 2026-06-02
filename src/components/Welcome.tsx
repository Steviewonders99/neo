import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { MatrixRain } from './MatrixRain'

const HOME = '/Users/stevenjunop'

function parsePath(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (s.toLowerCase().startsWith('cd ')) s = s.slice(3).trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1)
  }
  if (s === '~') s = HOME
  else if (s.startsWith('~/')) s = `${HOME}/${s.slice(2)}`
  return s || null
}

export function Welcome() {
  const addPane = useStore((s) => s.addPane)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function launch() {
    const cwd = parsePath(input)
    if (!cwd) {
      setError('type a path (or "cd /path/to/repo") and press enter')
      return
    }
    try {
      await addPane({ cwd, task: '', kind: 'claude' })
    } catch (e) {
      setError(String(e))
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                launch()
              }
            }}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder="~/projects/your-repo"
          />
        </div>
        {error && <div className="welcome-error">{error}</div>}
      </div>
    </div>
  )
}
