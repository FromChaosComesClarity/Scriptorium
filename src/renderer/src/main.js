// Every built-in Style's fonts are bundled so the app is beautiful offline; only
// custom user-picked families load at runtime. See fonts-bundle.js.
import './fonts-bundle.js'

import './app.css'
import './scriptorium.css'
import App from './App.svelte'

export default new App({ target: document.getElementById('app') })
