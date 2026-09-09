import { fontStack } from './fonts.js'

// Applies a resolved style OBJECT (built-in or custom) as CSS variables.
export function applyStyle(style, fontScale = 1) {
  const root = document.documentElement
  const t = style.tokens

  root.style.setProperty('--bg', t.bg)
  root.style.setProperty('--surface', t.surface)
  root.style.setProperty('--text', t.text)
  root.style.setProperty('--muted', t.muted)
  root.style.setProperty('--accent', t.accent)
  root.style.setProperty('--selection', t.selection)
  root.style.setProperty('--caret', t.caret)
  root.style.setProperty('--rule', t.rule)

  root.style.setProperty('--font-heading', fontStack(style.fonts.heading))
  root.style.setProperty('--font-body', fontStack(style.fonts.body))
  root.style.setProperty('--font-ui', fontStack(style.fonts.ui))
  // Code font is optional per-Style; falls back to the bundled mono.
  root.style.setProperty('--font-code', fontStack(style.fonts.code || 'JetBrains Mono'))
  root.style.setProperty('--measure', style.measure)
  root.style.setProperty('--font-scale', String(style.scale * fontScale))

  root.setAttribute('data-dark', style.dark ? 'true' : 'false')

  // A "skin" repaints the whole shell (chrome + desktop) to portray a vintage OS.
  if (style.skin) root.setAttribute('data-skin', style.skin)
  else root.removeAttribute('data-skin')
}
