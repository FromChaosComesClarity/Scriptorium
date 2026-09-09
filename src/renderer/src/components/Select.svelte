<script>
  import { onMount, onDestroy } from 'svelte'

  export let value = ''
  export let options = [] // [{ value, label }]
  export let placeholder = 'Select…'
  export let onChange = () => {}

  let open = false
  let wrap
  $: current = options.find(o => o.value === value)

  const pick = (o) => { open = false; onChange(o.value) }
  const onDown = (e) => { if (wrap && !wrap.contains(e.target)) open = false }

  onMount(() => window.addEventListener('mousedown', onDown))
  onDestroy(() => window.removeEventListener('mousedown', onDown))
</script>

<div class="sel" bind:this={wrap}>
  <button type="button" class="sel-btn" class:open on:click={() => open = !open}>
    <span class="sel-label">{current ? current.label : placeholder}</span>
    <svg class="sel-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  {#if open}
    <div class="sel-list">
      {#each options as o}
        <button type="button" class="sel-opt" class:on={o.value === value} on:click={() => pick(o)}>{o.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sel { position: relative; }
  .sel-btn {
    display: flex; align-items: center; gap: 0.5rem; width: 100%;
    background: var(--bg); color: var(--text); border: 1px solid var(--rule);
    border-radius: 8px; padding: 0.55rem 0.7rem; font-family: var(--font-ui); font-size: 0.9rem; cursor: pointer;
  }
  .sel-btn.open { border-color: var(--accent); }
  .sel-label { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sel-caret { color: var(--muted); flex: none; }
  .sel-list {
    position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; right: 0;
    background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 0.25rem;
    max-height: 240px; overflow-y: auto; box-shadow: 0 16px 40px rgba(0,0,0,0.45);
  }
  .sel-opt {
    display: block; width: 100%; text-align: left; background: transparent; border: none;
    color: var(--text); font-family: var(--font-ui); font-size: 0.88rem; padding: 0.45rem 0.6rem;
    border-radius: 6px; cursor: pointer;
  }
  .sel-opt:hover { background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .sel-opt.on { color: var(--accent); }
</style>
