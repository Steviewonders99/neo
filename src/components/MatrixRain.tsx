import { useEffect, useRef } from 'react'

// Katakana, half-width katakana, Latin letters, digits, and a few symbols —
// roughly matches the 1999 film's glyph set without needing a font file.
const GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  '!@#$%^&*()+-=[]{};:<>?/\\|'

function rand(n: number) {
  return Math.floor(Math.random() * n)
}

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let cols = 0
    let drops: number[] = []
    let speeds: number[] = []
    const fontSize = 16

    function resize() {
      if (!canvas || !ctx) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${fontSize}px ui-monospace, "SF Mono", "JetBrains Mono", monospace`
      ctx.textBaseline = 'top'
      cols = Math.ceil(w / fontSize)
      drops = Array.from({ length: cols }, () => rand(40))
      speeds = Array.from({ length: cols }, () => 0.6 + Math.random() * 0.9)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    // Defer first resize until layout has settled — clientWidth/Height can be 0
    // during the synchronous mount pass, which would leave `cols` at 0 and the
    // canvas blank forever.
    requestAnimationFrame(resize)

    let lastTime = performance.now()
    const draw = (now: number) => {
      if (!canvas || !ctx) return
      const dt = (now - lastTime) / 16.667 // frames at 60fps target
      lastTime = now

      const w = canvas.clientWidth
      const h = canvas.clientHeight

      // Translucent black overlay creates the fading-trail effect
      ctx.fillStyle = 'rgba(0, 8, 0, 0.08)'
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize
        const y = drops[i] * fontSize
        const ch = GLYPHS[rand(GLYPHS.length)]

        // Head of the stream — brighter, slight white tint
        ctx.fillStyle = 'rgba(220, 255, 220, 0.95)'
        ctx.fillText(ch, x, y)
        // Body — matrix green
        if (y - fontSize > 0) {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.55)'
          ctx.fillText(GLYPHS[rand(GLYPHS.length)], x, y - fontSize)
        }

        // Advance drop; reset to top randomly when past bottom
        drops[i] += speeds[i] * dt
        if (drops[i] * fontSize > h && Math.random() > 0.975) {
          drops[i] = 0
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="matrix-rain" />
}
