// A loopback API, so the Omarchy plugin can read and write notes without
// opening the app.
//
// The plugin used to be a reader: it took titles out of notes.json and shelled
// out to the app for anything else. Editing needs note BODIES and a way to save
// them, and there are only two ways to get that.
//
// The wrong one is for the plugin to talk to Simperium itself. That is a second
// sync client on the same account, racing the first, with its own idea of what
// the note said. The right one is this: the app stays the only thing that talks
// to Simperium, and hands out what it already has in memory.
//
// SECURITY. This serves the full text of every note the user owns, so:
//   - it binds to 127.0.0.1 only, never a real interface;
//   - every request must carry a secret token, written to a 0600 file that only
//     the user can read. Without it another process on a shared machine could
//     read the whole archive over a socket nobody thought about.
// It is not a substitute for real auth and is not meant to leave this machine.

import http from 'http'
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { configDir } from './paths.js'

const HOST = '127.0.0.1'
const DEFAULT_PORT = 42817
const DESCRIPTOR = path.join(configDir, 'server.json')

const json = (res, code, body) => {
  const text = JSON.stringify(body)
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
    // Nothing here should ever be cached or reachable from a page.
    'Cache-Control': 'no-store'
  })
  res.end(text)
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default class Server {
  constructor(sync) {
    this.sync = sync
    this.server = null
    this.port = 0
    this.token = crypto.randomBytes(24).toString('hex')
  }

  async start(port = DEFAULT_PORT) {
    if (this.server) return this.port

    this.server = http.createServer((req, res) => this.#handle(req, res))

    await new Promise((resolve) => {
      this.server.on('error', () => {
        // Port taken, most likely by a copy of this app that is already
        // serving. Fall back to an ephemeral port and publish the real one.
        this.server.listen(0, HOST, resolve)
      })
      this.server.listen(port, HOST, resolve)
    })

    this.port = this.server.address().port
    this.#publish()
    return this.port
  }

  stop() {
    if (this.server) { try { this.server.close() } catch { /* already down */ } }
    this.server = null
    try { fs.rmSync(DESCRIPTOR, { force: true }) } catch { /* nothing to remove */ }
  }

  // Where the plugin looks. Written 0600 because it carries the token, and the
  // token is the only thing standing between another local process and every
  // note the user has.
  #publish() {
    try {
      fs.mkdirSync(configDir, { recursive: true })
      fs.writeFileSync(
        DESCRIPTOR,
        JSON.stringify({ port: this.port, token: this.token }, null, 2),
        { mode: 0o600 }
      )
      fs.chmodSync(DESCRIPTOR, 0o600)
    } catch { /* a read-only home just means no plugin API */ }
  }

  async #handle(req, res) {
    // Reject anything that did not come from this machine, whatever the token
    // says. Belt and braces alongside binding to loopback.
    const remote = req.socket.remoteAddress || ''
    if (!remote.includes('127.0.0.1') && remote !== '::1') return json(res, 403, { error: 'local only' })

    if (req.headers['x-scriptorium-token'] !== this.token) {
      return json(res, 401, { error: 'bad token' })
    }

    const url = new URL(req.url, 'http://localhost')
    const id = url.searchParams.get('id') || ''

    try {
      // Liveness, and enough state for the overlay to explain itself.
      if (url.pathname === '/ping') {
        return json(res, 200, {
          ok: true,
          status: this.sync.status,
          notes: this.sync.list().length
        })
      }

      if (url.pathname === '/notes') {
        return json(res, 200, { notes: this.sync.list() })
      }

      if (url.pathname === '/note' && req.method === 'GET') {
        const note = this.sync.get(id)
        if (!note) return json(res, 404, { error: 'no such note' })
        return json(res, 200, { id: note.id, content: note.content || '' })
      }

      if (url.pathname === '/note' && req.method === 'POST') {
        const content = await readBody(req)
        if (!this.sync.get(id)) return json(res, 404, { error: 'no such note' })
        this.sync.save(id, content)
        return json(res, 200, { ok: true, id })
      }

      // Trash, never erase. Simplenote's trash is recoverable and this is
      // somebody's only copy; a keystroke in an overlay should not be able to
      // destroy a note outright.
      if (url.pathname === '/note' && req.method === 'DELETE') {
        if (!this.sync.get(id)) return json(res, 404, { error: 'no such note' })
        this.sync.trash(id)
        return json(res, 200, { ok: true, id })
      }

      if (url.pathname === '/new' && req.method === 'POST') {
        const content = await readBody(req)
        const newId = await this.sync.create(content)
        if (!newId) return json(res, 503, { error: 'not connected to Simplenote' })
        return json(res, 200, { ok: true, id: newId })
      }

      return json(res, 404, { error: 'no such endpoint' })
    } catch (e) {
      return json(res, 500, { error: String((e && e.message) || e) })
    }
  }
}

export { DEFAULT_PORT, DESCRIPTOR }
