<script>
  // The toolbar. Every control here maps to something Markdown can hold, and
  // that is the whole design rule. There is no colour picker, no highlighter and no
  // font menu, because a note that went through one would come back changed.
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

  const headings = [1, 2, 3]
</script>

<div class="topbar">
  <div class="group">
    {#each headings as level}
      <button
        class:on={is('heading', { level })}
        on:click={run((c) => c.toggleHeading({ level }))}
        title={`Heading ${level}`}>H{level}</button>
    {/each}
    <button
      class:on={is('paragraph')}
      on:click={run((c) => c.setParagraph())}
      title="Body text">¶</button>
  </div>

  <div class="group">
    <button class:on={is('bold')} on:click={run((c) => c.toggleBold())} title="Bold (Ctrl+B)"><b>B</b></button>
    <button class:on={is('italic')} on:click={run((c) => c.toggleItalic())} title="Italic (Ctrl+I)"><i>I</i></button>
    <button class:on={is('strike')} on:click={run((c) => c.toggleStrike())} title="Strikethrough"><s>S</s></button>
    <button class:on={is('code')} on:click={run((c) => c.toggleCode())} title="Inline code">&lt;/&gt;</button>
  </div>

  <div class="group">
    <button class:on={is('bulletList')} on:click={run((c) => c.toggleBulletList())} title="Bullet list">•</button>
    <button class:on={is('orderedList')} on:click={run((c) => c.toggleOrderedList())} title="Numbered list">1.</button>
    <button class:on={is('taskList')} on:click={run((c) => c.toggleTaskList())} title="Checklist">☑</button>
    <button class:on={is('blockquote')} on:click={run((c) => c.toggleBlockquote())} title="Quote">❝</button>
    <button class:on={is('codeBlock')} on:click={run((c) => c.toggleCodeBlock())} title="Code block">{'{ }'}</button>
  </div>

  <div class="group">
    <button
      on:click={() => {
        const url = window.prompt('Link to')
        if (url === null) return
        if (!url) editor.chain().focus().unsetLink().run()
        else editor.chain().focus().setLink({ href: url }).run()
      }}
      class:on={is('link')}
      title="Link">🔗</button>
    <button on:click={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))} title="Insert table">▦</button>
    <button on:click={run((c) => c.setHorizontalRule())} title="Divider">―</button>
  </div>

  <div class="group">
    <button
      on:click={run((c) => c.unsetAllMarks().clearNodes())}
      title="Clear formatting">Clear</button>
  </div>

  <div class="spacer"></div>

  <div class="group">
    <button on:click={onExport} disabled={!canExport} title="Export this note as Markdown">Export</button>
    <button on:click={onFind} title="Find (Ctrl+F)">Find</button>
    <button on:click={onTheme} title="Theme">Theme</button>
    <button on:click={onSettings} title="Settings">⚙</button>
  </div>
</div>
