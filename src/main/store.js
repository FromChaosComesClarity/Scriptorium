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
    followOmarchy: true,   // track the system theme when one can be read

    // Editing
    autosaveMs: 1200,
    spellcheck: true,

    // Session
    lastNoteId: '',
    windowBounds: null
  }
})

export default store
