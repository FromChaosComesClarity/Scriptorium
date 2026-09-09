import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { join } from 'path'
import fs from 'fs'
import store, { dataPath } from './store.js'
import { configDir, statusPath, notesPath } from './paths.js'
import Sync from './sync.js'
import { login, forget } from './auth.js'
import * as omarchy from './omarchy.js'
import { fontCatalog, loadFontCss } from './fonts.js'
import * as dictate from './dictate.js'

let win = null
const sync = new Sync()

// ── what the Omarchy plugin reads ───────────────────────────────────────────
function publish() {
  try {
    fs.mkdirSync(configDir, { recursive: true })
    const notes = sync.list()

    fs.writeFileSync(statusPath, JSON.stringify({
      status: sync.status,
      notes: notes.length,
      signedIn: !!store.get('token'),
      // Where this binary is, so the widget can start the app without being
      // configured with a path that only works on one machine.
      command: process.env.APPIMAGE || process.execPath,
      updated: Date.now()
    }, null, 2))

    // Titles and ids only. The overlay searches names and opens one; it has no
    // business holding the text of somebody's notes on disk in a second place.
    fs.writeFileSync(notesPath, JSON.stringify({
      notes: notes.map((n) => ({ id: n.id, title: n.title, pinned: n.pinned }))
    }))
  } catch { /* a read-only home is not worth crashing over */ }
}

// ── window ──────────────────────────────────────────────────────────────────
function createWindow() {
  const bounds = store.get('windowBounds') || { width: 1180, height: 800 }

  win = new BrowserWindow({
    ...bounds,
    minWidth: 620,
    minHeight: 420,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1b26',
    // In a packaged build __dirname is inside app.asar, where resources/ does not
    // exist: `files` only ships out/. electron-builder puts the icon beside the
    // asar via extraResources, so the packaged path has to come from there.
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icon.png')
      : join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: store.get('spellcheck') !== false
    }
  })

  if (bounds.maximized) win.maximize()
  win.on('ready-to-show', () => win.show())

  const remember = () => {
    if (!win || win.isDestroyed() || win.isMinimized()) return
    store.set('windowBounds', { ...win.getBounds(), maximized: win.isMaximized() })
  }
  win.on('resize', remember)
  win.on('move', remember)
  win.on('close', remember)

  // Links in a note open in the real browser, never inside the editor.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

// ── command line, used by the Omarchy plugin ────────────────────────────────
// `--new`, `--note <id>` and `--capture <text>` are what the bar widget and the
// launcher overlay send. They arrive either as the first launch's argv or, when
// the app is already up, through the single-instance hook below.
async function handleArgs(argv) {
  const at = (flag) => argv.indexOf(flag)

  if (at('--new') !== -1) {
    const id = await sync.create('')
    if (id) send('open-note', id)
  }

  const noteAt = at('--note')
  if (noteAt !== -1 && argv[noteAt + 1]) send('open-note', argv[noteAt + 1])

  const capAt = at('--capture')
  if (capAt !== -1 && argv[capAt + 1]) {
    const id = await sync.create(argv[capAt + 1])
    if (id) send('open-note', id)
  }

  if (win && !win.isDestroyed()) { win.show(); win.focus() }
}

// ── sync wiring ─────────────────────────────────────────────────────────────
sync.on('status', (status) => { send('sync:status', status); publish() })
sync.on('notes', (notes) => { send('notes:changed', notes); publish() })
sync.on('note', (note) => send('note:changed', note))
sync.on('sync-error', (message) => send('sync:error', message))
sync.on('unauthorized', () => {
  // A rejected token is not a network problem and retrying cannot fix it.
  store.set('token', '')
  send('auth:required')
  publish()
})

function startSync() {
  const token = store.get('token')
  if (token) sync.start(token)
  else send('auth:required')
  publish()
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('notes:list', () => sync.list())
ipcMain.handle('notes:get', (_e, id) => sync.get(id))
ipcMain.handle('notes:save', (_e, { id, content }) => sync.save(id, content))
ipcMain.handle('notes:create', () => sync.create(''))
ipcMain.handle('notes:trash', (_e, id) => sync.trash(id))
ipcMain.handle('sync:status', () => ({
  status: sync.status,
  signedIn: !!store.get('token'),
  lastNoteId: store.get('lastNoteId')
}))

ipcMain.handle('auth:login', async () => {
  const result = await login(win)
  if (!result) return { ok: false }
  store.set('token', result.token)
  store.set('tokenSource', result.source)
  startSync()
  return { ok: true, source: result.source }
})

ipcMain.handle('auth:paste-token', (_e, token) => {
  const clean = String(token || '').trim()
  if (!clean) return { ok: false }
  store.set('token', clean)
  store.set('tokenSource', 'pasted')
  startSync()
  return { ok: true }
})

ipcMain.handle('auth:logout', async () => {
  sync.stop()
  store.set('token', '')
  store.set('tokenSource', '')
  await forget()
  send('auth:required')
  publish()
  return true
})

ipcMain.handle('settings:get', (_e, key) => (key ? store.get(key) : store.store))
ipcMain.handle('settings:set', (_e, key, value) => { store.set(key, value); return true })

ipcMain.handle('omarchy:style', () => omarchy.currentStyle())
ipcMain.handle('fonts:catalog', () => fontCatalog())
ipcMain.handle('fonts:load', (_e, family) => loadFontCss(family))

ipcMain.handle('dictate:available', () => dictate.available())
ipcMain.handle('dictate:set', (_e, on) => dictate.setListening(on, (ev) => send('dictate:event', ev)))

// ── lifecycle ───────────────────────────────────────────────────────────────
// One instance only. `scriptorium --new` from the bar must reach the running app
// and open a note in it, not start a second copy fighting the first over the
// same account.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => { handleArgs(argv) })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createWindow()
    startSync()

    omarchy.watch(() => {
      if (store.get('followOmarchy')) send('omarchy:changed', omarchy.currentStyle())
    })

    win.webContents.once('did-finish-load', () => handleArgs(process.argv))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  dictate.shutdown()
  sync.stop()
  // The status file outlives the app, so leave it truthful rather than stale.
  try {
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'closed', notes: 0, signedIn: !!store.get('token'),
      command: process.env.APPIMAGE || process.execPath, updated: Date.now()
    }, null, 2))
  } catch { /* nothing to do about it now */ }
  if (process.platform !== 'darwin') app.quit()
})

export { dataPath }
