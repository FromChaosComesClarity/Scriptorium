<script>
  import { onMount } from 'svelte'
  import Editor from './components/Editor.svelte'
  import TopBar from './components/TopBar.svelte'
  import NoteList from './components/NoteList.svelte'
  import SignIn from './components/SignIn.svelte'
  import Settings from './components/Settings.svelte'
  import FindBar from './components/FindBar.svelte'
  import ThemeChooser from './components/ThemeChooser.svelte'
  import { fromMarkdown, toMarkdown, hasEdits } from '../../shared/markdown.mjs'
  import { STYLES, DEFAULT_STYLE } from './styles.js'
  import { applyStyle } from './theme.js'
  import { ensureFontLoaded } from './fonts.js'

  let signedIn = false
  let status = 'offline'
  let notes = []
  let selectedId = ''
  let editor = null
  let showFind = false
  let showTheme = false
  let showSettings = false
  let syncError = ''

  const isMac = window.api.platform === 'darwin'

  // The Markdown this note had when it was opened or last saved. Everything
  // about not corrupting people's notes hangs off this one variable.
  let baseline = ''
  let loading = false
  let saveTimer = null
  let autosaveMs = 1200

  // ── theme ─────────────────────────────────────────────────────────────────
  let styleName = DEFAULT_STYLE
  let followOmarchy = true

  // The desktop's own palette, mapped to a style object at runtime. It cannot
  // live in styles.js because it changes whenever the Omarchy theme changes, so
  // it is injected into the picker as its own category instead. Without this it
  // was the one theme you could be looking at and not able to choose.
  let desktop = null

  $: stylesMap = desktop ? { ...STYLES, [desktop.name]: desktop.style } : STYLES
  $: extraCategories = desktop ? { Desktop: [desktop.name] } : {}
  $: currentStyleName = followOmarchy && desktop ? desktop.name : styleName

  async function applyTheme() {
    // Read the desktop palette whether or not we are following it, so the
    // Desktop tab is always there to pick.
    desktop = await window.api.theme.omarchy()

    const style = (followOmarchy && desktop && desktop.style)
      || STYLES[styleName]
      || STYLES[DEFAULT_STYLE]

    const scale = (await window.api.settings.get('fontScale')) || 1
    for (const f of Object.values(style.fonts || {})) ensureFontLoaded(f)
    applyStyle(style, scale)
  }

  async function pickTheme(name) {
    if (desktop && name === desktop.name) {
      // Choosing the desktop theme means "keep tracking it", not "freeze this
      // copy of it", so the next `omarchy theme set` still comes through.
      followOmarchy = true
    } else {
      followOmarchy = false
      styleName = name
      await window.api.settings.set('style', name)
    }
    await window.api.settings.set('followOmarchy', followOmarchy)
    applyTheme()
  }

  async function exportNote() {
    await flush()
    const res = await window.api.export.note(selectedId)
    if (res && res.error) syncError = res.error
  }

  // Also reachable from Settings > Backup. Both paths flush first, because an
  // export that quietly omits the last thing you typed is worse than no export.
  async function exportAll() {
    await flush()
    const res = await window.api.export.all()
    if (res && res.error) syncError = res.error
  }

  // ── notes ─────────────────────────────────────────────────────────────────
  async function openNote(id) {
    if (id === selectedId) return
    await flush()                 // never leave an edit behind on the old note
    const note = await window.api.notes.get(id)
    if (!note) return
    selectedId = id
    loading = true
    baseline = note.content || ''
    if (editor) editor.commands.setContent(fromMarkdown(baseline).toJSON(), false)
    loading = false
    window.api.settings.set('lastNoteId', id)
  }

  // Write the open note back, but only when the user actually changed it.
  //
  // Opening a note re-spells some Markdown: `*` bullets become `-`, emphasis
  // settles on one marker. Saving that would mark the note as edited on every
  // device for a note that was only read, and would fight any other client that
  // normalises differently. So the comparison is against the baseline, and
  // `hasEdits` compares meaning rather than characters.
  async function flush() {
    clearTimeout(saveTimer)
    saveTimer = null
    if (!editor || !selectedId || loading) return
    const doc = editor.state.doc
    if (!hasEdits(baseline, doc)) return
    const content = toMarkdown(doc)
    baseline = content
    await window.api.notes.save(selectedId, content)
  }

  function scheduleSave() {
    if (loading) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, autosaveMs)
  }

  async function createNote() {
    await flush()
    const id = await window.api.notes.create()
    if (id) {
      await openNote(id)
      editor && editor.commands.focus('end')
    }
  }

  async function trashNote(id) {
    clearTimeout(saveTimer)
    saveTimer = null
    await window.api.notes.trash(id)
    if (id === selectedId) {
      selectedId = ''
      baseline = ''
      editor && editor.commands.setContent('', false)
    }
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  onMount(async () => {
    styleName = (await window.api.settings.get('style')) || DEFAULT_STYLE
    followOmarchy = (await window.api.settings.get('followOmarchy')) !== false
    autosaveMs = (await window.api.settings.get('autosaveMs')) || 1200
    await applyTheme()

    const s = await window.api.sync.status()
    signedIn = s.signedIn
    status = s.status

    window.api.auth.onRequired(() => { signedIn = false; notes = []; selectedId = '' })
    window.api.sync.onStatus((next) => { status = next })
    window.api.sync.onError((message) => { syncError = message })
    window.api.theme.onOmarchyChanged(() => applyTheme())

    // The bar widget and launcher overlay open notes by pushing an id here.
    window.api.notes.onOpen((id) => { if (id) openNote(id) })

    window.api.notes.onChanged((next) => {
      notes = next
      if (!selectedId && next.length) openNote((next.find((n) => n.id === s.lastNoteId) || next[0]).id)
    })

    // A note changed on another device. If the user has nothing unsaved here,
    // take theirs. If they do, leave their work alone. Simperium has already
    // merged the text, and clobbering the editor mid-sentence would be worse
    // than a note that catches up on the next save.
    window.api.notes.onNoteChanged((note) => {
      if (!note || note.id !== selectedId || !editor) return
      if (hasEdits(baseline, editor.state.doc)) return
      baseline = note.content || ''
      loading = true
      editor.commands.setContent(fromMarkdown(baseline).toJSON(), false)
      loading = false
    })

    notes = await window.api.notes.list()
    const last = await window.api.settings.get('lastNoteId')
    if (notes.length) openNote(notes.some((n) => n.id === last) ? last : notes[0].id)

    // macOS File menu items. New Note is not among them: the menu runs that one
    // itself, so that its ⌘N shows up where a Mac user goes looking for it.
    window.api.menu.onCommand((command) => {
      if (command === 'export-note' && selectedId) exportNote()
      if (command === 'export-all') exportAll()
    })

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); showFind = true }
      // On macOS ⌘N belongs to the File menu, and claiming it twice would make
      // one keypress create two notes.
      if (!isMac && (e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createNote() }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); flush() }
    })
    window.addEventListener('beforeunload', flush)
  })

  async function onSignedIn() {
    signedIn = true
    notes = await window.api.notes.list()
  }
</script>

{#if !signedIn}
  <SignIn onDone={onSignedIn} />
{:else}
  <div class="app-shell scriptorium">
    <TopBar
      {editor}
      canExport={!!selectedId}
      onFind={() => (showFind = true)}
      onExport={exportNote}
      onSettings={() => (showSettings = true)}
      onTheme={() => (showTheme = !showTheme)} />

    <div class="body">
      <NoteList
        {notes}
        {selectedId}
        {status}
        onSelect={openNote}
        onCreate={createNote}
        onTrash={trashNote} />

      <div class="editor-area">
        {#if showFind && editor}
          <FindBar {editor} onClose={() => (showFind = false)} />
        {/if}
        <div class="editor-scroll">
          <Editor
            onReady={(e) => (editor = e)}
            onChange={scheduleSave}
            editable={!!selectedId} />
        </div>
      </div>
    </div>

    {#if syncError}
      <div class="toast" role="status">
        {syncError}
        <button on:click={() => (syncError = '')}>Dismiss</button>
      </div>
    {/if}

    {#if showSettings}
      <Settings {status} onClose={() => (showSettings = false)} />
    {/if}

    {#if showTheme}
      <ThemeChooser
        current={currentStyleName}
        {stylesMap}
        {extraCategories}
        onPick={pickTheme}
        onClose={() => (showTheme = false)} />
    {/if}
  </div>
{/if}
