import { useEffect, useRef } from 'react'
import { Terminal as Xterm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'

import { ipc, listenPtyData, listenPtyExit } from '../lib/ipc'
import { xtermTheme, theme } from '../theme'
import { useStore } from '../state/store'

type Props = { paneId: string }

export function Terminal({ paneId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<Xterm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const setExitCode = useStore((s) => s.setExitCode)
  const updateStatus = useStore((s) => s.updateStatus)

  useEffect(() => {
    if (!containerRef.current) return
    const term = new Xterm({
      theme: xtermTheme,
      fontFamily: theme.fontMono,
      fontSize: 13,
      lineHeight: 1.2,
      allowTransparency: true,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)
    fit.fit()

    xtermRef.current = term
    fitRef.current = fit

    // Input: xterm → Rust
    const disposeData = term.onData((data) => {
      const bytes = Array.from(new TextEncoder().encode(data))
      ipc.write(paneId, bytes).catch(() => {})
    })

    // Output: Rust → xterm
    let unsubData: (() => void) | null = null
    let unsubExit: (() => void) | null = null
    listenPtyData(paneId, (bytes) => term.write(bytes)).then((u) => (unsubData = u))
    listenPtyExit(paneId, (code) => {
      setExitCode(paneId, code)
      updateStatus(paneId, 'exited')
    }).then((u) => (unsubExit = u))

    // Initial spawn must already have happened; just request a resize on mount
    const initialCols = term.cols
    const initialRows = term.rows
    ipc.resize(paneId, initialCols, initialRows).catch(() => {})

    // Window/container resize. Coalesced to one fit per frame — dragging a pane
    // gutter fires the observer continuously, and an un-throttled fit would send
    // a resize IPC call per observation.
    let resizeRaf: number | null = null
    const ro = new ResizeObserver(() => {
      if (resizeRaf !== null) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        fit.fit()
        ipc.resize(paneId, term.cols, term.rows).catch(() => {})
      })
    })
    ro.observe(containerRef.current)

    return () => {
      disposeData.dispose()
      unsubData?.()
      unsubExit?.()
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
      ro.disconnect()
      term.dispose()
    }
  }, [paneId, setExitCode, updateStatus])

  return <div ref={containerRef} className="terminal-mount" />
}
