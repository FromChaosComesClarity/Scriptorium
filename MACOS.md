# Scriptorium on macOS

Written on the Linux side as a handoff by someone who could not run any of it,
then rewritten on the Mac by whoever did the port. Everything below now comes
either from this repository or from a command actually run on macOS 26.6.2,
Apple Silicon, Node 22.22.2, Electron 34.5.8. The few things still taken on
faith are marked **UNVERIFIED**, and section 9 lists them all in one place.

Read the signing section before you build anything. It is the one that wastes a
day if you meet it by surprise, and it is the reason the build works.

---

## 1. Where the port stands

Done and running. `npm run dist:mac` produces an ad-hoc signed
`Scriptorium.app` and a `Scriptorium-arm64.dmg`, and the app launches from
Finder, signs its own bundle, keeps a menu bar, and survives quit and relaunch.

Scriptorium was written on Linux and arrived with exactly two platform guards.
It now has these:

| File | Guard |
| --- | --- |
| `src/main/paths.js:11` | `APP_HOME` branches on `darwin` |
| `src/main/paths.js:33` | `configDir` branches on `darwin` (section 5.8) |
| `src/main/index.js:15` | `IS_MAC`, used by everything below |
| `src/main/index.js:71` | `titleBarStyle` and `trafficLightPosition` (5.2) |
| `src/main/index.js:124` | `applyZoom`, re-centres the traffic lights (5.9) |
| `src/main/index.js:316` | `buildMenu`, the application menu (5.1) |
| `src/main/index.js:417` | `window-all-closed` does not tear down on `darwin` (5.10) |
| `src/main/store.js` | `followOmarchy` defaults false on `darwin` (5.6) |
| `src/preload/index.js` | exposes `platform` to the renderer |
| `src/renderer/src/main.js` | sets `data-platform` and `--zoom` on `<html>` |
| `src/renderer/.../TopBar.svelte:19` | `⌘` rather than `Ctrl+` in tooltips |
| `src/renderer/.../Settings.svelte:8` | hides the System section (5.4) |
| `src/renderer/src/scriptorium.css:183` | the traffic-light gap and drag regions |

The app itself was portable in the ways that mattered: sync is HTTPS and a
WebSocket, the editor is ProseMirror in a Chromium renderer, and the settings
store is JSON on disk. There is no Linux-only native module and `npmRebuild` is
already off (see section 6.3).

---

## 2. Prerequisites on the Mac

- macOS on Apple Silicon or Intel. The build config targets `arm64`; change
  `arch` if you need Intel.
- Node 22 or newer. Built here on 22.22.2, on Linux on 22.23.2.
- Xcode Command Line Tools, for `codesign`:
  ```bash
  xcode-select --install
  ```
- No Apple Developer account, certificate, or notarization is required. See
  section 3 for why, and what you get instead.

Versions this repo is pinned to, which you should not change casually:

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
rather than needing to be applied by hand. It lives in `scripts/afterPack.cjs`,
copied from `LatteWrite/scripts/afterPack.cjs`, and is wired up in
`package.json` as `"afterPack": "scripts/afterPack.cjs"`.

A successful build says both of these, in this order, and the order is the whole
point — ours runs first and electron-builder then declines to do anything:

```
  • ad-hoc signing  Scriptorium.app
Scriptorium.app: replacing existing signature
  • skipped macOS code signing  reason=identity explicitly is set to null
```

What you get:

```
$ codesign -dv dist/mac-arm64/Scriptorium.app
Identifier=io.github.fromchaoscomesclarity.scriptorium
CodeDirectory v=20400 flags=0x2(adhoc)
Signature=adhoc
TeamIdentifier=not set

$ codesign --verify --deep --strict --verbose=2 dist/mac-arm64/Scriptorium.app
...: valid on disk
...: satisfies its Designated Requirement
```

**If a bundle was cross-built on Linux** it cannot be signed there, because
`codesign` is macOS-only. `./install-on-mac.sh [path/to/Scriptorium.app]` beside
the artifact does the two manual steps:

```bash
xattr -cr Scriptorium.app                        # clear the download quarantine
codesign --force --deep --sign - Scriptorium.app # ad-hoc signature
```

---

## 4. Build steps on the Mac

```bash
git clone https://github.com/FromChaosComesClarity/Scriptorium
cd Scriptorium
npm install

npm test            # the round-trip suite. No account or network needed.
npm run dev         # run it unpackaged first, before packaging anything
npm run dist:mac    # dmg;  dist:mac:zip for a zip
```

`npm test` is the gate that decides whether this build is safe to point at a real
account. It audits the schema, checks Markdown fidelity, and proves the round
trip reaches a fixed point. It is pure JS and platform independent. It passes
identically on macOS: 19 corpus cases, 2 of which normalise on first save.

Run `npm run dev` before packaging. Almost everything in section 5 shows up
there, and the packaging step is slow.

---

## 5. Code changes, file by file

### 5.1 `src/main/index.js` — the menu bar. Not optional. **Done.**

`Menu.setApplicationMenu(null)` removes a menu nobody wants on Linux. On macOS it
removes the **application menu**, and a `BrowserWindow` with no menu has no ⌘Q,
⌘C, ⌘V, ⌘X, ⌘A or ⌘Z, because those are menu accelerators rather than built-in
behaviours. The system also stops offering its own Dictation and Emoji items.

`buildMenu()` now builds a real menu on darwin and keeps `null` everywhere else:
`appMenu`, a File menu, then the `editMenu`, `viewMenu` and `windowMenu` roles.
The roles matter — the system injects Start Dictation and Emoji & Symbols into an
Edit menu it recognises, and only into one it recognises. Read back out of the
accessibility tree on the running app:

```
Edit: Undo, Redo, Cut, Copy, Paste, Paste and Match Style, Delete, Select All,
      Substitutions, Speech, AutoFill, Start Dictation, Emoji & Symbols
File: New Note (⌘N), Export Note… (⇧⌘E), Export All Notes… (⇧⌥⌘E), Close Window
```

**⌘F and ⌘S are deliberately not in the menu**, because `App.svelte` binds them
itself and nothing should be claimed twice. **⌘N went the other way**: the menu
owns it, and the renderer's keydown handler stands down on darwin, so one
keypress cannot create two notes. If you add a File item later, pick a side.

The export items come back to the renderer over a `menu:command` push rather
than being done in the main process, because an export has to flush a pending
autosave first and only the renderer knows there is one.

### 5.2 `src/main/index.js` — window chrome. **Done.**

`titleBarStyle: 'hiddenInset'` with `trafficLightPosition: { x: 15, y: 16 }`,
matching LatteWrite. The toolbar pads its left edge clear of the lights and makes
itself the window's drag region; the sign-in screen does the same with the ground
around its card. Every control inside a drag region has to set
`-webkit-app-region: no-drag` or its clicks are swallowed.

### 5.3 `src/main/index.js` — where the binary is. **Measured, left alone.**

`status.json` advertises a command that other things use to relaunch the app.
It is produced by `launchCommand()`:

```js
function launchCommand() {
  if (process.env.APPIMAGE) return process.env.APPIMAGE
  return app.isPackaged ? process.execPath : ''
}
```

The `app.isPackaged` check is load-bearing and was added after a real bug on the
Linux side: in an unpackaged dev run `process.execPath` is the raw Electron
binary, and advertising it made the Omarchy plugin's middle-click open Electron's
own welcome window. An unpackaged run now advertises no command at all, and every
consumer already treats an empty command as "not installed here". **That applies
to a macOS dev run too**, and it is why `npm run dev` writes an empty `command`.

What a packaged macOS launch actually writes, read out of `status.json` after
opening the `.app` from Finder:

```
/Applications/Scriptorium.app/Contents/MacOS/Scriptorium
```

So it is the **inner executable**, not the bundle — the case the Linux side
flagged. Launching it directly works but bypasses `LaunchServices`, so it can
behave differently over document handling, activation and the Dock. Left as is,
because nothing on macOS consumes this file: the Omarchy plugin is Linux-only.

If something ever does, derive the bundle path instead:

```js
if (app.isPackaged && process.platform === 'darwin') {
  // .../Scriptorium.app/Contents/MacOS/Scriptorium -> .../Scriptorium.app
  return process.execPath.replace(/\/Contents\/MacOS\/[^/]+$/, '')
}
```

and have consumers use `open -a <bundle> --args ...`.

### 5.4 `src/main/desktop.js` — Linux only. **Hidden on darwin.**

`install()` returns `{ error: 'Only available when running the packaged
AppImage.' }` when `process.env.APPIMAGE` is unset, which is always on macOS, so
it fails safely. But the Settings sheet used to show an **"Add to applications
menu"** button that could only ever produce that error. On macOS the `.app`
bundle *is* the menu entry, so the whole `system` section is now dropped from
`SECTIONS` on darwin and `inMenu()` is not called. The sheet shows Account,
Editing, Appearance, Backup.

### 5.5 `src/main/dictate.js` — Linux only. **Nothing to do.**

`findBinary()` looks for `LatteDictate*.AppImage`, finds none, and `available()`
is false, so the IPC handler answers honestly. LatteDictate was **not** ported:
the system's own dictation is in the Edit menu (see 5.1) and works in any text
field including a ProseMirror one.

Worth recording, because the handoff worried about it: **the renderer never had
a dictation control at all.** `grep -r dictate src/renderer` returns nothing. The
IPC surface exists and nothing calls it. No dead button to hide.

### 5.6 `src/main/omarchy.js` — Linux only, degrades correctly. **Verified.**

Reads `~/.local/state/omarchy/current/theme.name`. On macOS that path does not
exist, `available()` is false, and `currentStyle()` returns `null`.

- `followOmarchy` now defaults to `false` on `darwin` in `src/main/store.js`. On
  Linux it is unchanged.
- The theme picker was the open question. It opens on **Editorial**, the real
  category holding the current theme, with Ink checked, and the sidebar holds no
  **Desktop** category at all — `extraCategories` is empty when `omarchy()`
  returns null, and `ThemeChooser` picks the tab containing `current`.

### 5.7 `src/main/server.js` — no consumer on macOS. **Left on.**

The loopback API exists to serve the Omarchy plugin, which cannot run on macOS.
It binds `127.0.0.1` and writes `server.json` with mode `0600`. It costs a socket
on loopback, `--serve` keeps working, and it keeps one codebase instead of two.
Confirmed it starts, answers on its port, and removes its descriptor on quit.

If you would rather the Mac build open no sockets at all, gate the single call
site in `index.js` — but do **not** delete the module, because `--serve` and the
headless path are referenced in `handleArgs`.

### 5.8 `src/main/paths.js` — both paths now branch. **Done.**

`APP_HOME` was already correct: on `darwin` it is `~/Scriptorium`, because a
signed `.app` bundle is treated as read-only and writing beside it invalidates
the signature. Settings land in `~/Scriptorium/SCRIPTORIUM_DATA/config.json`.

`configDir` now branches too:

```js
export const configDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Scriptorium')
  : path.join(os.homedir(), '.config', 'scriptorium')
```

`~/.config` is a Linux convention and macOS has no reader for these files at all,
which left nothing arguing for it. One consequence to know about: that directory
is **also Electron's userData directory**, because `productName` names both. Our
`status.json`, `notes.json` and `server.json` sit beside Chromium's `Cache/` and
`Cookies` without either touching the other, and the path stays fixed and
guessable, which is the entire reason these files exist.

### 5.9 The interface scale versus the traffic lights. **Bug, found and fixed.**

Not in the original handoff. The interface scale is a `webContents` zoom factor,
so every CSS pixel in the toolbar shrinks with it — but the traffic lights are
drawn by the system at a fixed size and do not move. At 50% they hung *below* a
half-height toolbar and over the note list.

Both halves of the fix are needed:

- `scriptorium.css` divides the toolbar's macOS gap and its minimum height by
  `--zoom` (`calc(88px / var(--zoom))`, `calc(44px / var(--zoom))`), so both stay
  fixed in real pixels while everything else scales.
- `applyZoom()` in `index.js` re-centres the lights with
  `setWindowButtonPosition` once the bar grows past its natural height, which is
  what the floor above cannot cover.

`--zoom` is set from `src/renderer/src/main.js`, at module scope rather than in
`App.svelte`'s `onMount`: the main process pushes the first value on
`did-finish-load`, and `onMount` does not reach its listeners until several
awaits later, so the first push would be lost and the window would open at the
wrong scale.

Checked at 50%, 100% and 200%.

### 5.10 Closing the window killed sync. **Bug, found and fixed.**

Not in the original handoff, and macOS-only. `window-all-closed` used to stop
sync, the dictation child and the loopback server, and *then* not quit on darwin.
Nothing on the `activate` path starts sync again, so the dock icon handed you a
window that could never reach the account for the rest of the session.

Teardown now lives in a guarded `shutdown()` called from `before-quit`. On darwin
and for a `--serve` instance, `window-all-closed` only drops the window
reference; on Linux it calls `shutdown()` and quits as before. The guard is
because Linux runs it twice — `window-all-closed` calls it and then quits, and
quitting fires `before-quit`.

Confirmed by closing the window, seeing the process stay up and the loopback API
still answer on its port, and getting a working window back from the dock.

---

## 6. Packaging configuration

### 6.1 The mac target

```json
"mac": {
  "target": [{ "target": "dmg", "arch": ["arm64"] }],
  "category": "public.app-category.productivity",
  "icon": "resources/icon.png",
  "artifactName": "${productName}-${arch}.${ext}",
  "identity": null
}
```

`"identity": null` is deliberate. It stops electron-builder hunting for a real
signing identity and failing the build; the `afterPack` hook in section 3 does
the ad-hoc signature instead.

The scripts:

```json
"dist:mac": "electron-vite build && electron-builder --mac dmg --arm64",
"dist:mac:zip": "electron-vite build && electron-builder --mac zip --arm64"
```

### 6.2 The icon

`resources/` holds `icon.png` (1024x1024) and `icon.svg`. There is no `.icns`
checked in and there does not need to be: electron-builder converts the 1024px
PNG itself, and `Scriptorium.app/Contents/Resources/icon.icns` is there in the
built bundle. This is what LatteWrite already does. A second icon binary in the
tree would only be one more thing to regenerate when the mark changes.

If you ever do want to control the sizes by hand, `sips` + `iconutil` is the
flow, and `resources/icon.svg` is vector so it rescales cleanly.

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
dependencies are packaged despite not matching that glob. Confirmed on the `.app`:

```bash
npx asar list Scriptorium.app/Contents/Resources/app.asar \
  | grep -E "node_modules/(simperium|ws|electron-store|adm-zip)/package.json"
```

All four are present. If any were missing the app would launch and then fail the
moment it tried to sync, which looks like a login problem rather than a packaging
one.

---

## 7. Things that just work, and why

- **Sync.** `src/main/sync.js` speaks to `wss://api.simperium.com` through `ws`.
  Pure JS, no platform surface.
- **The CJS interop fix.** `sync.js` normalises `simperium`'s Babel-compiled
  default export by hand. Do not "tidy" that back into a plain default import:
  electron-vite externalises the dependency and the bare `require` binds the
  namespace object, not the factory. This shipped broken once and the symptom was
  a completely silent failure to sync.
- **Sign-in.** `src/main/auth.js` opens Simplenote's own login page in a
  `BrowserWindow` with its own session partition, then sweeps that window's
  storage for the token. Nothing here is Linux-specific. **UNVERIFIED on macOS.**
- **The Markdown round trip.** `src/shared/markdown.mjs` and `schema.mjs` are
  pure JS over ProseMirror. `npm test` passes on macOS.
- **Fonts.** 142 `@fontsource` packages are bundled at build time, so the 93
  themes render offline without a system font dependency. No Linux font stack is
  assumed; every theme names its families and ships them.

---

## 8. Test checklist for the Mac build

Run in this order. Each step failing tells you something different.

1. ✅ `npm test` passes. If not, stop: the problem is not macOS.
2. ✅ `npm run dev` opens a window.
3. ✅ **⌘Q, ⌘C, ⌘V, ⌘A, ⌘Z all work.** If not, section 5.1.
4. ✅ Sign in through the button. A Simplenote login window opens, reCAPTCHA
   behaves, and after signing in the sidebar fills with notes.
   *Confirmed **on macOS** 2026-09-11, which is what this item was always
   asking.* The stored `tokenSource` is `localStorage:stored_user.accessToken`,
   so the login window ran, reCAPTCHA Enterprise let it through, and the sweep
   found the token in a macOS Electron session — the whole of what was in doubt.
   The client then reached `connected` and 193 notes arrived in the sidebar,
   watched rather than inferred.
5. ⬜ Open a note, close it again without typing, and confirm on another device
   that its modified date did **not** change. This is the no-edit guarantee and
   it is the single most important behaviour in the app.
   **Still open.** Note that item 6 passing does not cover this: 6 proves a real
   edit propagates, 5 proves a non-edit does not. It is a test for the *absence*
   of a change, so it cannot be confirmed by noticing that things look right.
   The cheapest way to run it: note a file's position in the sidebar, which is
   ordered by modified date, open it, close it, and confirm it has not jumped to
   the top on another device.
6. ⬜ Edit a note, wait for autosave, confirm the change on another device.
   *Confirmed on **Linux** 2026-09-10: edits persist across devices and to the
   Simplenote web app. That is the end-to-end proof that the Markdown round trip
   survives real sync and not just the local test harness — so what is left here
   is running it from the Mac build, not whether the feature works at all.*
   `sync.js` is pure JS over `ws` with no platform surface, so this is the least
   likely of the four to differ. It still has not been run on a Mac.
7. ✅ Settings: the "Add to applications menu" section is hidden (5.4).
   ⬜ Interface scale applies immediately; spell check toggles. The scale was
   checked at 50/100/200% by restarting into each (5.9), not by clicking it live.
8. ✅ Theme picker opens on a real tab and shows no Desktop category.
9. ⬜ Export a note, and export all notes to a zip.
10. ✅ `npm run dist:mac`, then launch the packaged `.app` **from Finder**, not
    from the terminal. This is what catches the signing problem.
11. ✅ Quit and relaunch. Window size survives; settings persist to
    `~/Scriptorium/SCRIPTORIUM_DATA/config.json`.

Steps 4, 5, 6 and 9 all need a real Simplenote account and a second device, which
the port did not have. Step 4 has since been run **on macOS** and is closed.
Step 6 has been run **on Linux** only, which narrows it without closing it: a
tick in this list means run on a Mac, because that is the only thing this list is
for.

---

## 9. What is still unverified

Everything else in this document came from a command run on macOS. These did not.
They are in order of how likely they are to actually differ on a Mac.

Sign-in, which used to head this list as the one item with real macOS surface,
came off it on 2026-09-11. See section 8 item 4.

- **The no-edit guarantee, anywhere.** `npm test` proves it at the Markdown
  layer, on macOS. Nobody has yet watched a modified date on a second device, on
  either platform. Section 8 item 5 says why item 6 passing does not cover it,
  and how to run it cheaply.
- **Export**, note and zip, on either platform.
- **Autosave reaching another device, from the Mac build.** Confirmed on Linux
  2026-09-10. `sync.js` is pure JS over `ws`, so there is no platform surface
  here to go wrong — this is a formality rather than a risk. Notes now reach the
  Mac (193 of them, 2026-09-11); what is untested is an edit going the other way.
- **Spell check toggling live**, and the interface scale applied from the
  Settings sheet rather than by restarting into a stored value.

---

## 10. If you pick this up again

The port is done; what is left is the account-shaped half of section 8. Sign in
on a Mac with a second device to hand and work steps 4, 5, 6 and 9. Step 5 is the
one that matters: it is the promise the whole app is built around, and it is the
one no amount of local testing can stand in for.
