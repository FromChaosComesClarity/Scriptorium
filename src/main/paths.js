import os from 'os'
import path from 'path'

// Where Scriptorium keeps its settings and its font cache.
//
// Unlike LatteWrite there is no documents folder: the notes live in Simplenote,
// and the only local state is preferences, the cached token and downloaded
// fonts. The layout still follows the house convention, beside the AppImage on
// Linux, so moving the binary moves the whole app, because that is how EmuLatte
// and LatteWrite already behave on this machine.
export const APP_HOME = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Scriptorium')
  : (process.env.APPIMAGE ? path.dirname(process.env.APPIMAGE) : process.cwd())

export const dataPath = path.join(APP_HOME, 'SCRIPTORIUM_DATA')

// What the Omarchy plugin reads.
//
// These do NOT live beside the AppImage with the settings, and that is the whole
// point: the binary can be anywhere, so a plugin that looked for them next to it
// would have to be told where it is first. A fixed path under ~/.config is one
// the plugin can simply open. If the file is not there, Scriptorium has
// never run, which is a real answer rather than a guess.
//
// macOS has no Omarchy and so no reader for these files at all, which leaves
// nothing arguing for the Linux path there — so it follows the platform's own
// convention instead of dropping a stray ~/.config into a Mac home directory.
//
// Note this is also Electron's userData directory, because productName is what
// names both. That is deliberate and normal: our two files sit beside Chromium's
// Cache/ and Cookies without either touching the other, and it keeps the fixed,
// guessable path that is the entire reason these files exist.
export const configDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Scriptorium')
  : path.join(os.homedir(), '.config', 'scriptorium')

// Sync state, note count, and where the running binary is, so the widget can
// launch the app without being configured.
export const statusPath = path.join(configDir, 'status.json')

// Titles and ids only, enough for the launcher overlay to search and open one.
// Note BODIES are deliberately not written here: they are the user's private
// notes and the overlay has no use for them.
export const notesPath = path.join(configDir, 'notes.json')
