import Store from 'electron-store'
import { dataPath } from './paths.js'

export { dataPath }

const store = new Store({
  cwd: dataPath,
  defaults: {
    // The Simperium access token. Obtained by signing in through Simplenote's
    // own page in our own window (src/main/auth.js), or pasted in Settings.
    // Never a username or a password. Scriptorium never sees those.
    token: '',
    tokenSource: '',

    // Appearance. `style` is a built-in name from styles.js or a custom one.
    style: 'Ink',
    fontScale: 1,
    customStyles: {},
    // Track the system theme when one can be read. Only Omarchy publishes one,
    // so on macOS this can never be anything but a promise the app cannot keep.
    followOmarchy: process.platform !== 'darwin',

    // Editing
    autosaveMs: 1200,
    spellcheck: true,

    // Scales the whole interface, the way EmuLatte and OAKANIZER do it: a
    // webContents zoom factor rather than a font size, so chrome and text move
    // together instead of the layout drifting apart.
    uiScale: 1,

    // Session
    lastNoteId: '',
    windowBounds: null
  }
})

export default store
