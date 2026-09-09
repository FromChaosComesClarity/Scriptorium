import fs from 'fs'
import path from 'path'
import { dataPath } from './store.js'

// Downloads a Google font's latin @font-face CSS with the woff2 files inlined as
// data: URLs, and caches it on disk so it works offline after the first fetch.
const CACHE = path.join(dataPath, 'fonts')
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchCss(family) {
  const fam = family.replace(/ /g, '+')
  const get = async (suffix) => {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}${suffix}&display=swap`, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`Google Fonts returned ${res.status} for ${family}`)
    return res.text()
  }
  try { return await get(':wght@400;600;700') }
  catch { return await get('') } // family may not have those weights
}

// The full Google Fonts catalogue (family + category + style facets), fetched
// from the same public metadata endpoint fonts.google.com itself uses (no API
// key), trimmed, and cached on disk. Refreshed every ~2 weeks; served stale (or
// null, letting the renderer fall back to its curated list) when offline.
const CATALOG = path.join(CACHE, '_catalog.json')
const CATALOG_TTL = 14 * 24 * 60 * 60 * 1000

export async function fontCatalog() {
  fs.mkdirSync(CACHE, { recursive: true })
  let cached = null
  if (fs.existsSync(CATALOG)) {
    try { cached = JSON.parse(fs.readFileSync(CATALOG, 'utf8')) } catch { /* corrupt → refetch */ }
    if (cached && Date.now() - cached.fetchedAt < CATALOG_TTL) return cached.fonts
  }
  try {
    const res = await fetch('https://fonts.google.com/metadata/fonts', { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`metadata ${res.status}`)
    const json = JSON.parse((await res.text()).replace(/^\)\]\}'?\s*/, '')) // strip XSSI guard if present
    const fonts = json.familyMetadataList.map((m) => {
      const weights = Object.keys(m.fonts || {})
      return {
        family: m.family,
        category: m.category,                              // Sans Serif | Serif | Display | Handwriting | Monospace
        stroke: m.stroke || '',                            // '' | Sans Serif | Serif | Slab Serif
        styles: weights.length || 1,
        italic: weights.some((w) => w.endsWith('i')),
        variable: !!(m.axes && m.axes.length),
        popularity: m.popularity || 99999,
        trending: m.trending || 99999,
        added: m.dateAdded || ''
      }
    })
    fs.writeFileSync(CATALOG, JSON.stringify({ fetchedAt: Date.now(), fonts }))
    return fonts
  } catch {
    return cached ? cached.fonts : null // offline first-run → renderer uses its bundled list
  }
}

export async function loadFontCss(family) {
  fs.mkdirSync(CACHE, { recursive: true })
  const slug = family.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  const cached = path.join(CACHE, slug + '.css')
  if (fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8')

  const css = await fetchCss(family)
  // Keep only the latin subsets to stay lean.
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
  let out
  if (blocks.length) {
    let kept = blocks.filter(b => b[1] === 'latin' || b[1] === 'latin-ext').map(b => b[2])
    if (!kept.length) kept = blocks.map(b => b[2])
    out = kept.join('\n')
  } else {
    out = css
  }

  const urls = [...out.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m => m[1])
  for (const u of urls) {
    try {
      const buf = Buffer.from(await (await fetch(u)).arrayBuffer())
      out = out.split(u).join(`data:font/woff2;base64,${buf.toString('base64')}`)
    } catch { /* leave the remote URL if a subset fails */ }
  }
  fs.writeFileSync(cached, out)
  return out
}
