<script>
  import { tick, onDestroy } from 'svelte'
  import { setFindQuery, stepFind, closeFind, scrollToFindMatch, findState } from '../editor-extensions.js'

  export let editor = null
  export let onClose = () => {}

  let q = ''
  let caseSensitive = false
  let total = 0
  let index = 0
  let input

  // Called by the parent on Ctrl+F: focus and select what's there so a second
  // press just retypes over the old query.
  export async function open(seed) {
    if (seed) q = seed
    await tick()
    input && input.select()
    if (q) run()
  }

  // Editing the document re-runs the search inside the plugin; mirror the new
  // tally in the counter.
  function sync() {
    const s = findState(editor)
    total = s.matches.length
    index = s.index
  }
  let bound = null
  $: if (editor && editor !== bound) {
    if (bound && !bound.isDestroyed) bound.off('transaction', sync)
    bound = editor
    editor.on('transaction', sync)
  }

  function run() {
    if (!editor) return
    const s = setFindQuery(editor, q, caseSensitive)
    total = s.matches.length
    index = s.index
    scrollToFindMatch(editor)
  }

  function step(dir) {
    if (!editor || !total) return
    const s = stepFind(editor, dir)
    index = s.index
    scrollToFindMatch(editor)
  }

  function toggleCase() {
    caseSensitive = !caseSensitive
    run()
  }

  // Closing from anywhere (Esc in the editor, the ×, a doc switch) must drop the
  // highlights, so the teardown lives in onDestroy rather than in the button.
  const close = () => onClose()
  onDestroy(() => {
    if (!editor || editor.isDestroyed) return
    editor.off('transaction', sync)
    closeFind(editor)
  })

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
  }
</script>

<div class="findbar">
  <span class="ico">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  </span>

  <input
    bind:this={input} bind:value={q} on:input={run} on:keydown={onKey}
    type="text" placeholder="Find in document…" spellcheck="false" />

  <span class="count" class:none={q && !total}>
    {#if !q}&nbsp;{:else if total}{index + 1} / {total}{:else}none{/if}
  </span>

  <button class="chip" class:on={caseSensitive} on:click={toggleCase} title="Match case">Aa</button>

  <span class="div"></span>

  <button class="nav" on:click={() => step(-1)} disabled={!total} title="Previous (Shift+Enter)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
  </button>
  <button class="nav" on:click={() => step(1)} disabled={!total} title="Next (Enter)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <button class="nav close" on:click={close} title="Close (Esc)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
</div>

<style>
  .findbar {
    position: absolute; z-index: 300; top: 0.9rem; right: 1.4rem;
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.35rem 0.4rem 0.35rem 0.55rem;
    background: color-mix(in srgb, var(--surface) 94%, var(--accent) 3%);
    backdrop-filter: blur(14px) saturate(1.3);
    border: 1px solid color-mix(in srgb, var(--rule) 65%, var(--accent) 35%);
    border-radius: 12px;
    box-shadow: 0 14px 40px rgba(0,0,0,0.4), 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent);
    font-family: var(--font-ui);
    -webkit-app-region: no-drag;
    animation: find-in 0.16s ease-out;
  }
  @keyframes find-in {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: none; }
  }

  .ico { display: flex; color: var(--muted); pointer-events: none; }
  input {
    width: 15rem; background: transparent; border: none; color: var(--text);
    font-family: inherit; font-size: 0.86rem; padding: 0.25rem 0.2rem;
  }
  input:focus { outline: none; }
  input::placeholder { color: var(--muted); }

  .count {
    min-width: 3.4rem; text-align: right; font-size: 0.74rem; color: var(--muted);
    font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
  }
  .count.none { color: color-mix(in srgb, var(--accent) 70%, var(--muted)); }

  .div { width: 1px; height: 18px; background: var(--rule); margin: 0 0.15rem; }

  .chip, .nav {
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: none; color: var(--muted);
    border-radius: 7px; cursor: pointer; padding: 0.3rem; font-family: inherit;
  }
  .chip { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; padding: 0.25rem 0.4rem; }
  .chip:hover, .nav:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--text); }
  .chip.on { background: var(--accent); color: var(--bg); }
  .nav:disabled { opacity: 0.35; cursor: default; }
  .nav.close:hover { color: var(--text); }
</style>
