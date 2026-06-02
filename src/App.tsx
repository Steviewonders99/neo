import { WindowChrome } from './components/WindowChrome'
import { GridLayout } from './components/GridLayout'
import { PaneLauncher } from './components/PaneLauncher'
import { MinimizedDock } from './components/MinimizedDock'
import { Welcome } from './components/Welcome'
import { useStore } from './state/store'

export default function App() {
  const panes = useStore((s) => s.panes)
  const openLauncher = useStore((s) => s.openLauncher)

  const visibleCount = panes.filter((p) => !p.minimized).length
  const showWelcome = visibleCount === 0

  return (
    <div className="app-root">
      <WindowChrome />
      <MinimizedDock />
      {showWelcome ? <Welcome /> : <GridLayout />}
      {!showWelcome && (
        <button
          className="fab-new-pane"
          onClick={openLauncher}
          disabled={panes.length >= 10}
          aria-label="new pane"
        >
          ＋
        </button>
      )}
      <PaneLauncher />
    </div>
  )
}
