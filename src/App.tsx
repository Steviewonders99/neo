import { WindowChrome } from './components/WindowChrome'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WindowChrome />
      <div style={{ flex: 1, color: '#39FF14', padding: 24 }}>
        terminal-panes scaffold OK
      </div>
    </div>
  )
}
