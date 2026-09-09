<script>
  import { onMount, onDestroy } from 'svelte'

  // Left-hand document navigator — a presentation-grade table of contents built
  // from the H1/H2 headings. Hidden by default; the discreet bottom-left NAV pill
  // toggles it (mirroring the presentation bar's pills at bottom-right).
  export let outline = []          // [{ pos, level, text }]
  export let open = false
  export let activePos = -1
  export let fullscreen = false
  export let chromeHidden = false
  export let onGo = () => {}
  export let onToggle = () => {}
  export let onClose = () => {}

  let panelEl

  // Dismiss when the click lands anywhere but the panel. The NAV button is left
  // to its own toggle so a click there still opens/closes as expected.
  function onDocPointer(e) {
    if (!open) return
    if (panelEl && panelEl.contains(e.target)) return
    if (e.target.closest && e.target.closest('.navbtn')) return
    onClose()
  }
  onMount(() => window.addEventListener('mousedown', onDocPointer, true))
  onDestroy(() => window.removeEventListener('mousedown', onDocPointer, true))

  // Hierarchical numbering (1, 1.1, 1.2, 2 …) — reads like a slide deck's contents.
  $: numbered = numberize(outline)
  function numberize(list) {
    let h1 = 0, h2 = 0
    return list.map((it) => {
      if (it.level === 1) { h1++; h2 = 0; return { ...it, num: String(h1) } }
      h2++; return { ...it, num: h1 ? `${h1}.${h2}` : `${h2}` }
    })
  }

  $: activeIndex = numbered.findIndex((it) => it.pos === activePos)
</script>

{#if open}
  <aside class="outline" bind:this={panelEl}>
    <div class="sheen"></div>

    <header class="head">
      <div class="titles">
        <span class="kicker">CONTENTS</span>
        <span class="doc">Navigate</span>
      </div>
      <span class="count">{numbered.length}</span>
      <button class="x" on:click={onClose} title="Close (Esc)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </header>

    <div class="list">
      {#if numbered.length === 0}
        <div class="empty">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <p>No headings yet.<br /><span>Use <b>Heading&nbsp;1</b> &amp; <b>Heading&nbsp;2</b> to grow an outline.</span></p>
        </div>
      {:else}
        <div class="track" style="--active:{activeIndex}">
          <span class="rail"></span>
          {#each numbered as item, i (item.pos)}
            <button
              class="row"
              class:h2={item.level === 2}
              class:on={item.pos === activePos}
              on:click={() => onGo(item.pos)}
              title={item.text || 'Untitled heading'}>
              <span class="node"></span>
              <span class="num">{item.num}</span>
              <span class="label" class:blank={!item.text}>{item.text || 'Untitled'}</span>
              <svg class="go" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </aside>
{/if}

<button
  class="navbtn" class:on={open} class:dim={fullscreen || chromeHidden}
  on:click={onToggle} title="Navigate headings">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  NAV
</button>

<style>
  /* ── Bottom-left toggle — same discreet pill language as the presentation bar ── */
  .navbtn {
    position: fixed; bottom: 1.1rem; left: 1.1rem; z-index: 350;
    font-family: var(--font-ui); font-size: 0.72rem; letter-spacing: 0.08em;
    background: var(--surface); color: var(--text);
    border: 1px solid var(--rule); border-radius: 999px;
    padding: 0.5rem 0.9rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.45rem;
    box-shadow: 0 8px 26px rgba(0,0,0,0.35);
    opacity: 0.3; transition: opacity 0.25s, border-color 0.15s, background 0.15s, color 0.15s;
  }
  .navbtn:hover { opacity: 1; border-color: var(--accent); }
  .navbtn.dim { opacity: 0.12; }
  .navbtn.dim:hover { opacity: 1; }
  .navbtn.on { opacity: 1; background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .navbtn svg { display: block; }

  /* ── The panel ──────────────────────────────────────────────────────────────── */
  /* Absolute, not fixed: it lives inside .editor-area, so it can never ride up
     over the top bar and it follows the document area when the chrome hides. */
  .outline {
    position: absolute; z-index: 200;
    left: 1.1rem; top: 0.9rem; bottom: 4.4rem; width: 18rem; max-width: 80vw;
    display: flex; flex-direction: column; overflow: hidden;
    color: var(--text);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 22%),
      color-mix(in srgb, var(--surface) 92%, var(--bg));
    backdrop-filter: blur(18px) saturate(1.4);
    border: 1px solid color-mix(in srgb, var(--rule) 55%, var(--accent) 30%);
    border-radius: 16px;
    box-shadow:
      0 24px 60px rgba(0,0,0,0.5),
      0 2px 0 color-mix(in srgb, var(--accent) 14%, transparent) inset,
      0 0 0 1px color-mix(in srgb, var(--accent) 9%, transparent);
    animation: nav-in 0.24s cubic-bezier(0.2, 0.9, 0.25, 1);
  }
  @keyframes nav-in {
    from { opacity: 0; transform: translateX(-14px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  /* A soft accent glow riding the top edge — reads as "lit". */
  .sheen {
    position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 85%, transparent), transparent);
    pointer-events: none;
  }

  /* ── Header ─────────────────────────────────────────────────────────────────── */
  .head {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.85rem 0.75rem 0.75rem 1.05rem;
    border-bottom: 1px solid color-mix(in srgb, var(--rule) 70%, transparent);
  }
  .titles { display: flex; flex-direction: column; gap: 0.12rem; flex: 1; min-width: 0; }
  .kicker { font-family: var(--font-ui); font-size: 0.6rem; letter-spacing: 0.28em; color: color-mix(in srgb, var(--accent) 75%, var(--muted)); }
  .doc { font-family: var(--font-heading); font-size: 1.02rem; font-weight: 700; line-height: 1.05; }
  .count {
    font-family: var(--font-ui); font-size: 0.66rem; font-variant-numeric: tabular-nums;
    color: var(--muted); background: color-mix(in srgb, var(--muted) 16%, transparent);
    border-radius: 999px; padding: 0.12rem 0.5rem; min-width: 1.4rem; text-align: center;
  }
  .x {
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: none; color: var(--muted);
    border-radius: 8px; cursor: pointer; padding: 0.32rem; transition: background 0.15s, color 0.15s;
  }
  .x:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--text); }

  /* ── The list / timeline ────────────────────────────────────────────────────── */
  .list { flex: 1; overflow-y: auto; padding: 0.6rem 0.6rem 0.9rem; }
  .track { position: relative; }
  /* The vertical spine every node hangs from. */
  .rail {
    position: absolute; left: 15px; top: 1.1rem; bottom: 1.1rem; width: 2px;
    border-radius: 2px;
    background: linear-gradient(180deg,
      transparent,
      color-mix(in srgb, var(--muted) 30%, transparent) 12%,
      color-mix(in srgb, var(--muted) 30%, transparent) 88%,
      transparent);
    pointer-events: none;
  }

  .row {
    position: relative; display: flex; align-items: center; gap: 0.5rem;
    width: 100%; padding: 0.44rem 0.55rem 0.44rem 2rem;
    background: transparent; border: none; cursor: pointer; text-align: left;
    color: var(--text); font-family: var(--font-ui); font-size: 0.86rem; line-height: 1.3;
    border-radius: 9px; transition: background 0.14s, color 0.14s;
  }

  /* The node dot sitting on the rail. */
  .node {
    position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
    width: 10px; height: 10px; border-radius: 50%; flex: none;
    background: var(--surface);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 45%, transparent);
    transition: box-shadow 0.16s, background 0.16s, transform 0.16s;
  }
  .row.h2 .node {
    left: 12px; width: 7px; height: 7px;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 40%, transparent);
  }

  .num {
    font-size: 0.68rem; font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
    color: var(--muted); min-width: 1.5rem; flex: none; opacity: 0.9;
  }
  .row.h2 { font-size: 0.81rem; }
  .row.h2 .num { min-width: 1.9rem; }

  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row.h2 .label { color: var(--muted); }
  .label.blank { font-style: italic; opacity: 0.55; }

  .go { flex: none; color: var(--accent); opacity: 0; transform: translateX(-4px); transition: opacity 0.14s, transform 0.14s; }

  .row:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--text);
  }
  .row:hover .label, .row.h2:hover .label { color: var(--text); }
  .row:hover .node { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 65%, transparent); }
  .row:hover .go { opacity: 0.7; transform: none; }

  /* You-are-here — the accent-lit node with a soft wash behind the row. */
  .row.on {
    background: linear-gradient(90deg,
      color-mix(in srgb, var(--accent) 20%, transparent),
      color-mix(in srgb, var(--accent) 6%, transparent) 70%,
      transparent);
    color: var(--text); font-weight: 600;
  }
  .row.on .num { color: color-mix(in srgb, var(--accent) 80%, var(--text)); opacity: 1; }
  .row.on .label, .row.h2.on .label { color: var(--text); }
  .row.on .node {
    background: var(--accent); transform: translateY(-50%) scale(1.15);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent),
      0 0 12px color-mix(in srgb, var(--accent) 70%, transparent);
  }

  /* ── Empty state ────────────────────────────────────────────────────────────── */
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.9rem;
    text-align: center; padding: 2.2rem 1.1rem; color: var(--muted);
  }
  .empty svg { opacity: 0.4; }
  .empty p { margin: 0; font-size: 0.82rem; line-height: 1.55; }
  .empty span { font-size: 0.76rem; opacity: 0.85; }
  .empty b { color: color-mix(in srgb, var(--accent) 70%, var(--text)); font-weight: 600; }
</style>
