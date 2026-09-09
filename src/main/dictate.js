// Drives the Latte Dictate sibling app.
//
// Speech recognition cannot happen inside Electron: webkitSpeechRecognition is
// backed by an API key compiled into official Google Chrome builds, and
// Electron's Chromium ships without it. Latte Dictate is a separate process
// that drives real Chrome, so it can.
//
// We ATTACH to it rather than spawn our own. Latte Dictate's --serve mode talks
// over the child's stdin/stdout, which means the only way to get a pipe is to
// be the parent - so this used to start a second daemon on a second port, and
// the user ended up with two daemons, two Chrome windows and two tray icons
// whenever their global hotkey daemon was already running.
//
//   GET  /ping                  is one already running?
//   GET  /consume?type=off      SSE: the same events --serve writes to stdout
//   POST /control {action}      start / stop
//
// `type=off` tells it we insert the text ourselves, so it suppresses its own
// ydotool typing for as long as we stay attached - without that every phrase
// would land twice. Detaching restores typing, which is what the hotkey wants.
//
// Events we receive: {"event":"ready"|"state"|"interim"|"final"|"bye"|"error"}
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import http from 'http'
import fs from 'fs'
import os from 'os'

// The standard port, shared with the standalone daemon on purpose. One daemon
// serves the hotkey and this app; whoever needs it first starts it.
const PORT = 42815
const HOST = '127.0.0.1'

const CANDIDATE_DIRS = [
  () => (process.env.APPIMAGE ? dirname(process.env.APPIMAGE) : null),
  () => join(os.homedir(), 'LatteWrite'),
  () => join(os.homedir(), 'Applications'),
  () => join(os.homedir(), '.local', 'bin')
]

// Development checkout, used only when no AppImage is found.
const DEV_SCRIPT = join(os.homedir(), 'Documents', 'DEVELOPMENT', 'CLAUDE',
  'LatteDictate', 'latte_dictate.py')

let stream = null        // the live /consume request
let spawned = false      // did we start the daemon, or attach to someone else's?
let onEvent = () => {}
let buf = ''

/** Newest LatteDictate*.AppImage in the usual places, or the dev checkout. */
export function findBinary() {
  const override = process.env.LATTE_DICTATE
  if (override && fs.existsSync(override)) return override

  for (const get of CANDIDATE_DIRS) {
    const dir = get()
    if (!dir || !fs.existsSync(dir)) continue
    const hits = fs.readdirSync(dir)
      .filter(f => /^LatteDictate.*\.AppImage$/i.test(f) && !/_old\./i.test(f))
      .map(f => join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    if (hits.length) return hits[0]
  }
  return fs.existsSync(DEV_SCRIPT) ? DEV_SCRIPT : null
}

export function available() {
  return !!findBinary()
}

// ── talking to the daemon ───────────────────────────────────────────────────

function ping(timeout = 700) {
  return new Promise((resolve) => {
    const req = http.get({ host: HOST, port: PORT, path: '/ping', timeout }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { body += d })
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve(null) } })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

function control(action) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ action })
    const req = http.request({
      host: HOST, port: PORT, path: '/control', method: 'POST', timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode === 200)) })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end(body)
  })
}

function handleLine(line) {
  line = line.trim()
  if (!line) return
  let ev
  try { ev = JSON.parse(line) } catch { return }
  onEvent(ev)
}

function attach() {
  return new Promise((resolve) => {
    const req = http.get({ host: HOST, port: PORT, path: '/consume?type=off' }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(false); return }
      stream = req
      buf = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        // A chunk is not a line: SSE frames split across reads and several
        // arrive together.
        buf += chunk
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const l of lines) if (l.startsWith('data: ')) handleLine(l.slice(6))
      })
      const dropped = () => {
        if (stream !== req) return
        stream = null
        onEvent({ event: 'exit', text: 'dictation stopped' })
      }
      res.on('end', dropped)
      res.on('close', dropped)
      resolve(true)
    })
    req.on('error', () => { stream = null; resolve(false) })
  })
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function startDaemon() {
  const bin = findBinary()
  if (!bin) return false

  // A plain daemon, not --serve and not --no-type: it should behave exactly as
  // if the user had started it themselves, so their hotkey drives the same one.
  // Our own typing suppression rides on the /consume connection instead.
  const args = ['--port', String(PORT)]
  const [cmd, argv] = bin.endsWith('.py')
    ? ['python3', [bin, ...args]]
    : [bin, args]
  try {
    // Detached: it outlives us on purpose now that it is also the hotkey's
    // daemon. shutdown() stops it again if we were the ones who started it.
    const child = spawn(cmd, argv, { detached: true, stdio: 'ignore' })
    child.unref()
  } catch {
    return false
  }

  for (let i = 0; i < 40; i++) {           // up to ~8s for it to bind
    await sleep(200)
    if (await ping()) { spawned = true; return true }
  }
  return false
}

/** Attach, starting a daemon first if nothing is running. */
export async function ensure(send) {
  onEvent = send
  if (stream) return true
  if (!(await ping()) && !(await startDaemon())) return false
  return attach()
}

// ── the API index.js uses ───────────────────────────────────────────────────

export async function setListening(on, emit) {
  if (!on) return control('stop')
  if (!(await ensure(emit))) return false
  // No need to wait for a page: the daemon opens one if none is connected, and
  // a page that connects later is told to start as it subscribes. The old
  // poll-until-connected dance existed because we spawned our own daemon and
  // raced its startup window; attaching removes the race.
  return control('start')
}

/** Called on app quit. */
export function shutdown() {
  if (stream) {
    try { stream.destroy() } catch {}
    stream = null
  }
  // Only stop the daemon if it was ours. If the user already had one running
  // behind their hotkey, killing it here would be rude - and it is the same
  // daemon, so they would lose the hotkey too.
  if (spawned) {
    spawned = false
    control('quit').catch(() => {})
  }
}
