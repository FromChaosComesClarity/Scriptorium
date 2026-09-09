// Getting a Simperium access token, given that the usual way no longer exists.
//
// Every third-party Simplenote client used to POST a username and password to
// auth.simperium.com. That host has no TCP listener any more (verified: 443 and
// 80 both time out), and node-simperium's own auth.js still points at it, so
// that route is simply gone.
//
// What still works is the thing a person does: open Simplenote's own login page
// in a real browser and sign in. The page is served with reCAPTCHA Enterprise,
// so it has to be a genuine browser with a genuine human, which an Electron
// window is. Afterwards the token is sitting in OUR OWN window's session, and
// we read it from there.
//
// Nothing here touches another browser's profile, and the user's password never
// passes through Scriptorium's code. It goes from their keyboard into
// Simplenote's own login form.
//
// The one thing that cannot be pinned down without signing in is which storage
// key the web app parks the token under, so this does not guess a single key:
// it sweeps localStorage and the cookie jar for anything token-shaped. If the
// sweep ever comes up empty, Settings still takes a pasted token.

import { BrowserWindow, session } from 'electron'

const LOGIN_URL = 'https://app.simplenote.com/'
const PARTITION = 'persist:simplenote-login'

// A Simperium access token is a long opaque string. Anything shorter than this,
// or containing punctuation a token would not, is something else.
const TOKENISH = /^[A-Za-z0-9._-]{32,}$/

// Runs inside the logged-in page. Returns every plausible token it can see,
// each labelled with where it came from so a failure is diagnosable rather than
// mysterious.
const SWEEP = `(() => {
  const found = [];
  const plausible = (v) => typeof v === 'string' && /^[A-Za-z0-9._-]{32,}$/.test(v);
  const visit = (where, key, value, depth) => {
    if (depth > 4 || value == null) return;
    if (plausible(value)) { found.push({ where, key, value }); return; }
    if (typeof value === 'string') {
      try { const p = JSON.parse(value); if (p && typeof p === 'object') visit(where, key, p, depth + 1) } catch {}
      return;
    }
    if (typeof value === 'object') {
      for (const k of Object.keys(value)) {
        const score = /token|access|auth|simperium/i.test(k) ? 0 : 1;
        visit(where, key ? key + '.' + k : k, value[k], depth + score);
      }
    }
  };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      visit('localStorage', k, localStorage.getItem(k), 0);
    }
  } catch {}
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      visit('sessionStorage', k, sessionStorage.getItem(k), 0);
    }
  } catch {}
  // A token whose key names it outranks a random long string that merely looks
  // like one, since an analytics id would otherwise win by being first.
  found.sort((a, b) => (/token|access|auth|simperium/i.test(b.key) ? 1 : 0) - (/token|access|auth|simperium/i.test(a.key) ? 1 : 0));
  return found;
})()`

async function sweepCookies(ses) {
  try {
    const jar = await ses.cookies.get({ domain: 'simplenote.com' })
    return jar
      .filter((c) => TOKENISH.test(c.value) && /token|auth|access/i.test(c.name))
      .map((c) => ({ where: 'cookie', key: c.name, value: c.value }))
  } catch {
    return []
  }
}

/**
 * Open the login window and resolve with a token, or null if the user closed it.
 *
 * @returns {Promise<{token: string, source: string} | null>}
 */
export function login(parent) {
  return new Promise((resolve) => {
    const ses = session.fromPartition(PARTITION)

    const win = new BrowserWindow({
      parent,
      width: 460,
      height: 720,
      title: 'Sign in to Simplenote',
      autoHideMenuBar: true,
      webPreferences: {
        session: ses,
        // This window shows a third party's login page. It gets no preload, no
        // node, and its own session partition. It must never be able to reach
        // anything of ours.
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearInterval(timer)
      if (!win.isDestroyed()) win.destroy()
      resolve(result)
    }

    const attempt = async () => {
      if (win.isDestroyed()) return
      let candidates = []
      try {
        candidates = await win.webContents.executeJavaScript(SWEEP, true)
      } catch {
        return // page still navigating, or nothing to read yet
      }
      if (!candidates.length) candidates = await sweepCookies(ses)
      const hit = candidates.find((c) => TOKENISH.test(c.value))
      if (hit) finish({ token: hit.value, source: `${hit.where}:${hit.key}` })
    }

    // The login flow redirects a few times and the token only appears at the
    // end, so poll rather than trying to guess the winning navigation.
    const timer = setInterval(attempt, 1000)
    win.webContents.on('did-finish-load', attempt)
    win.on('closed', () => finish(null))

    win.loadURL(LOGIN_URL)
  })
}

/** Forget the login session, so "sign out" really signs out. */
export async function forget() {
  try { await session.fromPartition(PARTITION).clearStorageData() } catch { /* nothing stored */ }
}
