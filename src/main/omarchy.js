// Following the desktop's theme.
//
// Omarchy 4 records the active theme as a slug in
//   ~/.local/state/omarchy/current/theme.name        ("tokyo-night")
// and links the theme's own files at
//   ~/.local/state/omarchy/current/theme/            (alacritty.toml, kitty.conf, …)
//
// Verified on this machine: the theme is read from those two paths, not from
// ~/.config/omarchy/current, which does not exist on 4.x.
//
// alacritty.toml is the file to read because every Omarchy theme ships one and
// its palette is a flat, well-known set of names. Parsing it with a couple of
// regexes rather than a TOML dependency is deliberate: we need eight colours out
// of a file with a fixed shape, and a parser would be more code than the job.

import fs from 'fs'
import path from 'path'
import os from 'os'

const STATE = path.join(os.homedir(), '.local', 'state', 'omarchy', 'current')
const NAME_FILE = path.join(STATE, 'theme.name')
const THEME_DIR = path.join(STATE, 'theme')

export const available = () => fs.existsSync(NAME_FILE)

const titleCase = (slug) =>
  slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// Pull `key = "#rrggbb"` out of a named [section].
function section(toml, name) {
  const start = toml.indexOf(`[${name}]`)
  if (start === -1) return {}
  const rest = toml.slice(start + name.length + 2)
  const end = rest.indexOf('\n[')
  const body = end === -1 ? rest : rest.slice(0, end)
  const out = {}
  for (const m of body.matchAll(/^\s*(\w+)\s*=\s*"(#[0-9a-fA-F]{6})"/gm)) out[m[1]] = m[2]
  return out
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

// Perceived lightness, the usual sRGB weighting. Decides whether the editor
// should behave as a dark theme (which drives the caret, selection and the
// `data-dark` attribute the stylesheet keys off).
function luminance(hex) {
  const [r, g, b] = rgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

const alpha = (hex, a) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * The current Omarchy theme as a Scriptorium style object, or null when this
 * is not an Omarchy desktop.
 *
 * Fonts are deliberately NOT taken from the terminal theme. A terminal picks a
 * monospace face for code; this is a place to write prose, and forcing every
 * note into the terminal's font would be worse, not more consistent. The colours
 * follow the desktop, the typography stays the editor's own.
 */
export function currentStyle(fonts) {
  try {
    if (!available()) return null
    const slug = fs.readFileSync(NAME_FILE, 'utf8').trim()
    if (!slug) return null

    const toml = fs.readFileSync(path.join(THEME_DIR, 'alacritty.toml'), 'utf8')
    const primary = section(toml, 'colors.primary')
    const normal = section(toml, 'colors.normal')
    const bright = section(toml, 'colors.bright')
    const cursor = section(toml, 'colors.cursor')
    const selection = section(toml, 'colors.selection')

    const bg = primary.background
    const text = primary.foreground
    if (!bg || !text) return null

    const dark = luminance(bg) < 0.5
    const accent = normal.blue || bright.blue || normal.magenta || text
    const rule = bright.black || selection.background || alpha(text, 0.2)

    return {
      name: titleCase(slug),
      slug,
      style: {
        dark,
        fonts: fonts || { heading: 'Newsreader', body: 'Source Serif 4', ui: 'Inter' },
        measure: '46rem',
        scale: 1,
        tokens: {
          bg,
          surface: selection.background || bright.black || bg,
          text,
          muted: bright.black && luminance(bright.black) !== luminance(bg)
            ? (dark ? bright.white || text : bright.black)
            : alpha(text, 0.65),
          accent,
          selection: alpha(accent, 0.26),
          caret: cursor.cursor || accent,
          rule
        }
      }
    }
  } catch {
    // A theme mid-switch, or a theme with no alacritty.toml. The app keeps the
    // style it already has rather than flashing a half-read palette.
    return null
  }
}

/** Call `fn` when the desktop theme changes. Returns an unwatch function. */
export function watch(fn) {
  if (!available()) return () => {}
  try {
    const w = fs.watch(path.dirname(NAME_FILE), (_e, file) => {
      if (file === 'theme.name' || file === 'theme') fn()
    })
    return () => { try { w.close() } catch { /* already closed */ } }
  } catch {
    return () => {}
  }
}
