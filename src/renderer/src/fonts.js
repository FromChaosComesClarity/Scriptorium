// Font helpers. Built-in styles use bundled families (loaded at startup); any
// other family is a Google font, fetched+cached by the main process and injected
// as an @font-face <style> on demand.

// Families bundled at build time (see fonts-bundle.js) — every font any built-in
// Style references. A family NOT in this set is a custom pick and is fetched +
// cached on demand. Keep this in lock-step with fonts-bundle.js / styles.js.
const BUNDLED = new Set([
  // Core UI / reading
  'Inter', 'Space Grotesk', 'Lora', 'Source Serif 4', 'Raleway', 'JetBrains Mono',
  // Style fonts (headings/body across the built-in Styles)
  'Architects Daughter', 'Archivo', 'Audiowide', 'Black Ops One', 'Bungee', 'Caveat',
  'Chakra Petch', 'Cinzel', 'Cormorant Garamond', 'Courier Prime', 'Cutive Mono',
  'DM Serif Display', 'Dancing Script', 'DotGothic16', 'EB Garamond', 'Exo 2', 'Fraunces',
  'Fredoka', 'Gochi Hand', 'Indie Flower', 'Josefin Sans', 'Kalam', 'Libre Caslon Text',
  'Manrope', 'Monoton', 'Newsreader', 'Nunito', 'Orbitron', 'Outfit', 'PT Serif',
  'Patrick Hand', 'Permanent Marker', 'Pixelify Sans', 'Playfair Display', 'Poiret One',
  'Poppins', 'Press Start 2P', 'Quicksand', 'Rajdhani', 'Righteous', 'Shadows Into Light Two',
  'Silkscreen', 'Sixtyfour', 'Sora', 'Special Elite', 'Unbounded', 'VT323', 'Work Sans',
  // Bundled bitmap/system fonts for the "Systems" styles (see retro-fonts.css).
  'ChicagoFLF', 'C64 Pro Mono', 'PxPlus IBM VGA8', 'BigBlue Terminal'
])

const SERIF = /serif|slab|lora|garamond|caslon|baskerville|playfair|spectral|newsreader|fraunces|cormorant|bitter|domine|vollkorn|arvo|cardo|neuton|gelasio|marcellus|cinzel|petrona|piazzolla|literata|merriweather|bodoni|alegreya|crimson|noto serif|pt serif|source serif|ibm plex serif|dm serif|libre|frank ruhl|philosopher/i
const MONO = /mono|code|consol|terminal|vga|bigblue|pxplus|c64/i

export function fallback(family) {
  if (MONO.test(family)) return 'monospace'
  if (SERIF.test(family)) return 'serif'
  return 'sans-serif'
}

export function fontStack(family) {
  return `'${family}', ${fallback(family)}`
}

export function isBundled(family) {
  return BUNDLED.has(family)
}

// Ensure a family's @font-face is present in the document (no-op for bundled).
export async function ensureFontLoaded(family) {
  if (!family || BUNDLED.has(family)) return
  try {
    const css = await window.api.fonts.load(family)
    const id = 'gf-' + family.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    let el = document.getElementById(id)
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.textContent = css
  } catch { /* invalid/offline family — falls back to the generic stack */ }
}
