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

export const xtermTheme = {
  background: 'rgba(0,0,0,0)',
  foreground: theme.green,
  cursor: theme.green,
  cursorAccent: '#000000',
  selectionBackground: 'rgba(57,255,20,0.25)',
  black: '#0a0f0a',
  red: '#ff5c57',
  green: theme.green,
  yellow: '#f3f99d',
  blue: '#57c7ff',
  magenta: '#ff6ac1',
  cyan: '#9aedfe',
  white: '#f1f1f0',
  brightBlack: '#2a322a',
  brightRed: '#ff6e67',
  brightGreen: '#5cff3a',
  brightYellow: '#f9ffaa',
  brightBlue: '#82d7ff',
  brightMagenta: '#ff84d1',
  brightCyan: '#b3f3fe',
  brightWhite: '#ffffff',
} as const
