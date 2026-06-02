import { useEffect } from 'react'
import { WindowChrome } from './components/WindowChrome'
import { GridLayout } from './components/GridLayout'
import { useStore } from './state/store'

export default function App() {
  const panes = useStore((s) => s.panes)
  const addPane = useStore((s) => s.addPane)
  const openLauncher = useStore((s) => s.openLauncher)

  // Boot with one default shell pane in home dir (Task 22 will replace this with the launcher flow)
  useEffect(() => {
    if (panes.length === 0) {
      addPane({ cwd: '/Users/stevenjunop', task: 'new session', kind: 'shell' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-root">
      <WindowChrome />
      <GridLayout />
      <button
        className="fab-new-pane"
        onClick={openLauncher}
        disabled={panes.length >= 10}
        aria-label="new pane"
      >
        ＋
      </button>
    </div>
  )
}
