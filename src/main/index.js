import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import store, { dataPath } from './store.js'
import { configDir, statusPath, notesPath } from './paths.js'
import Sync from './sync.js'
import { login, forget } from './auth.js'
import * as omarchy from './omarchy.js'
import { fontCatalog, loadFontCss } from './fonts.js'
import * as dictate from './dictate.js'
import * as desktop from './desktop.js'
import Server from './server.js'
import { writeNote, writeAllZip, suggestedName } from './export.js'

const IS_MAC = process.platform === 'darwin'

// The toolbar's first row, in CSS pixels at 100%: 0.4rem of padding twice plus
// a 1.95rem button. The macOS traffic lights have to be centred in it.
const TOOLBAR_PX = 44
const LIGHT_PX = 12

let win = null
const sync = new Sync()
const server = new Server(sync)

// Started with --serve, the app runs with no window: the Omarchy overlay pings
// it, starts it this way if nothing answers, and reads and writes notes over
// the loopback API. A serving instance also stays alive when its window is
// closed, because the overlay is still using it.
const serving = process.argv.includes('--serve')

// What can actually relaunch this app.
//
// ⚠️ NOT `process.execPath` unconditionally. In an unpackaged dev run that is
// the raw Electron binary, and advertising it means the Omarchy plugin's
// middle-click launches Electron with no app, which shows Electron's own
// default welcome window and looks like the app is broken.
//
// An unpackaged run has no single command that relaunches it, so it advertises
// none. Both the plugin and the overlay already treat an empty command as "the
// app is not installed here", which is the truthful answer.
function launchCommand() {
  if (process.env.APPIMAGE) return process.env.APPIMAGE
  return app.isPackaged ? process.execPath : ''
}

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
      command: launchCommand(),
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
    // macOS draws its own close/minimise/zoom buttons, and a window without
    // them reads as broken, so the frame is only hidden down to an inset title
    // bar. The toolbar pads its first row clear of the lights and makes itself
    // a drag region; see the [data-platform="darwin"] rules in scriptorium.css.
    ...(IS_MAC ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 15, y: 16 } } : {}),
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

  // Zoom has to be set on a live page, not in webPreferences.
  win.webContents.on('did-finish-load', () => {
    applyZoom(store.get('uiScale') || 1)
  })

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

// The interface scale is a webContents zoom factor, so every CSS pixel in the
// toolbar shrinks with it — but on macOS the traffic lights are drawn by the
// system at a fixed size and do not move. Left alone, 50% leaves them dangling
// below a half-height toolbar and over the note list.
//
// The two halves of the answer: the toolbar divides its macOS gap and its
// height by --zoom, so both stay put in real pixels (see scriptorium.css), and
// the lights are re-centred here once it grows past its natural height.
function applyZoom(value) {
  if (!win || win.isDestroyed()) return
  win.webContents.setZoomFactor(value)
  win.webContents.send('ui:zoom', value)
  if (!IS_MAC) return
  const bar = Math.max(TOOLBAR_PX * value, TOOLBAR_PX)
  win.setWindowButtonPosition({ x: 15, y: Math.round((bar - LIGHT_PX) / 2) })
}

// Running headless there is no renderer to send to, so make one and wait for it
// before delivering. Without this, `--note <id>` against a serving instance
// silently does nothing.
function ensureWindow() {
  if (win && !win.isDestroyed()) return Promise.resolve()
  createWindow()
  return new Promise((resolve) => win.webContents.once('did-finish-load', resolve))
}

// ── command line, used by the Omarchy plugin ────────────────────────────────
// `--new`, `--note <id>` and `--capture <text>` are what the bar widget and the
// launcher overlay send. They arrive either as the first launch's argv or, when
// the app is already up, through the single-instance hook below.
async function handleArgs(argv) {
  const at = (flag) => argv.indexOf(flag)

  // Show a window unless this invocation was purely --serve.
  //
  // ⚠️ This used to test `argv.length <= 1` for the plain "just open it" case,
  // which is wrong: a packaged Electron app never has a one-element argv. With a
  // headless --serve instance holding the single-instance lock, every click on
  // the app handed its argv to the running copy, which decided nothing had been
  // asked for and did nothing at all. The app became impossible to open.
  const uiFlag = at('--new') !== -1 || at('--note') !== -1 ||
                 at('--capture') !== -1 || at('--open') !== -1
  const wantsUi = uiFlag || at('--serve') === -1
  if (wantsUi) await ensureWindow()

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

  if (wantsUi && win && !win.isDestroyed()) { win.show(); win.focus() }
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

// ── export ──────────────────────────────────────────────────────────────────
ipcMain.handle('export:note', async (_e, id) => {
  const note = sync.get(id)
  if (!note) return { error: 'That note is not loaded.' }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export note',
    defaultPath: suggestedName(note.content),
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (canceled || !filePath) return { canceled: true }

  try {
    writeNote(filePath, note.content)
    return { ok: true, filePath }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
})

ipcMain.handle('export:all', async () => {
  const notes = sync.all()
  if (!notes.length) return { error: 'There are no notes to export yet.' }

  const stamp = new Date().toISOString().slice(0, 10)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export all notes',
    defaultPath: 'Scriptorium notes ' + stamp + '.zip',
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }]
  })
  if (canceled || !filePath) return { canceled: true }

  try {
    return { ok: true, ...writeAllZip(filePath, notes) }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
})

// ── system integration and appearance ───────────────────────────────────────
ipcMain.handle('desktop:install', () => desktop.install())
ipcMain.handle('desktop:installed', () => desktop.installed())

ipcMain.handle('ui:scale', (_e, scale) => {
  const value = Math.min(2, Math.max(0.5, Number(scale) || 1))
  store.set('uiScale', value)
  applyZoom(value)
  return value
})

ipcMain.handle('ui:spellcheck', (_e, on) => {
  const value = !!on
  store.set('spellcheck', value)
  // Live, on the session, because webPreferences.spellcheck is read once at
  // window creation and a restart to change a checkbox would be silly.
  if (win && !win.isDestroyed()) win.webContents.session.setSpellCheckerEnabled(value)
  return value
})

ipcMain.handle('dictate:available', () => dictate.available())
ipcMain.handle('dictate:set', (_e, on) => dictate.setListening(on, (ev) => send('dictate:event', ev)))

// ── menu bar ────────────────────────────────────────────────────────────────
// macOS needs a real menu. Without one there is no ⌘Q, no ⌘C/⌘V/⌘X/⌘A and no
// ⌘Z — a BrowserWindow gets those from menu roles, not for free — and the
// system's own Dictation and Emoji items, which it injects into a standard Edit
// menu, never appear. Linux keeps no menu at all, as it always has.
//
// ⌘F and ⌘S are deliberately absent so nothing is claimed twice: App.svelte
// binds them itself. ⌘N is the other way round — the menu owns it here and the
// renderer's keydown handler stands down on darwin, so the shortcut is visible
// where a Mac user looks for it.
function buildMenu() {
  if (!IS_MAC) {
    Menu.setApplicationMenu(null)
    return
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => handleArgs(['--new'])
        },
        { type: 'separator' },
        {
          label: 'Export Note…',
          accelerator: 'Shift+CmdOrCtrl+E',
          click: () => send('menu:command', 'export-note')
        },
        {
          label: 'Export All Notes…',
          accelerator: 'Shift+Alt+CmdOrCtrl+E',
          click: () => send('menu:command', 'export-all')
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    // Roles, not hand-written items: the system adds Dictation and Emoji &
    // Symbols to an Edit menu it recognises, and only to one it recognises.
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]))
}

// ── lifecycle ───────────────────────────────────────────────────────────────
// One instance only. `scriptorium --new` from the bar must reach the running app
// and open a note in it, not start a second copy fighting the first over the
// same account.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => { handleArgs(argv) })

  app.whenReady().then(async () => {
    buildMenu()
    if (!serving) createWindow()
    startSync()

    // Always on, whether or not this instance was started headless: the overlay
    // should be able to reach a window the user opened by hand too.
    await server.start()

    omarchy.watch(() => {
      if (store.get('followOmarchy')) send('omarchy:changed', omarchy.currentStyle())
    })

    if (win) win.webContents.once('did-finish-load', () => handleArgs(process.argv))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    app.on('before-quit', shutdown)
  })
}

// Stop the network, the dictation child and the loopback socket, and leave the
// status file truthful rather than stale. Guarded because on Linux this runs
// twice: window-all-closed calls it and then quits, and quitting fires
// before-quit.
let tornDown = false
function shutdown() {
  if (tornDown) return
  tornDown = true

  dictate.shutdown()
  sync.stop()
  server.stop()
  try {
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'closed', notes: 0, signedIn: !!store.get('token'),
      command: launchCommand(), updated: Date.now()
    }, null, 2))
  } catch { /* nothing to do about it now */ }
}

app.on('window-all-closed', () => {
  // A serving instance outlives its window. Closing the editor should not take
  // the overlay's ability to write notes down with it.
  //
  // ⚠️ On macOS the app itself outlives its last window too, and the dock icon
  // brings one back through `activate`. Tearing sync down here would hand that
  // new window an app that can never reach the account again, because nothing
  // on the activate path starts sync a second time. So darwin leaves everything
  // running and does its teardown in before-quit instead.
  if (serving || IS_MAC) {
    win = null
    return
  }
  shutdown()
  app.quit()
})

export { dataPath }
