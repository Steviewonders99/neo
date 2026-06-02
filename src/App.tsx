import { useEffect } from 'react'
import { WindowChrome } from './components/WindowChrome'
import { GridLayout } from './components/GridLayout'
import { PaneLauncher } from './components/PaneLauncher'
import { MinimizedDock } from './components/MinimizedDock'
import { useStore } from './state/store'

export default function App() {
  const panes = useStore((s) => s.panes)
  const addPane = useStore((s) => s.addPane)
  const openLauncher = useStore((s) => s.openLauncher)

  useEffect(() => {
    if (panes.length === 0) {
      addPane({ cwd: '/Users/stevenjunop', task: '', kind: 'shell' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-root">
      <WindowChrome />
      <MinimizedDock />
      <GridLayout />
      <button
        className="fab-new-pane"
        onClick={openLauncher}
        disabled={panes.length >= 10}
        aria-label="new pane"
      >
        ＋
      </button>
      <PaneLauncher />
    </div>
  )
}
