<script>
  import { onMount } from 'svelte'

  export let status = 'offline'
  export let onClose = () => {}

  const SCALES = [
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2 }
  ]

  let scale = 1
  let spellcheck = true
  let inMenu = false
  let busy = ''
  let message = ''
  let error = ''

  const LABEL = {
    connected: 'Connected and synced',
    connecting: 'Connecting',
    indexing: 'Downloading your notes',
    offline: 'Not connected',
    unauthorized: 'Simplenote rejected the sign-in'
  }

  onMount(async () => {
    scale = (await window.api.settings.get('uiScale')) || 1
    spellcheck = (await window.api.settings.get('spellcheck')) !== false
    inMenu = await window.api.system.inMenu()
  })

  function say(text) { message = text; error = ''; setTimeout(() => (message = ''), 4000) }
  function fail(text) { error = text; message = ''; }

  async function setScale(value) {
    scale = await window.api.system.setScale(value)
  }

  async function toggleSpellcheck() {
    spellcheck = await window.api.system.setSpellcheck(!spellcheck)
  }

  async function reconnect() {
    busy = 'connect'
    const res = await window.api.auth.login()
    busy = ''
    if (res.ok) say('Signed in. Your notes are on the way.')
    else fail('Sign-in closed before a token came back.')
  }

  async function signOut() {
    await window.api.auth.logout()
    onClose()
  }

  async function addToMenu() {
    busy = 'menu'
    const res = await window.api.system.addToMenu()
    busy = ''
    if (res.ok) { inMenu = true; say('Added to the system menu.') }
    else fail(res.error || 'Could not add it.')
  }

  async function exportAll() {
    busy = 'export'
    const res = await window.api.export.all()
    busy = ''
    if (res.ok) say(`Exported ${res.count} notes.`)
    else if (!res.canceled) fail(res.error || 'Export failed.')
  }
</script>

<div class="scrim" role="presentation" on:click={onClose}></div>

<div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
  <header>
    <h2>Settings</h2>
    <button class="x" on:click={onClose} aria-label="Close settings">✕</button>
  </header>

  <div class="body">
    <section>
      <h3>Simplenote</h3>
      <p class="hint">
        <span class="dot" data-status={status}></span>{LABEL[status] || status}
      </p>
      <p class="hint">
        Sign in again if syncing stops. Simplenote's own login page opens in its
        own window, so your password is never seen by this app.
      </p>
      <div class="row">
        <button on:click={reconnect} disabled={busy === 'connect'}>
          {busy === 'connect' ? 'Waiting for sign-in' : 'Connect to Simplenote'}
        </button>
        <button class="quiet" on:click={signOut}>Sign out</button>
      </div>
    </section>

    <section>
      <h3>Spell checking</h3>
      <p class="hint">Underlines misspelled words as you type.</p>
      <button class="toggle" class:on={spellcheck} on:click={toggleSpellcheck} aria-pressed={spellcheck}>
        <span class="pip"></span>
        {spellcheck ? 'On' : 'Off'}
      </button>
    </section>

    <section>
      <h3>Interface scale</h3>
      <p class="hint">Scales the whole interface. Applied immediately.</p>
      <div class="choices">
        {#each SCALES as step}
          <button class:active={scale === step.value} on:click={() => setScale(step.value)}>
            {step.label}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <h3>System menu</h3>
      <p class="hint">
        {inMenu
          ? 'Scriptorium is in your applications menu.'
          : 'Add Scriptorium to your applications menu so it launches like any other app.'}
      </p>
      <button on:click={addToMenu} disabled={busy === 'menu'}>
        {inMenu ? 'Update the menu entry' : 'Add to system menu'}
      </button>
    </section>

    <section>
      <h3>Export everything</h3>
      <p class="hint">
        Every note as its own .md file, in one zip. Plain text that opens
        anywhere, with none of this app needed to read it.
      </p>
      <button on:click={exportAll} disabled={busy === 'export'}>
        {busy === 'export' ? 'Exporting' : 'Export all notes'}
      </button>
    </section>

    {#if message}<p class="ok">{message}</p>{/if}
    {#if error}<p class="bad">{error}</p>{/if}
  </div>
</div>
