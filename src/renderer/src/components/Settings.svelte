<script>
  import { onMount } from 'svelte'
  import Icon from './Icon.svelte'

  export let status = 'offline'
  export let onClose = () => {}

  const SECTIONS = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'editing', label: 'Editing', icon: 'pencil' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'system', label: 'System', icon: 'monitor' },
    { id: 'backup', label: 'Backup', icon: 'archive' }
  ]

  const SCALES = [
    { label: '50', value: 0.5 },
    { label: '75', value: 0.75 },
    { label: '100', value: 1 },
    { label: '125', value: 1.25 },
    { label: '150', value: 1.5 },
    { label: '200', value: 2 }
  ]

  const STATE = {
    connected: { label: 'Synced', tone: 'ok' },
    connecting: { label: 'Connecting', tone: 'wait' },
    indexing: { label: 'Downloading notes', tone: 'wait' },
    offline: { label: 'Not connected', tone: 'off' },
    unauthorized: { label: 'Sign-in rejected', tone: 'bad' }
  }

  let active = 'account'
  let scale = 1
  let spellcheck = true
  let inMenu = false
  let busy = ''
  let note = ''
  let noteTone = 'ok'

  $: state = STATE[status] || { label: status, tone: 'off' }

  onMount(async () => {
    scale = (await window.api.settings.get('uiScale')) || 1
    spellcheck = (await window.api.settings.get('spellcheck')) !== false
    inMenu = await window.api.system.inMenu()
  })

  function say(text, tone = 'ok') {
    note = text
    noteTone = tone
    setTimeout(() => (note = ''), 4500)
  }

  const setScale = async (v) => { scale = await window.api.system.setScale(v) }
  const toggleSpell = async () => { spellcheck = await window.api.system.setSpellcheck(!spellcheck) }

  async function reconnect() {
    busy = 'connect'
    const res = await window.api.auth.login()
    busy = ''
    res.ok ? say('Signed in. Your notes are on the way.')
           : say('Sign-in closed before a token came back.', 'bad')
  }

  async function signOut() {
    await window.api.auth.logout()
    onClose()
  }

  async function addToMenu() {
    busy = 'menu'
    const res = await window.api.system.addToMenu()
    busy = ''
    if (res.ok) { inMenu = true; say('Added to your applications menu.') }
    else say(res.error || 'Could not add it.', 'bad')
  }

  async function exportAll() {
    busy = 'export'
    const res = await window.api.export.all()
    busy = ''
    if (res.ok) say(`Exported ${res.count} notes.`)
    else if (!res.canceled) say(res.error || 'Export failed.', 'bad')
  }

  function onKey(e) { if (e.key === 'Escape') onClose() }
</script>

<svelte:window on:keydown={onKey} />

<div class="scrim" role="presentation" on:click={onClose}></div>

<div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
  <nav class="rail">
    <div class="brand">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M17.6 5.6C16.3 2.3 7.9 1.8 7.1 6.6 6.4 10.8 16.8 11.3 17.1 16.3 17.4 21.5 8.6 22.3 6.4 18.6"
          fill="none" stroke="currentColor" stroke-width="3.2"
          stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Scriptorium</span>
    </div>

    {#each SECTIONS as s}
      <button class="tab" class:on={active === s.id} on:click={() => (active = s.id)}>
        <Icon name={s.icon} size={15} />
        <span>{s.label}</span>
      </button>
    {/each}
  </nav>

  <div class="pane">
    <header>
      <h2>{SECTIONS.find((s) => s.id === active).label}</h2>
      <button class="close" on:click={onClose} aria-label="Close settings">
        <Icon name="close" size={15} />
      </button>
    </header>

    <div class="scroll">
      {#if active === 'account'}
        <div class="field">
          <div class="status" data-tone={state.tone}>
            <span class="dot"></span>{state.label}
          </div>
          <p class="hint">
            Scriptorium keeps only the access token Simplenote hands back. Your
            password goes straight to Simplenote's own login page, in its own
            window, and is never seen by this app.
          </p>
          <div class="row">
            <button class="primary" on:click={reconnect} disabled={busy === 'connect'}>
              {busy === 'connect' ? 'Waiting for sign-in' : 'Connect to Simplenote'}
            </button>
            <button class="danger" on:click={signOut}>Sign out</button>
          </div>
          <p class="fine">Reconnect if syncing stops or the sidebar stays empty.</p>
        </div>

      {:else if active === 'editing'}
        <div class="field">
          <div class="switch-row">
            <div>
              <h3>Spell checking</h3>
              <p class="hint">Underlines misspelled words as you type.</p>
            </div>
            <button
              class="switch" class:on={spellcheck}
              on:click={toggleSpell}
              role="switch" aria-checked={spellcheck} aria-label="Spell checking">
              <span class="knob"></span>
            </button>
          </div>
        </div>

      {:else if active === 'appearance'}
        <div class="field">
          <h3>Interface scale</h3>
          <p class="hint">Scales the whole window. Applied immediately.</p>
          <div class="segmented">
            {#each SCALES as s}
              <button class:on={scale === s.value} on:click={() => setScale(s.value)}>
                {s.label}<i>%</i>
              </button>
            {/each}
          </div>
          <p class="fine">Themes live in the toolbar's theme picker, next to Find.</p>
        </div>

      {:else if active === 'system'}
        <div class="field">
          <h3>Applications menu</h3>
          <p class="hint">
            {inMenu
              ? 'Scriptorium is in your applications menu. Re-adding updates the entry to point at the copy running now.'
              : 'Add Scriptorium to your applications menu so it launches like any other app.'}
          </p>
          <button on:click={addToMenu} disabled={busy === 'menu'}>
            {inMenu ? 'Update menu entry' : 'Add to applications menu'}
          </button>
          <p class="fine">Only available when running the packaged AppImage.</p>
        </div>

      {:else}
        <div class="field">
          <h3>Export every note</h3>
          <p class="hint">
            One .md file per note, in a single zip. Plain text that opens
            anywhere, with none of this app needed to read it.
          </p>
          <button class="primary" on:click={exportAll} disabled={busy === 'export'}>
            <Icon name="download" size={15} />
            {busy === 'export' ? 'Exporting' : 'Export all notes'}
          </button>
          <p class="fine">
            Simplenote is otherwise the only copy of these notes, and the only
            copy is a bad place for anything to live.
          </p>
        </div>
      {/if}

      {#if note}<p class="toastline" data-tone={noteTone}>{note}</p>{/if}
    </div>
  </div>
</div>
