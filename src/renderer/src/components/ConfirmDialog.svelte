<script>
  export let title = 'Confirm'
  export let message = ''
  export let confirmLabel = 'CONFIRM'
  export let cancelLabel = 'CANCEL'
  export let danger = false
  export let onConfirm = () => {}
  export let onCancel = () => {}

  const onKey = (e) => { if (e.key === 'Escape') onCancel(); else if (e.key === 'Enter') onConfirm() }
</script>

<svelte:window on:keydown={onKey} />

<div class="scrim" on:click={onCancel}></div>
<div class="confirm">
  <h2>{title}</h2>
  <p>{message}</p>
  <div class="actions">
    {#if cancelLabel}<button class="ghost" on:click={onCancel}>{cancelLabel}</button>{/if}
    <button class="solid" class:danger on:click={onConfirm}>{confirmLabel}</button>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 700; }
  .confirm {
    position: fixed; z-index: 701; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: min(440px, 92vw); background: var(--surface); border: 1px solid var(--rule);
    border-radius: 16px; padding: 1.4rem 1.5rem; box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    font-family: var(--font-ui);
  }
  h2 { margin: 0 0 0.7rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.9rem; }
  p { margin: 0 0 1.3rem; color: var(--text); font-size: 0.92rem; line-height: 1.55; }
  .actions { display: flex; justify-content: flex-end; gap: 0.7rem; }
  button {
    font-family: var(--font-ui); font-weight: 700; letter-spacing: 0.06em; font-size: 0.78rem;
    padding: 0.6rem 1.1rem; border-radius: 9px; cursor: pointer;
  }
  .ghost { background: transparent; color: var(--text); border: 1px solid var(--rule); }
  .ghost:hover { border-color: var(--accent); color: var(--accent); }
  .solid { background: var(--accent); color: var(--bg); border: none; }
  .solid.danger { background: #e5484d; color: #fff; }
</style>
