# Porting Scriptorium to macOS

A handoff for whoever does the Mac build, written on the Linux side by someone
who could not run any of it. Everything below that is stated as fact was read out
of this repository or verified on Linux. Everything that needs a Mac to confirm
is marked **UNVERIFIED**.

Read the signing section before you build anything. It is the one that wastes a
day if you meet it by surprise.

---

## 1. Where the port actually stands

Scriptorium was written on Linux and has almost no platform guards. There are
exactly two in the whole main process:

| File | Guard |
| --- | --- |
| `src/main/paths.js:11` | `APP_HOME` branches on `darwin` |
| `src/main/index.js:327` | `window-all-closed` does not quit on `darwin` |

Both were inherited from LatteWrite rather than written for this app. Everything
else assumes Linux. Nothing here is hard, but there is more of it than "add a
build target".

The app itself is portable in the ways that matter: sync is HTTPS and a
WebSocket, the editor is ProseMirror in a Chromium renderer, and the settings
store is JSON on disk. There is no Linux-only native module and `npmRebuild` is
already off (see section 6).

---

## 2. Prerequisites on the Mac

- macOS on Apple Silicon or Intel. The build config below targets `arm64`;
  change `arch` if you need Intel.
- Node 22 or newer. The Linux side builds on Node 22.23.2.
- Xcode Command Line Tools, for `codesign`:
  ```bash
  xcode-select --install
  ```
- No Apple Developer account, certificate, or notarization is required. See
  section 3 for why, and what you get instead.

Versions this repo is pinned to, which you should not change casually as part of
a port:

```
electron          ^34.5.8
electron-builder  ^25.1.8
electron-vite     ^2.3.0
```

---

## 3. The signing trap, read this first

**Apple Silicon refuses to launch an unsigned bundle.** It kills the process with
an error that looks like a crash inside the app, not like a security refusal. You
will lose hours believing your code is broken.

electron-builder does **not** ad-hoc sign. Without a real Apple identity it logs
`skipped macOS code signing` and hands you a bundle that will not start. This is
not a misconfiguration, it has no ad-hoc signing feature.

The fix is an `afterPack` hook that signs the assembled `.app` before it is
packaged, which is the only moment the signature ends up inside the artifact
rather than needing to be applied by hand. LatteWrite already solved this and the
script is worth copying verbatim from
`LatteWrite/scripts/afterPack.cjs`. Its shape:

```js
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = path.join(context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`)
  if (process.platform !== 'darwin') {
    console.log('  • ad-hoc signing skipped, codesign exists only on macOS.')
    return
  }
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app],
    { stdio: 'inherit' })
}
```

Wire it up in `package.json`:

```json
"build": {
  "afterPack": "scripts/afterPack.cjs"
}
```

**If a bundle was cross-built on Linux** it cannot be signed there, because
`codesign` is macOS-only. Two manual steps on the Mac make it run:

```bash
xattr -cr Scriptorium.app                        # clear the download quarantine
codesign --force --deep --sign - Scriptorium.app # ad-hoc signature
```

Worth putting in an `install-on-mac.sh` beside the artifact so nobody has to
remember it.

---

## 4. Build steps on the Mac

```bash
git clone https://github.com/FromChaosComesClarity/Scriptorium
cd Scriptorium
npm install

npm test            # the round-trip suite. No account or network needed.
npm run dev         # run it unpackaged first, before packaging anything
npm run dist:mac    # after the config changes in section 5
```

`npm test` is the gate that decides whether this build is safe to point at a real
account. It audits the schema, checks Markdown fidelity, and proves the round
trip reaches a fixed point. It is pure JS and platform independent, so it should
pass identically on macOS. **UNVERIFIED**, but there is nothing platform-specific
in it.

Run `npm run dev` before packaging. Almost every problem in section 5 shows up
there, and the packaging step is slow.

---

## 5. Code changes, file by file

### 5.1 `src/main/index.js` — the menu bar. Not optional.

Line 287:

```js
Menu.setApplicationMenu(null)
```

On Linux this removes a menu nobody wants. On macOS it removes the **application
menu**, and a `BrowserWindow` with no menu has no ⌘Q, ⌘C, ⌘V, ⌘X, ⌘A or ⌘Z,
because those are menu accelerators rather than built-in behaviours. The system
also stops offering its own Dictation and Emoji items in the Edit menu.

This is the single change most likely to be reported as "the Mac build is
broken". Do it first.

```js
if (process.platform === 'darwin') {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },      // gives ⌘C/⌘V/⌘X/⌘A/⌘Z and the system's own
                               // Dictation and Emoji items
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]))
} else {
  Menu.setApplicationMenu(null)
}
```

Consider adding Scriptorium's own items to the File menu while you are there:
New Note, Export Note, Export All. They exist as IPC handlers already
(`export:note`, `export:all`, `notes:create`).

### 5.2 `src/main/index.js` — window chrome

The window is created with defaults, which on macOS means a standard title bar.
LatteWrite used `titleBarStyle: 'hiddenInset'` to keep the traffic lights while
losing the bar. Cosmetic, but it is what makes an Electron app stop looking like
a port. Your call.

### 5.3 `src/main/index.js` — where the binary is

`status.json` advertises a command that other things use to relaunch the app.
It is produced by `launchCommand()`:

```js
function launchCommand() {
  if (process.env.APPIMAGE) return process.env.APPIMAGE
  return app.isPackaged ? process.execPath : ''
}
```

The `app.isPackaged` check is load-bearing and was added after a real bug. It
used to be `process.env.APPIMAGE || process.execPath`, and in an unpackaged dev
run `process.execPath` is the raw Electron binary. That got written into
`status.json`, the Omarchy plugin's middle-click launched it, and Electron
opened its own default welcome window, which looks exactly like the app being
broken. An unpackaged run now advertises no command at all, and every consumer
already treats an empty command as "not installed here".

**On macOS this needs checking.** For a packaged `.app`, `process.execPath` is
the inner `Contents/MacOS/Scriptorium` executable, not the bundle. Launching the
inner executable directly usually works but bypasses `LaunchServices`, so it can
behave differently over document handling, activation and the Dock.

If that turns out to matter, derive the bundle path instead:

```js
if (app.isPackaged && process.platform === 'darwin') {
  // .../Scriptorium.app/Contents/MacOS/Scriptorium -> .../Scriptorium.app
  return process.execPath.replace(/\/Contents\/MacOS\/[^/]+$/, '')
}
```

and have consumers use `open -a <bundle> --args ...`. Nothing on macOS consumes
this today, since the Omarchy plugin is Linux-only, so it is only worth doing if
something starts to. **UNVERIFIED.**

### 5.4 `src/main/desktop.js` — Linux only, already guarded

`install()` returns `{ error: 'Only available when running the packaged
AppImage.' }` when `process.env.APPIMAGE` is unset, which is always on macOS. So
it fails safely.

But the Settings sheet still shows an **"Add to applications menu"** button that
can only ever produce that error. On macOS the `.app` bundle *is* the menu entry,
so the whole section should be hidden:

- `src/renderer/src/components/Settings.svelte`, the `system` section.
- The renderer has no platform flag today. Add one to the preload
  (`process.platform` is available there) and hide the section on `darwin`.

### 5.5 `src/main/dictate.js` — Linux only, degrades correctly

`findBinary()` looks for `LatteDictate*.AppImage` in a few directories and
returns `null` when it finds none, so `available()` is `false` on macOS and the
IPC handler answers honestly.

The Linux implementation also types through `ydotool`, which does not exist on
macOS.

**Recommendation: do not port LatteDictate.** LatteWrite's answer was to hide the
button on macOS and let the system's own dictation handle it, which works in any
text field including a ProseMirror one. That is less code and better behaviour.
Confirm the renderer actually hides the control when `dictate:available` returns
false, rather than showing a dead button.

### 5.6 `src/main/omarchy.js` — Linux only, degrades correctly

Reads `~/.local/state/omarchy/current/theme.name`. On macOS that path does not
exist, `available()` is false, and `currentStyle()` returns `null`. The renderer
then falls back to the built-in theme, which is correct.

Two consequences to handle in the UI:

- `followOmarchy` defaults to `true` in `src/main/store.js`. On macOS it can
  never do anything. Default it to `false` on `darwin` so the theme picker does
  not open on a "Desktop" tab that cannot exist.
- `App.svelte` builds a **Desktop** theme category from `window.api.theme.omarchy()`.
  When that returns null the category is already omitted. Verify that the picker
  then opens on a real tab rather than an empty one. **UNVERIFIED.**

### 5.7 `src/main/server.js` — no consumer on macOS

The loopback API exists to serve the Omarchy plugin, which cannot run on macOS.
It binds `127.0.0.1` and writes `~/.config/scriptorium/server.json` with mode
`0600`.

**Recommendation: leave it on.** It costs a socket on loopback, `--serve` keeps
working, and it keeps one codebase instead of two. Anyone scripting the app on a
Mac gets a usable API for free.

If you would rather the Mac build open no sockets at all, gate the single call
site in `index.js`:

```js
if (process.platform !== 'darwin') await server.start()
```

Do **not** delete the module. The `--serve` flag and the headless path are
referenced elsewhere in `handleArgs`.

### 5.8 `src/main/paths.js` — already branches, but check the second path

`APP_HOME` is already correct: on `darwin` it is `~/Scriptorium`, because a
signed `.app` bundle is treated as read-only and writing beside it invalidates
the signature. Settings therefore land in `~/Scriptorium/SCRIPTORIUM_DATA`.

`configDir` is **not** branched:

```js
export const configDir = path.join(os.homedir(), '.config', 'scriptorium')
```

`~/.config` is a Linux convention. On macOS the conventional location is
`~/Library/Application Support/Scriptorium`. This only holds `status.json`,
`notes.json` and `server.json`, all of which exist for the Omarchy plugin, so
nothing breaks either way. Decide whether you care about tidiness more than
having one path in the code.

---

## 6. Packaging configuration

### 6.1 The mac target

`package.json` currently has a `linux` block and no `mac` block. Add:

```json
"mac": {
  "target": [{ "target": "dmg", "arch": ["arm64"] }],
  "category": "public.app-category.productivity",
  "icon": "resources/icon.icns",
  "artifactName": "${productName}-${arch}.${ext}",
  "identity": null
}
```

`"identity": null` is deliberate. It stops electron-builder hunting for a real
signing identity and failing the build; the `afterPack` hook in section 3 does
the ad-hoc signature instead.

Add the scripts:

```json
"dist:mac": "electron-vite build && electron-builder --mac dmg --arm64",
"dist:mac:zip": "electron-vite build && electron-builder --mac zip --arm64"
```

### 6.2 The icon

`resources/` holds `icon.png` (1024x1024) and `icon.svg`. There is **no `.icns`**,
and macOS wants one.

Generate it on the Mac from the existing PNG:

```bash
mkdir -p /tmp/scriptorium.iconset
cd /tmp/scriptorium.iconset
for s in 16 32 64 128 256 512; do
  sips -z $s $s   ~/Scriptorium/resources/icon.png --out icon_${s}x${s}.png
  sips -z $((s*2)) $((s*2)) ~/Scriptorium/resources/icon.png --out icon_${s}x${s}@2x.png
done
iconutil -c icns /tmp/scriptorium.iconset -o ~/Scriptorium/resources/icon.icns
```

The mark is a stylised S drawn as vector paths in `resources/icon.svg`, so it
rescales cleanly. Regenerate from the SVG with `rsvg-convert` if you prefer a
sharper large size.

### 6.3 `npmRebuild` is off, and must stay off

```json
"npmRebuild": false
```

This is not laziness. The only native module in the tree is `websocket`, pulled
in by `simperium`. Its own install script is
`(node-gyp rebuild 2> builderror.log) || (exit 0)`, meaning its native build is
**optional by design** and it falls back to pure JS. electron-builder does not
respect that and fails the whole build on it. This already broke the Linux build
once.

Nothing here needs a native rebuild: the WebSocket actually used is `ws`, which
is pure JS and injected explicitly in `src/main/sync.js`.

### 6.4 `build.files`

```json
"files": ["out/**/*"]
```

electron-builder collects production `node_modules` separately, so the runtime
dependencies (`simperium`, `ws`, `electron-store`, `adm-zip`) are packaged
despite not matching that glob. Verified on the Linux artifact by extracting it
and confirming each module is present. Do the same check on the `.app`:

```bash
ls Scriptorium.app/Contents/Resources/
npx asar list Scriptorium.app/Contents/Resources/app.asar | grep -E "node_modules/(simperium|ws|electron-store|adm-zip)/package.json"
```

If any are missing, the app will launch and then fail the moment it tries to
sync, which looks like a login problem rather than a packaging one.

---

## 7. Things that should just work, and why

Stated so you do not go looking for problems that are not there.

- **Sync.** `src/main/sync.js` speaks to `wss://api.simperium.com` through `ws`.
  Pure JS, no platform surface.
- **The CJS interop fix.** `sync.js` normalises `simperium`'s Babel-compiled
  default export by hand. Do not "tidy" that back into a plain default import:
  electron-vite externalises the dependency and the bare `require` binds the
  namespace object, not the factory. This shipped broken once and the symptom was
  a completely silent failure to sync.
- **Sign-in.** `src/main/auth.js` opens Simplenote's own login page in a
  `BrowserWindow` with its own session partition, then sweeps that window's
  storage for the token. reCAPTCHA Enterprise sees a real browser. Nothing here
  is Linux-specific. **UNVERIFIED on macOS**, but there is no reason it should
  differ.
- **The Markdown round trip.** `src/shared/markdown.mjs` and `schema.mjs` are
  pure JS over ProseMirror.
- **Fonts.** 142 `@fontsource` packages are bundled at build time, so the 93
  themes render offline without a system font dependency.

---

## 8. Test checklist for the Mac build

Run in this order. Each step failing tells you something different.

1. `npm test` passes. If not, stop: the problem is not macOS.
2. `npm run dev` opens a window.
3. **⌘Q, ⌘C, ⌘V, ⌘A, ⌘Z all work.** If not, section 5.1.
4. Sign in through the button. A Simplenote login window opens, reCAPTCHA
   behaves, and after signing in the sidebar fills with notes.
5. Open a note, close it again without typing, and confirm on another device
   that its modified date did **not** change. This is the no-edit guarantee and
   it is the single most important behaviour in the app.
6. Edit a note, wait for autosave, confirm the change on another device.
7. Settings: interface scale applies immediately; spell check toggles; the
   "Add to applications menu" section is hidden (section 5.4).
8. Theme picker opens on a real tab and does not show a Desktop category.
9. Export a note, and export all notes to a zip. Confirm the zip opens and holds
   one `.md` per note.
10. `npm run dist:mac`, then launch the packaged `.app` **from Finder**, not from
    the terminal. This is what catches the signing problem.
11. Quit and relaunch. Settings, window size and the signed-in token all survive.

---

## 9. What I could not verify, honestly

I wrote this on Linux and ran none of it on a Mac. Specifically unverified:

- That the app launches at all once packaged and ad-hoc signed.
- That the login window's token sweep finds the token in a macOS Electron
  session. The storage key it looks for was confirmed on Linux as
  `localStorage:stored_user.accessToken`.
- Whether `process.execPath` in `status.json` is the bundle path or the inner
  executable.
- Whether the theme picker opens on a sensible tab when `omarchy.currentStyle()`
  returns null.
- Whether anything in the renderer assumes a Linux font stack. The themes name
  families explicitly and bundle them, so this should be fine, but "should" is
  the operative word.
- The `.icns` generation commands in section 6.2 are written from the standard
  `sips`/`iconutil` flow and have not been run.

---

## 10. Suggested order of work

1. Menu bar (5.1). Everything else is unusable to test without it.
2. `afterPack` signing hook and the `mac` build block (3, 6.1).
3. Icon (6.2).
4. Hide the macOS-irrelevant UI: applications menu section, dictation control,
   Desktop theme tab (5.4, 5.5, 5.6).
5. Decide on `configDir` and the loopback server (5.7, 5.8).
6. Work the checklist in section 8.

Items 4 and 5 are polish. Items 1 to 3 are the difference between a build that
runs and one that does not.
