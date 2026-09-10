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
    <button on:click={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))} title="Insert table">
      <Icon name="table" />
    </button>
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
