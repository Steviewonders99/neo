export const theme = {
  surface: 'transparent',
  surfaceChrome: 'rgba(20, 22, 20, 0.45)',
  surfaceTerminal: 'rgba(0, 12, 0, 0.55)',
  border: 'rgba(57, 255, 20, 0.20)',
  borderFocus: 'rgba(57, 255, 20, 0.75)',
  borderAttn: 'rgba(57, 255, 20, 1.00)',

  green: '#39FF14',
  greenDim: '#27B30E',
  greenSoft: '#1B6E07',
  greenGlow: '0 0 6px rgba(57, 255, 20, 0.55)',

  text: 'rgba(220, 230, 220, 0.92)',
  textMuted: 'rgba(160, 175, 160, 0.65)',

  fontMono: 'JetBrains Mono, SF Mono, ui-monospace, monospace',
  fontUI: '-apple-system, BlinkMacSystemFont, sans-serif',
} as const

/**
 * Monochrome terminal palette — every ANSI colour collapses onto a white ramp.
 *
 * Claude Code leans hard on colour, and across long sessions the hue is noise
 * rather than signal. Rather than flattening everything to pure #ffffff, the
 * ramp keeps three steps so dim/secondary text stays quieter than primary and
 * the output retains its hierarchy. Hue is gone; contrast is not.
 *
 * This only covers the legacy 16-colour range. 256-colour and truecolour
 * sequences bypass it entirely — those are handled by NO_COLOR in pty.rs and,
 * as a last resort, the grayscale filter on .terminal-mount.
 */
const WHITE = '#ffffff' // bright variants
const WHITE_DIM = '#e5e5e5' // normal variants, and the default foreground
const GREY = '#8a8a8a' // dim / brightBlack — comments, secondary text

export const xtermTheme = {
  background: '#000000',
  foreground: WHITE_DIM,
  cursor: WHITE_DIM,
  cursorAccent: '#000000',
  selectionBackground: 'rgba(255,255,255,0.25)',
  black: '#000000',
  red: WHITE_DIM,
  green: WHITE_DIM,
  yellow: WHITE_DIM,
  blue: WHITE_DIM,
  magenta: WHITE_DIM,
  cyan: WHITE_DIM,
  white: WHITE_DIM,
  brightBlack: GREY,
  brightRed: WHITE,
  brightGreen: WHITE,
  brightYellow: WHITE,
  brightBlue: WHITE,
  brightMagenta: WHITE,
  brightCyan: WHITE,
  brightWhite: WHITE,
} as const
