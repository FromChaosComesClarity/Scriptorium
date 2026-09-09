<script>
  import { onMount, onDestroy } from 'svelte'
  import { GOOGLE_FONTS } from '../googlefonts.js'
  import { ensureFontLoaded, fontStack } from '../fonts.js'

  export let title = 'Font'
  export let current = ''
  export let onPick = () => {}
  export let onClose = () => {}

  // The 5 Google Fonts categories, plus a stroke-derived Slab tab and a Variable
  // facet — the same axes fonts.google.com's sidebar offers.
  const CATS = ['All', 'Sans Serif', 'Serif', 'Slab Serif', 'Display', 'Handwriting', 'Monospace']
  const SORTS = [
    ['popularity', 'Popular'], ['trending', 'Trending'], ['added', 'Newest'],
    ['name', 'A – Z'], ['styles', 'Most styles']
  ]

  let catalog = []           // full list from the metadata endpoint (or bundled fallback)
  let ready = false
  let q = ''
  let cat = 'All'
  let sort = 'popularity'
  let onlyVariable = false
  let onlyItalic = false
  let previewText = ''
  let size = 30
  const PAGE = 48
  let shown = PAGE

  onMount(async () => {
    let list = null
    try { list = await window.api.fonts.catalog() } catch { /* offline */ }
    if (Array.isArray(list) && list.length) {
      catalog = list
    } else {
      // Offline / first-run fallback: the curated bundled list, category unknown.
      catalog = GOOGLE_FONTS.map((family) => ({ family, category: '', stroke: '', styles: 1, italic: false, variable: false, popularity: 0, trending: 0, added: '' }))
    }
    ready = true
  })

  $: query = q.trim().toLowerCase()

  const cmp = {
    popularity: (a, b) => a.popularity - b.popularity,
    trending: (a, b) => a.trending - b.trending,
    added: (a, b) => (b.added || '').localeCompare(a.added || ''),
    name: (a, b) => a.family.localeCompare(b.family),
    styles: (a, b) => b.styles - a.styles || a.popularity - b.popularity
  }

  // The deps are passed as arguments so they appear as bare identifiers in the
  // reactive statements below — Svelte does NOT track variables referenced only
  // inside a nested closure, so `$: x = list.filter(f => cat...)` never recomputes.
  function filterSort(list, catg, term, onlyVar, onlyIt, sortKey) {
    return list.filter((f) => {
      if (catg === 'Slab Serif') { if (f.stroke !== 'Slab Serif') return false }
      else if (catg !== 'All' && f.category !== catg) return false
      if (onlyVar && !f.variable) return false
      if (onlyIt && !f.italic) return false
      if (term && !f.family.toLowerCase().includes(term)) return false
      return true
    }).sort(cmp[sortKey])
  }
  function computeCounts(list, term, onlyVar, onlyIt) {
    const c = {}
    for (const name of CATS) c[name] = 0
    for (const f of list) {
      if (onlyVar && !f.variable) continue
      if (onlyIt && !f.italic) continue
      if (term && !f.family.toLowerCase().includes(term)) continue
      c['All']++
      if (f.stroke === 'Slab Serif') c['Slab Serif']++
      if (c[f.category] !== undefined) c[f.category]++
    }
    return c
  }

  $: filtered = filterSort(catalog, cat, query, onlyVariable, onlyItalic, sort)
  $: visible = filtered.slice(0, shown)
  $: exact = catalog.some((f) => f.family.toLowerCase() === query)
  // Chip counts respect the search box + facet toggles (but not the active category).
  $: counts = computeCounts(catalog, query, onlyVariable, onlyItalic)

  // Reset paging whenever the result set changes.
  $: q, cat, sort, onlyVariable, onlyItalic, (shown = PAGE)

  // Lazily fetch a family's webfont only once its card scrolls near the viewport.
  let loaded = new Set()
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const fam = e.target.dataset.family
      io.unobserve(e.target)
      ensureFontLoaded(fam).then(() => { loaded = new Set(loaded).add(fam) })
    }
  }, { rootMargin: '400px' })
  function lazy(node, family) {
    node.dataset.family = family
    io.observe(node)
    return { destroy() { io.unobserve(node) } }
  }

  // Infinite scroll: reveal another page when the sentinel nears the bottom.
  let sentinel
  const moreIo = new IntersectionObserver((e) => {
    if (e[0].isIntersecting && shown < filtered.length) shown += PAGE
  }, { rootMargin: '600px' })
  $: if (sentinel) { moreIo.disconnect(); moreIo.observe(sentinel) }
  onDestroy(() => { io.disconnect(); moreIo.disconnect() })

  const choose = (f) => { onPick(f); onClose() }
  const ff = (fam) => (loaded.has(fam) ? `font-family:${fontStack(fam)}` : '')
</script>

<div class="overlay" on:click|self={onClose} role="presentation">
  <div class="fb">
    <div class="head">
      <h2>{title}</h2>
      <span class="total">{ready ? filtered.length.toLocaleString() + ' fonts' : 'Loading…'}</span>
      <button class="close" title="Close" on:click={onClose}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
    </div>

    <div class="controls">
      <div class="row">
        <div class="searchwrap">
          <span class="sico"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input class="search" type="text" placeholder="Search fonts, or type any Google family…" bind:value={q} autofocus />
        </div>
        <label class="sortwrap">
          <select class="sort" bind:value={sort}>
            {#each SORTS as [key, label]}<option value={key}>{label}</option>{/each}
          </select>
        </label>
      </div>

      <div class="chips">
        {#each CATS as c}
          <button class="chip" class:on={cat === c} on:click={() => cat = c}>
            {c}{#if ready}<span class="cnt">{counts[c] || 0}</span>{/if}
          </button>
        {/each}
        <span class="sep"></span>
        <button class="chip toggle" class:on={onlyVariable} on:click={() => onlyVariable = !onlyVariable} title="Variable fonts">VARIABLE</button>
        <button class="chip toggle" class:on={onlyItalic} on:click={() => onlyItalic = !onlyItalic} title="Has italics">ITALIC</button>
      </div>

      <div class="row previewrow">
        <input class="preview-text" type="text" placeholder="Type to preview across every font…" bind:value={previewText} />
        <div class="sizewrap">
          <input class="size" type="range" min="14" max="72" bind:value={size} />
          <span class="sizeval">{size}px</span>
        </div>
      </div>
    </div>

    <div class="list">
      <button class="card deflt" class:sel={!current} on:click={() => choose('')}>
        <span class="dlabel">Use the Style's default font</span>
      </button>

      {#if query && !exact}
        <button class="card typed" use:lazy={q.trim()} on:click={() => choose(q.trim())}>
          <div class="meta"><span class="fam">Use “{q.trim()}”</span><span class="pill">TYPE</span></div>
          <div class="sample" style="{ff(q.trim())}; font-size:{size}px">{previewText || q.trim()}</div>
        </button>
      {/if}

      {#each visible as f (f.family)}
        <button class="card" class:sel={f.family === current} use:lazy={f.family} on:click={() => choose(f.family)}>
          <div class="meta">
            <span class="fam" style={ff(f.family)}>{f.family}</span>
            <span class="tags">
              {#if f.variable}<span class="badge">VAR</span>{/if}
              {#if f.styles > 1}<span class="badge">{f.styles} styles</span>{/if}
              {#if f.category}<span class="pill">{f.category}</span>{/if}
            </span>
          </div>
          <div class="sample" style="{ff(f.family)}; font-size:{size}px">{previewText || f.family}</div>
        </button>
      {/each}

      {#if ready && !filtered.length}
        <div class="empty">No fonts match — try a different category or search.</div>
      {/if}
      <div class="sentinel" bind:this={sentinel}></div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 600; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    -webkit-app-region: no-drag; animation: fade .16s ease;
  }
  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }

  .fb {
    width: min(880px, 95vw); height: min(86vh, 780px);
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg); border: 1px solid var(--rule); border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6); font-family: var(--font-ui);
    animation: rise .2s cubic-bezier(.16,1,.3,1);
  }
  @keyframes rise { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .head { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.2rem 0.8rem; border-bottom: 1px solid var(--rule); }
  .head h2 { margin: 0; color: var(--accent); text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.82rem; }
  .total { color: var(--muted); font-size: 0.78rem; margin-left: auto; }
  .close { width: 32px; height: 32px; display: grid; place-items: center; background: transparent; border: 1px solid var(--rule); color: var(--muted); border-radius: 8px; cursor: pointer; }
  .close:hover { color: #fff; background: #e5484d; border-color: #e5484d; }

  .controls { padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--rule); display: flex; flex-direction: column; gap: 0.7rem; }
  .row { display: flex; gap: 0.6rem; align-items: center; }

  .searchwrap { position: relative; flex: 1; }
  .sico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--muted); display: flex; pointer-events: none; }
  .search {
    width: 100%; background: var(--surface); color: var(--text); border: 1px solid var(--rule);
    border-radius: 10px; padding: 0.6rem 0.8rem 0.6rem 2.4rem; font-family: var(--font-ui); font-size: 0.95rem;
  }
  .search:focus { outline: none; border-color: var(--accent); }

  .sortwrap { position: relative; }
  .sort {
    appearance: none; background: var(--surface); color: var(--text); border: 1px solid var(--rule);
    border-radius: 10px; padding: 0.6rem 2rem 0.6rem 0.9rem; font-family: var(--font-ui); font-size: 0.88rem; cursor: pointer;
  }
  .sortwrap::after { content: '▾'; position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .sort:focus { outline: none; border-color: var(--accent); }

  .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
  .chip {
    border: 1px solid var(--rule); background: var(--surface); color: var(--muted);
    border-radius: 999px; padding: 0.32rem 0.75rem; font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.03em; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;
    text-transform: uppercase; transition: background .12s, color .12s, border-color .12s;
  }
  .chip:hover { color: var(--text); border-color: var(--accent); }
  .chip.on { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .cnt { font-size: 0.66rem; opacity: 0.75; font-weight: 600; }
  .chip.on .cnt { opacity: 0.85; }
  .chip.toggle { text-transform: uppercase; }
  .sep { width: 1px; height: 18px; background: var(--rule); margin: 0 0.2rem; }

  .previewrow { gap: 0.8rem; }
  .preview-text {
    flex: 1; background: var(--surface); color: var(--text); border: 1px solid var(--rule);
    border-radius: 10px; padding: 0.5rem 0.8rem; font-family: var(--font-ui); font-size: 0.9rem;
  }
  .preview-text:focus { outline: none; border-color: var(--accent); }
  .sizewrap { display: flex; align-items: center; gap: 0.5rem; }
  .size { width: 130px; accent-color: var(--accent); cursor: pointer; }
  .sizeval { color: var(--muted); font-size: 0.75rem; width: 2.6rem; text-align: right; }

  .list { flex: 1; overflow-y: auto; padding: 0.6rem 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .card {
    display: flex; flex-direction: column; gap: 0.5rem; width: 100%; text-align: left;
    background: var(--surface); border: 1px solid transparent; border-radius: 12px;
    padding: 0.8rem 1rem; cursor: pointer; color: var(--text);
  }
  .card:hover { border-color: var(--accent); }
  .card.sel { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }

  .meta { display: flex; align-items: center; gap: 0.6rem; }
  .fam { font-size: 1rem; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tags { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }
  .badge { font-size: 0.6rem; font-weight: 700; color: var(--muted); border: 1px solid var(--rule); border-radius: 5px; padding: 0.1rem 0.35rem; letter-spacing: 0.03em; }
  .pill { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); border-radius: 5px; padding: 0.12rem 0.4rem; }
  .sample { line-height: 1.25; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 1.2em; }

  .card.deflt { flex-direction: row; align-items: center; }
  .dlabel { color: var(--muted); font-size: 0.9rem; }

  .empty { padding: 2rem 1rem; color: var(--muted); text-align: center; font-size: 0.9rem; }
  .sentinel { height: 1px; flex-shrink: 0; }
</style>
