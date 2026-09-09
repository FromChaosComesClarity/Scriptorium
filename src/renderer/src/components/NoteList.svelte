<script>
  export let notes = []
  export let selectedId = ''
  export let status = 'offline'
  export let onSelect = () => {}
  export let onCreate = () => {}
  export let onTrash = () => {}

  let query = ''

  // Search is over the title and the preview the main process already derived,
  // so typing stays instant on a few thousand notes without touching the body.
  $: filtered = query.trim()
    ? notes.filter((n) => (n.title + ' ' + n.preview + ' ' + n.tags.join(' '))
        .toLowerCase().includes(query.trim().toLowerCase()))
    : notes

  const LABEL = {
    connected: 'Synced',
    connecting: 'Connecting…',
    indexing: 'Downloading notes…',
    offline: 'Offline',
    unauthorized: 'Sign-in needed'
  }

  const when = (seconds) => {
    if (!seconds) return ''
    const d = new Date(seconds * 1000)
    const days = Math.floor((Date.now() - d) / 86400000)
    if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }
</script>

<aside class="notes">
  <div class="notes-head">
    <input
      class="search"
      type="search"
      placeholder="Search notes"
      bind:value={query}
      aria-label="Search notes" />
    <button class="new" on:click={onCreate} title="New note" aria-label="New note">+</button>
  </div>

  <div class="notes-scroll">
    {#each filtered as note (note.id)}
      <button
        class="note"
        class:selected={note.id === selectedId}
        on:click={() => onSelect(note.id)}>
        <span class="note-row">
          {#if note.pinned}<span class="pin" title="Pinned">•</span>{/if}
          <span class="note-title">{note.title}</span>
          <span class="note-when">{when(note.modificationDate)}</span>
        </span>
        {#if note.preview}<span class="note-preview">{note.preview}</span>{/if}
      </button>
    {:else}
      <p class="empty">
        {#if status === 'indexing'}Fetching your notes…
        {:else if query}Nothing matches “{query}”.
        {:else}No notes yet. The + button starts one.{/if}
      </p>
    {/each}
  </div>

  <div class="notes-foot" data-status={status}>
    <span class="dot"></span>
    <span>{LABEL[status] || status}</span>
    {#if selectedId}
      <button class="trash" on:click={() => onTrash(selectedId)} title="Move to trash">Trash</button>
    {/if}
  </div>
</aside>
