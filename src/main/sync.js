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
      // exist, so the library's default provider would fail. Hand it `ws`.
      websocketClientProvider: (url) => new WebSocket(url)
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
