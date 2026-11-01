<script>
  // The toolbar. Every control here maps to something Markdown can hold, and
  // that is the whole design rule. There is no colour picker, no highlighter and
  // no font menu, because a note that went through one would come back changed.
  //
  // Icons are drawn (see Icon.svelte), never emoji: emoji carry their own colour
  // and their own drawing style, ignore the theme entirely, and render
  // differently on every machine. Letterforms like B and H1 stay as text,
  // because that is what they actually are.
  import Icon from './Icon.svelte'

  // macOS draws its own close/minimise/zoom buttons over the top-left of the
  // window, so the first group has to get out of their way; see the
  // [data-platform="darwin"] rules in scriptorium.css and trafficLightPosition
  // in main/index.js. It is also where
  // the modifier in every tooltip below comes from — Tiptap binds Mod-b, which
  // is ⌘ here and Ctrl everywhere else, and a tooltip that said the wrong one
  // would be worse than none.
  const isMac = window.api?.platform === 'darwin'
  const mod = isMac ? '⌘' : 'Ctrl+'

  export let editor = null
  export let onTheme = () => {}
  export let onFind = () => {}
  export let onExport = () => {}
  export let onSettings = () => {}
  export let canExport = false

  // Re-read the editor's marks on every transaction so the buttons show state.
  let tick = 0
  $: if (editor) {
    editor.on('transaction', () => { tick++ })
  }

  const is = (name, attrs) => (tick, editor ? editor.isActive(name, attrs) : false)
  const run = (fn) => () => { if (editor) fn(editor.chain().focus()).run() }

  // ── the table menu, ported from LatteWrite ──
  // A size grid to insert with, then row and column editing. LatteWrite's
  // "Toggle borders" stays behind: a borderless table is not something Markdown
  // can say. Whatever these commands do to a table, the GFM normaliser in
  // shared/schema.mjs reshapes it into what the note will actually save.
  let showTable = false
  let hr = 0, hc = 0 // hovered rows/cols in the size grid
  const GRID = [1, 2, 3, 4, 5, 6, 7, 8]
  const closeTable = () => { showTable = false; hr = 0; hc = 0 }
  function insertTableSize(rows, cols) {
    closeTable()
    if (editor) editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }
  const tableDo = (fn) => () => { closeTable(); if (editor) fn(editor.chain().focus()).run() }
  // Greyed out rather than silently doing nothing: outside a table none of these
  // apply, and the last row or column of a table cannot be deleted.
  const can = (name) => (tick, editor ? editor.can()[name]() : false)
  const TABLE_OPS = [
    { label: 'Add row above', cmd: 'addRowBefore' },
    { label: 'Add row below', cmd: 'addRowAfter' },
    { label: 'Add column left', cmd: 'addColumnBefore' },
    { label: 'Add column right', cmd: 'addColumnAfter' },
    { sep: true },
    { label: 'Delete row', cmd: 'deleteRow' },
    { label: 'Delete column', cmd: 'deleteColumn' },
    { label: 'Delete table', cmd: 'deleteTable', danger: true }
  ]
  const onKey = (e) => { if (showTable && e.key === 'Escape') closeTable() }

  function setLink() {
    if (!editor) return
    const url = window.prompt('Link to')
    if (url === null) return
    if (!url) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: url }).run()
  }
</script>

<div class="topbar">
  <div class="group">
    {#each [1, 2, 3] as level}
      <button
        class="txt"
        class:on={is('heading', { level })}
        on:click={run((c) => c.toggleHeading({ level }))}
        title={`Heading ${level}`}>H{level}</button>
    {/each}
    <button
      class="txt"
      class:on={is('paragraph')}
      on:click={run((c) => c.setParagraph())}
      title="Body text">Body</button>
  </div>

  <div class="group">
    <button class="txt" class:on={is('bold')} on:click={run((c) => c.toggleBold())} title={`Bold (${mod}B)`}><b>B</b></button>
    <button class="txt" class:on={is('italic')} on:click={run((c) => c.toggleItalic())} title={`Italic (${mod}I)`}><i>I</i></button>
    <button class="txt" class:on={is('strike')} on:click={run((c) => c.toggleStrike())} title="Strikethrough"><s>S</s></button>
    <button class="txt mono" class:on={is('code')} on:click={run((c) => c.toggleCode())} title="Inline code">&lt;&gt;</button>
  </div>

  <div class="group">
    <button class:on={is('bulletList')} on:click={run((c) => c.toggleBulletList())} title="Bullet list">
      <Icon name="bulletList" />
    </button>
    <button class="txt" class:on={is('orderedList')} on:click={run((c) => c.toggleOrderedList())} title="Numbered list">1.</button>
    <button class:on={is('taskList')} on:click={run((c) => c.toggleTaskList())} title="Checklist">
      <Icon name="taskList" />
    </button>
    <button class:on={is('blockquote')} on:click={run((c) => c.toggleBlockquote())} title="Quote">
      <Icon name="quote" />
    </button>
    <button class="txt mono" class:on={is('codeBlock')} on:click={run((c) => c.toggleCodeBlock())} title="Code block">{'{ }'}</button>
  </div>

  <div class="group">
    <button class:on={is('link')} on:click={setLink} title="Link">
      <Icon name="link" />
    </button>
    <div class="tablewrap">
      <button class:on={showTable || is('table')} on:click={() => (showTable ? closeTable() : (showTable = true))}
        title="Table" aria-haspopup="menu" aria-expanded={showTable}>
        <Icon name="table" />
      </button>
      {#if showTable}
        <div class="tablemenu" role="menu">
          <div class="grid-label">{hc && hr ? `${hc} × ${hr}` : 'Insert table'}</div>
          <div class="grid-pick" on:mouseleave={() => { hr = 0; hc = 0 }}>
            {#each GRID as r}
              <div class="grid-row">
                {#each GRID as c}
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="grid-cell" class:hot={c <= hc && r <= hr}
                    on:mouseenter={() => { hc = c; hr = r }}
                    on:click={() => insertTableSize(r, c)}></div>
                {/each}
              </div>
            {/each}
          </div>
          <div class="menu-sep"></div>
          {#each TABLE_OPS as op}
            {#if op.sep}
              <div class="menu-sep"></div>
            {:else}
              <button role="menuitem" class:danger={op.danger} disabled={!can(op.cmd)}
                on:click={tableDo((c) => c[op.cmd]())}>{op.label}</button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
    <button on:click={run((c) => c.setHorizontalRule())} title="Divider">
      <Icon name="divider" />
    </button>
    <button on:click={run((c) => c.unsetAllMarks().clearNodes())} title="Clear formatting">
      <Icon name="clear" />
    </button>
  </div>

  <div class="spacer"></div>

  <div class="group">
    <button on:click={onExport} disabled={!canExport} title="Export this note as Markdown">
      <Icon name="download" />
    </button>
    <button on:click={onFind} title={`Find (${mod}F)`}>
      <Icon name="search" />
    </button>
    <button on:click={onTheme} title="Theme">
      <Icon name="palette" />
    </button>
    <button on:click={onSettings} title="Settings">
      <Icon name="settings" />
    </button>
  </div>
</div>

<svelte:window on:keydown={onKey} />
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
{#if showTable}<div class="menu-scrim" on:click={closeTable}></div>{/if}
