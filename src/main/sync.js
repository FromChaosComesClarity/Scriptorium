// The Simplenote sync engine.
//
// Simplenote runs on Simperium. Two of its three hosts are still up and one is
// not, which shapes everything here:
//
//   api.simperium.com    alive. Serves the WebSocket at /sock/1/<app>/websocket,
//                        which is the only thing this module talks to.
//   auth.simperium.com   dead, no TCP listener on 443 or 80, verified. That is
//                        the host node-simperium's own auth.js hardcodes, so the
//                        library's login is unusable and we never call it. The
//                        access token arrives from src/main/auth.js instead.
//
// A note in the `note` bucket is:
//   { content, tags[], systemTags[], creationDate, modificationDate, deleted,
//     shareURL, publishURL }
// where `content` is Markdown and its FIRST LINE is what every Simplenote
// client shows as the title.

import { EventEmitter } from 'events'
import simperium from 'simperium'
import WebSocket from 'ws'

// node-simperium is Babel-compiled CommonJS: the factory sits on `.default`
// behind an `__esModule` marker. Bundlers honour that marker and Node's own
// CJS/ESM interop does not, and electron-vite externalises this dependency, so
// the built main process ends up with a bare `require("simperium")` that yields
// the namespace object rather than the function. Depending on who resolved the
// import we get one or the other, so normalise instead of trusting either.
//
// This is not hypothetical: it shipped once. `sync.start()` threw
// "createClient is not a function" on its first line, so the token stored
// correctly and no note ever arrived.
const createClient = typeof simperium === 'function' ? simperium : simperium.default

// Simplenote's own Simperium application. The key is public, because every
// open-source Simplenote client ships it. It is not ours though, so we use it
// only to talk to the user's own account, exactly as the official clients do.
export const APP_ID = 'chalk-bump-f49'
export const API_KEY = 'c8c2b86337154cdabc989b23e30c6bf4'

// Simplenote renders a note as Markdown only when this is in its systemTags.
// Without it, a note Scriptorium wrote shows up as raw syntax on the user's
// phone, so every note we touch gets it.
const MARKDOWN_TAG = 'markdown'

/**
 * Every WebSocket the sync client uses, with the one listener node-simperium
 * forgets to attach.
 *
 * ⚠️ This is not defensive tidying, it is a crash fix. node-simperium's
 * `Client.connect()` assigns `onopen`, `onmessage` and `onclose` and **never**
 * `onerror`, so a bare `new WebSocket(url)` reaches it with zero `'error'`
 * listeners. An EventEmitter that emits `'error'` with no listener throws, and
 * in the main process that is an uncaught exception dialog over the editor.
 *
 * It is reachable by simply closing the laptop lid:
 *
 *   1. The app connects. `Client.onConnect` sets `open = true` and starts the
 *      heartbeat. **`open` is never set back to false** — grep the library, it
 *      is assigned in exactly two places, `false` in the constructor and `true`
 *      there — so from now on `disconnect()` always takes its
 *      `this.socket.close()` branch whatever the socket is really doing.
 *   2. The network drops. The reconnection timer fires, `connect()` builds a
 *      fresh socket, and that socket sits in CONNECTING with nothing to reach.
 *   3. The heartbeat times out after 2x its interval, `onConnectionTimeout`
 *      calls `disconnect()`, and `open` is still true from step 1, so it calls
 *      `close()` on the CONNECTING socket.
 *   4. `ws` answers a close during the handshake by calling `abortHandshake`,
 *      which emits `'error'`. Nothing is listening. The app dies.
 *
 * Handling it here restores the recovery that was always intended: `ws` emits
 * `'error'` and then `'close'`, `onclose` reaches `Client.onConnectionFailed`,
 * and the reconnection timer tries again.
 *
 * Deliberately NOT surfaced as a `sync-error` toast. This fires on every failed
 * reconnect, which means every time the machine wakes up, and a red banner for
 * something the status indicator already reports as "Not connected" would be
 * noise. It is logged, because a *persistent* failure is worth being able to
 * read in a terminal.
 */
export const createSocket = (url) => {
  const socket = new WebSocket(url)
  socket.on('error', (e) => {
    console.warn('[sync] socket error:', (e && e.message) || e)
  })
  return socket
}

export const titleOf = (content) => {
  const line = String(content || '').split('\n').find((l) => l.trim().length)
  return (line || '').replace(/^#+\s*/, '').trim() || 'New note'
}

export const previewOf = (content) => {
  const lines = String(content || '').split('\n')
  const first = lines.findIndex((l) => l.trim().length)
  return lines.slice(first + 1).find((l) => l.trim().length)?.trim().slice(0, 120) || ''
}

export default class Sync extends EventEmitter {
  constructor() {
    super()
    this.client = null
    this.bucket = null
    this.notes = new Map()
    this.status = 'offline'
  }

  get connected() { return this.status === 'connected' }

  /** Bring the client up against a token. Safe to call again to swap accounts. */
  start(token) {
    this.stop()
    if (!token) return

    this.client = createClient(APP_ID, token, {
      // Electron's main process is Node, where `window.WebSocket` does not
      // exist, so the library's default provider would fail. Hand it `ws`,
      // wrapped — see createSocket, which carries the crash it prevents.
      websocketClientProvider: createSocket
    })

    this.client.on('connect', () => this.#setStatus('connected'))
    this.client.on('disconnect', () => this.#setStatus('offline'))
    this.client.on('reconnect', () => this.#setStatus('connecting'))
    this.client.on('unauthorized', () => {
      // A rejected token is not a network problem and retrying cannot fix it.
      this.#setStatus('unauthorized')
      this.emit('unauthorized')
    })
    this.client.on('error', (e) => this.emit('sync-error', String(e && e.message || e)))

    this.bucket = this.client.bucket('note')
    this.bucket.on('update', (id, data) => this.#ingest(id, data))
    this.bucket.on('remove', (id) => { this.notes.delete(id); this.emit('notes', this.list()) })
    this.bucket.on('indexing', () => this.#setStatus('indexing'))
    // ⚠️ And back again when it finishes, or the status never leaves
    // "Downloading notes". The two events are not a matched pair and the names
    // invite the mistake: the bucket emits `indexing` when it starts and
    // **`index`**, not `indexed`, when it is done. Without this the sidebar,
    // the Settings sheet and the status.json the Omarchy widget reads all claim
    // a download is still running for as long as the app is open.
    this.bucket.on('index', () => this.#setStatus('connected'))

    this.#setStatus('connecting')
  }

  stop() {
    if (this.client) {
      try { this.client.end() } catch { /* already down */ }
    }
    this.client = null
    this.bucket = null
    this.notes.clear()
    this.status = 'offline'
  }

  #setStatus(status) {
    if (this.status === status) return
    this.status = status
    this.emit('status', status)
  }

  #ingest(id, data) {
    if (!data) return
    this.notes.set(id, { id, ...data })
    this.emit('notes', this.list())
    this.emit('note', this.get(id))
  }

  /** Every live note, newest first. Trashed notes are held back. */
  list() {
    return [...this.notes.values()]
      .filter((n) => !n.deleted)
      .map((n) => ({
        id: n.id,
        title: titleOf(n.content),
        preview: previewOf(n.content),
        tags: n.tags || [],
        pinned: (n.systemTags || []).includes('pinned'),
        modificationDate: n.modificationDate || 0
      }))
      .sort((a, b) =>
        (b.pinned - a.pinned) || (b.modificationDate - a.modificationDate))
  }

  get(id) {
    const n = this.notes.get(id)
    return n ? { ...n } : null
  }

  /**
   * Every live note WITH its content, for export.
   *
   * Separate from list(), which deliberately carries only what the sidebar and
   * the Omarchy plugin need. Note bodies are the private part, so they are
   * handed out only where something actually writes them to a file.
   */
  all() {
    return [...this.notes.values()].filter((n) => !n.deleted)
  }

  /**
   * Write a note's Markdown back.
   *
   * The caller decides whether there is anything to write. See `hasEdits` in
   * src/shared/markdown.mjs. This method does not second-guess that, because
   * merely opening a note re-spells some Markdown and saving that would show up
   * as an edit on every one of the user's devices.
   */
  save(id, content) {
    const note = this.notes.get(id)
    if (!note || !this.bucket) return null

    const systemTags = new Set(note.systemTags || [])
    systemTags.add(MARKDOWN_TAG)

    const next = {
      ...note,
      content,
      systemTags: [...systemTags],
      modificationDate: Date.now() / 1000
    }
    delete next.id

    this.bucket.update(id, next)
    this.notes.set(id, { id, ...next })
    this.emit('notes', this.list())
    return next
  }

  create(content = '') {
    if (!this.bucket) return null
    const now = Date.now() / 1000
    const note = {
      content,
      tags: [],
      systemTags: [MARKDOWN_TAG],
      creationDate: now,
      modificationDate: now,
      deleted: false,
      shareURL: '',
      publishURL: ''
    }
    return new Promise((resolve) => {
      this.bucket.add(note, (err, added) => {
        if (err || !added) return resolve(null)
        this.#ingest(added.id, added.data || note)
        resolve(added.id)
      })
    })
  }

  /**
   * Move a note to the trash, the same thing every other Simplenote client
   * means by "delete". Nothing here erases a note outright: that is not ours to
   * do to somebody's only copy.
   */
  trash(id) {
    const note = this.notes.get(id)
    if (!note || !this.bucket) return
    const next = { ...note, deleted: true, modificationDate: Date.now() / 1000 }
    delete next.id
    this.bucket.update(id, next)
    this.notes.set(id, { id, ...next })
    this.emit('notes', this.list())
  }
}
