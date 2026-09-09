<script>
  import { onMount, onDestroy } from 'svelte'

  let visible = false
  let x = 0, y = 0
  let items = []
  let menuEl

  function build(d) {
    const list = []
    if (d.misspelledWord && d.suggestions.length) {
      for (const s of d.suggestions) list.push({ label: s, em: true, action: () => window.api.spell.replace(s) })
      list.push({ sep: true })
    }
    if (d.misspelledWord) list.push({ label: 'Add to dictionary', action: () => window.api.spell.add(d.misspelledWord) })
    if (d.mediaType === 'image' && d.srcURL) {
      list.push({ label: 'Copy image', action: () => window.api.edit.copyImage({ src: d.srcURL }) })
      list.push({ sep: true })
    }
    if (d.canCut) list.push({ label: 'Cut', action: () => window.api.edit.cut() })
    if (d.canCopy) list.push({ label: 'Copy', action: () => window.api.edit.copy() })
    if (d.canPaste) list.push({ label: 'Paste', action: () => window.api.edit.paste() })
    if (d.canSelectAll) list.push({ label: 'Select all', action: () => window.api.edit.selectAll() })
    // drop leading/trailing/duplicate separators
    const out = []
    for (const it of list) {
      if (it.sep && (!out.length || out[out.length - 1].sep)) continue
      out.push(it)
    }
    while (out.length && out[out.length - 1].sep) out.pop()
    return out
  }

  function show(d) {
    items = build(d)
    if (!items.length) { visible = false; return }
    x = d.x; y = d.y
    visible = true
    requestAnimationFrame(clamp)
  }

  function clamp() {
    if (!menuEl) return
    const r = menuEl.getBoundingClientRect()
    if (x + r.width > window.innerWidth) x = Math.max(6, window.innerWidth - r.width - 6)
    if (y + r.height > window.innerHeight) y = Math.max(6, window.innerHeight - r.height - 6)
  }

  const close = () => { visible = false }
  const run = (it) => { close(); it.action() }
  const onKey = (e) => { if (e.key === 'Escape') close() }

  let unsub
  onMount(() => {
    unsub = window.api.contextMenu.onShow(show)
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
  })
  onDestroy(() => {
    unsub && unsub()
    window.removeEventListener('mousedown', close)
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
    window.removeEventListener('keydown', onKey)
  })
</script>

{#if visible}
  <div class="ctx" style="left:{x}px; top:{y}px" bind:this={menuEl} on:mousedown|stopPropagation>
    {#each items as it}
      {#if it.sep}
        <div class="ctx-sep"></div>
      {:else}
        <button class="ctx-item" class:em={it.em} on:click={() => run(it)}>{it.label}</button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .ctx {
    position: fixed; z-index: 9000; min-width: 180px; padding: 0.35rem;
    background: var(--surface); border: 1px solid var(--rule); border-radius: 10px;
    box-shadow: 0 18px 50px rgba(0,0,0,0.5);
    font-family: var(--font-ui);
  }
  .ctx-item {
    display: block; width: 100%; text-align: left; background: transparent; border: none;
    color: var(--text); font-size: 0.85rem; padding: 0.45rem 0.7rem; border-radius: 7px; cursor: pointer;
    font-family: inherit;
  }
  .ctx-item.em { font-weight: 700; color: var(--accent); }
  .ctx-item:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); }
  .ctx-sep { height: 1px; background: var(--rule); margin: 0.3rem 0.2rem; }
</style>
