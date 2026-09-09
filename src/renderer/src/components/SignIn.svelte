<script>
  export let onDone = () => {}

  let busy = false
  let showPaste = false
  let token = ''
  let error = ''

  async function signIn() {
    busy = true; error = ''
    const res = await window.api.auth.login()
    busy = false
    if (res.ok) onDone()
    else error = 'Sign-in was cancelled before a token came back.'
  }

  async function usePasted() {
    if (!token.trim()) return
    const res = await window.api.auth.pasteToken(token)
    if (res.ok) onDone()
    else error = 'That does not look like a token.'
  }
</script>

<div class="signin">
  <div class="signin-card">
    <h1>Scriptorium</h1>
    <p class="lede">A visual editor for your Simplenote notes.</p>

    <button class="primary" on:click={signIn} disabled={busy}>
      {busy ? 'Waiting for sign-in…' : 'Sign in to Simplenote'}
    </button>

    <p class="fine">
      Simplenote's own login page opens in its own window. Your password goes
      straight to Simplenote. Scriptorium never sees it, and only keeps the
      access token it hands back.
    </p>

    {#if error}<p class="error">{error}</p>{/if}

    {#if showPaste}
      <div class="paste">
        <label for="tok">Simperium access token</label>
        <input id="tok" type="password" bind:value={token} placeholder="paste it here" />
        <button on:click={usePasted} disabled={!token.trim()}>Use this token</button>
      </div>
    {:else}
      <button class="link" on:click={() => (showPaste = true)}>I have a token already</button>
    {/if}
  </div>
</div>
