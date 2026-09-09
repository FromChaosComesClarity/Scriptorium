<script>
  import { STYLE_CATEGORIES } from '../styles.js'
  import { ensureFontLoaded, fontStack } from '../fonts.js'

  export let current = 'Poppins'
  export let stylesMap = {}
  export let customSet = new Set()
  export let onPick = () => {}
  export let onDelete = () => {}
  export let onDuplicate = () => {}
  export let onRename = () => {}
  export let onClose = () => {}

  // Category tabs = built-in groups, plus a Custom tab when the user has saved styles.
  $: customNames = [...customSet]
  $: categories = { ...STYLE_CATEGORIES, ...(customNames.length ? { Custom: customNames } : {}) }
  $: catNames = Object.keys(categories)

  let activeCat = 'Coffee'
  let filter = 'all' // 'all' | 'light' | 'dark'

  // Keep the active tab valid (the Custom tab disappears when the last one is deleted).
  $: if (!catNames.includes(activeCat)) activeCat = catNames[0]

  $: names = (categories[activeCat] || [])
    .filter((n) => stylesMap[n])
    .filter((n) => filter === 'all' || (filter === 'dark' ? stylesMap[n].dark : !stylesMap[n].dark))

  // Load the real fonts for whatever swatches are on screen so the previews are honest.
  $: loadFonts(names)
  function loadFonts(list) {
    for (const n of list) {
      const s = stylesMap[n]
      if (!s) continue
      ensureFontLoaded(s.fonts.heading)
      ensureFontLoaded(s.fonts.body)
    }
  }

  let renaming = null
  let renameVal = ''
  function startRename(name) { renaming = name; renameVal = name }
  function commitRename() {
    if (renaming) { onRename(renaming, renameVal); renaming = null }
  }
  function focusInput(node) { node.focus(); node.select() }

  function pick(name) { onPick(name); onClose() }
</script>

<div class="overlay" on:click|self={onClose} role="presentation">
  <div class="chooser">
    <div class="header">
      <span class="title">Theme</span>
      <div class="filter">
        {#each [['all', 'ALL'], ['light', 'LIGHT'], ['dark', 'DARK']] as [key, label]}
          <button class="fbtn" class:on={filter === key} on:click={() => filter = key}>{label}</button>
        {/each}
      </div>
      <button class="close-btn" on:click={onClose} title="Close">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="body">
      <nav class="cats">
        {#each catNames as cat}
          <button class="cat-btn" class:active={activeCat === cat} on:click={() => activeCat = cat}>{cat}</button>
        {/each}
      </nav>

      <div class="grid">
        {#each names as name (name)}
          {@const s = stylesMap[name]}
          <div class="swatch" class:active={current === name}
            style="--sw-bg:{s.tokens.bg}; --sw-surface:{s.tokens.surface}; --sw-text:{s.tokens.text}; --sw-muted:{s.tokens.muted}; --sw-accent:{s.tokens.accent}; --sw-rule:{s.tokens.rule};">
            <button class="pick" on:click={() => pick(name)} title={name}>
              <div class="preview">
                <div class="ptitle" style="font-family:{fontStack(s.fonts.heading)}">Aa</div>
                <div class="pbody" style="font-family:{fontStack(s.fonts.body)}">Handgloves</div>
                <div class="prule"></div>
                <div class="pdots"><i class="d-accent"></i><i class="d-text"></i><i class="d-muted"></i></div>
              </div>
              <div class="foot">
                {#if renaming === name}
                  <input class="rename" bind:value={renameVal} use:focusInput on:click|stopPropagation
                    on:keydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renaming = null }}
                    on:blur={commitRename} />
                {:else}
                  <span class="sname">{name}</span>
                  <span class="tag">{s.dark ? 'DARK' : 'LIGHT'}</span>
                {/if}
              </div>
            </button>

            {#if current === name}
              <div class="tick">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            {/if}

            <div class="actions">
              <button class="act" title="Duplicate" on:click|stopPropagation={() => { onDuplicate(name); onClose() }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              </button>
              {#if customSet.has(name)}
                <button class="act" title="Rename" on:click|stopPropagation={() => startRename(name)}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                </button>
                <button class="act del" title="Delete" on:click|stopPropagation={() => onDelete(name)}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    animation: fade .16s ease;
    /* Carve the whole modal out of the frameless window's drag band (the TopBar
       sets -webkit-app-region:drag; a plain overlay is 'none', which does NOT
       subtract, so header controls under the drag strip would eat real clicks). */
    -webkit-app-region: no-drag;
  }
  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }

  .chooser {
    width: 780px; max-width: 95vw; height: 560px; max-height: 90vh;
    background: var(--bg); border: 1px solid var(--rule); border-radius: 14px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; overflow: hidden;
    font-family: var(--font-ui);
    animation: rise .2s cubic-bezier(.16,1,.3,1);
  }
  @keyframes rise { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .header {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.85rem 1rem 0.8rem; border-bottom: 1px solid var(--rule); flex-shrink: 0;
  }
  .title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }

  .filter { display: flex; gap: 2px; margin-left: auto; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 2px; }
  .fbtn {
    padding: 0.3rem 0.7rem; border: none; background: transparent; color: var(--muted);
    font-size: 0.66rem; font-weight: 800; letter-spacing: 0.08em; border-radius: 6px; cursor: pointer;
  }
  .fbtn:hover { color: var(--text); }
  .fbtn.on { background: var(--accent); color: var(--bg); }

  .close-btn {
    width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--rule); background: var(--surface); color: var(--muted);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .close-btn:hover { background: #e5484d; color: #fff; border-color: #e5484d; }

  .body { flex: 1; display: flex; overflow: hidden; }

  .cats {
    width: 148px; flex-shrink: 0; border-right: 1px solid var(--rule);
    overflow-y: auto; padding: 0.6rem 0.5rem; display: flex; flex-direction: column; gap: 2px;
  }
  .cat-btn {
    width: 100%; padding: 0.5rem 0.7rem; border-radius: 7px; text-align: left;
    font-size: 0.82rem; font-weight: 600; color: var(--muted);
    background: none; border: none; cursor: pointer; border-left: 2px solid transparent;
  }
  .cat-btn:hover { color: var(--text); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .cat-btn.active { color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); border-left-color: var(--accent); }

  .grid {
    flex: 1; min-height: 0; overflow-y: auto; padding: 0.9rem;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    /* Size rows to the swatch's real height, not the container: the swatches are
       overflow:hidden (rounded corners) so their grid auto-min-size is 0, which
       lets the grid compress+clip them instead of overflowing → this restores
       full-height previews and makes the grid scroll when a category is long. */
    grid-auto-rows: max-content;
    gap: 0.7rem; align-content: start;
  }

  .swatch {
    position: relative; border-radius: 11px; overflow: hidden;
    border: 2px solid transparent; transition: border-color .13s, box-shadow .13s, transform .13s;
  }
  .swatch:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.4); border-color: var(--sw-accent); }
  .swatch.active { border-color: var(--sw-accent); box-shadow: 0 0 0 1px var(--sw-accent); }

  .pick {
    display: block; width: 100%; padding: 0; border: none; cursor: pointer; text-align: left;
    background: var(--sw-bg);
  }
  .preview {
    background: var(--sw-surface); padding: 0.75rem 0.8rem 0.65rem;
    border-bottom: 1px solid var(--sw-rule);
  }
  .ptitle { font-size: 1.55rem; line-height: 1; color: var(--sw-text); font-weight: 700; }
  .pbody { margin-top: 0.4rem; font-size: 0.82rem; color: var(--sw-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .prule { height: 2px; width: 42%; margin-top: 0.55rem; background: var(--sw-accent); border-radius: 2px; }
  .pdots { display: flex; gap: 5px; margin-top: 0.6rem; }
  .pdots i { width: 11px; height: 11px; border-radius: 50%; display: block; }
  .d-accent { background: var(--sw-accent); }
  .d-text { background: var(--sw-text); }
  .d-muted { background: var(--sw-muted); }

  .foot {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 0.6rem; background: var(--sw-bg);
  }
  .sname { flex: 1; min-width: 0; font-size: 0.78rem; font-weight: 600; color: var(--sw-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag {
    flex-shrink: 0; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.08em;
    padding: 0.15rem 0.4rem; border-radius: 5px;
    color: var(--sw-muted); border: 1px solid var(--sw-rule);
  }
  .rename {
    flex: 1; min-width: 0; background: var(--sw-surface); color: var(--sw-text);
    border: 1px solid var(--sw-accent); border-radius: 6px; padding: 0.25rem 0.4rem; font-size: 0.78rem;
    font-family: var(--font-ui);
  }

  .tick {
    position: absolute; top: 6px; left: 6px; width: 18px; height: 18px; border-radius: 50%;
    background: var(--sw-accent); color: var(--sw-bg);
    display: flex; align-items: center; justify-content: center; pointer-events: none;
  }

  .actions {
    position: absolute; top: 5px; right: 5px; display: flex; gap: 2px; opacity: 0; transition: opacity .12s;
  }
  .swatch:hover .actions { opacity: 1; }
  .act {
    width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--sw-bg) 78%, transparent); color: var(--sw-text);
    border: 1px solid var(--sw-rule); cursor: pointer; backdrop-filter: blur(2px);
  }
  .act:hover { background: var(--sw-accent); color: var(--sw-bg); border-color: var(--sw-accent); }
  .act.del:hover { background: #e5484d; color: #fff; border-color: #e5484d; }
</style>
