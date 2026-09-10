// Every built-in Style's fonts are bundled so the app is beautiful offline; only
// custom user-picked families load at runtime. See fonts-bundle.js.
import './fonts-bundle.js'

import './app.css'
import './scriptorium.css'
import App from './App.svelte'

// So stylesheets can ask which system they are on. The only thing that needs it
// today is the gap the macOS traffic lights have to be given in the toolbar.
document.documentElement.dataset.platform = window.api.platform

// The interface scale, for the same gap: CSS cannot read a webContents zoom
// factor, and the gap has to divide by it to stay a fixed size on screen.
//
// Registered here rather than in App.svelte's onMount because the main process
// pushes the first value on did-finish-load, and onMount does not reach its
// listeners until several awaits later — the first push would be lost, and the
// window would open at the wrong scale until something changed it.
window.api.system.onZoom((z) => {
  document.documentElement.style.setProperty('--zoom', String(z || 1))
})

export default new App({ target: document.getElementById('app') })
