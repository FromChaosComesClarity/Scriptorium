# Building the Linux release of Scriptorium 0.2.0

A handoff written on the Mac by someone who could not run a single line of it on
Linux. It is the mirror of `MACOS.md`, which came the other way.

There is one job: **build the AppImage for the existing v0.2.0 release and upload
it.** The release is already published and is missing its Linux artifact, because
an AppImage cannot be built on macOS.

Everything below marked **UNVERIFIED** could not be checked from macOS. That is
most of section 3, and section 3 is the part that matters.

---

## 1. Where things stand

`main` is at the merge commit `e7a532e`, tagged `v0.2.0` and published:

```
https://github.com/FromChaosComesClarity/Scriptorium/releases/tag/v0.2.0
```

The release currently carries **one** asset, `Scriptorium-arm64.dmg`
(`sha256 6bbd7271…`, built and signed on macOS 26.6.2). Its notes end with a
"Known limits" section saying, in as many words, that there is no Linux artifact
in this release and pointing Linux users at v0.1.2. That bullet is what you are
here to delete.

`package.json` is at `0.2.0`. It had drifted at `0.1.0` while the tags ran ahead
to `v0.1.2`; the release commit brought it in line.

---

## 2. Build and upload

```bash
cd ~/…/Scriptorium
git fetch --all --tags
git checkout v0.2.0          # the tag, not main — the artifact must match the release

npm ci                       # or npm install
npm test                     # the gate. 19 corpus cases, 2 normalise on first save
npm run dist:linux
```

`artifactName` is `${productName}.${ext}`, so the file lands at
`dist/Scriptorium.AppImage`. Note `postdist:linux` also runs `npm run deploy`,
which copies it into `~/Apps/Scriptorium/` — that is the existing behaviour and
is unchanged, but it means a running copy keeps the old build until you quit it.

Then, after section 3 says it is safe:

```bash
gh release upload v0.2.0 dist/Scriptorium.AppImage
gh release view v0.2.0 --json assets --jq '.assets[].name'   # expect both files
```

Finally edit the release notes to drop the "No Linux artifact in this release"
bullet, since it will no longer be true:

```bash
gh release edit v0.2.0 --notes-file <edited notes>
```

`gh release view v0.2.0 --json body --jq .body > /tmp/notes.md` gets you the
current text to edit.

---

## 3. What to check before you upload. Read this part.

0.2.0 is the macOS port, and the port touched shared code. **None of the
following was run on Linux.** If any of it is broken, uploading the AppImage
ships that breakage to the only platform that currently has users.

### 3.1 Closing the window must still quit the app. **UNVERIFIED — check first.**

This is the highest-risk change in the release. `window-all-closed` used to do
its teardown inline. It now calls a guarded `shutdown()`:

```js
app.on('window-all-closed', () => {
  if (serving || IS_MAC) { win = null; return }
  shutdown()
  app.quit()
})
```

`shutdown()` is also registered on `before-quit`, and Linux therefore runs it
twice — `window-all-closed` calls it and then quits, and quitting fires
`before-quit`. The `tornDown` flag is what makes the second run a no-op. If that
flag were wrong you would get a double `sync.stop()` / `server.stop()`.

Check, in this order:

1. Open the app, close the window. **The process must exit.** If it lingers, the
   `IS_MAC` branch is being taken on Linux and something is badly wrong.
2. `cat ~/.config/scriptorium/status.json` — `status` must be `closed` and
   `command` must be the AppImage path, not empty and not the Electron binary.
3. No stale `~/.config/scriptorium/server.json`; `shutdown()` stops the server,
   which removes its descriptor.
4. Quit with the window still open (Ctrl+Q or the WM close). Same three results.

### 3.2 `--serve` and the Omarchy plugin. **UNVERIFIED.**

A `--serve` instance still returns early from `window-all-closed`, as before, so
it should outlive its window exactly as it used to. But the teardown it eventually
does now comes from `before-quit` rather than from the window closing.

- Start with `--serve`, confirm the bar widget shows note count and sync state.
- Open a window from the launcher overlay, close the window, confirm the overlay
  can still read and write notes.
- Middle-click the widget. This is what commit `9107474` fixed; it should open
  Scriptorium, not Electron's welcome window.
- `scriptorium --new` and `--note <id>` against a running instance.

### 3.3 The things the port deliberately branched. **UNVERIFIED on Linux.**

Each of these has a `darwin` arm that was tested on the Mac and a Linux arm that
was not. Confirm the Linux arm is still the old behaviour:

| What | Expected on Linux |
| --- | --- |
| `buildMenu()` | still calls `Menu.setApplicationMenu(null)`; no menu bar appears |
| `paths.js` `configDir` | still `~/.config/scriptorium`, nothing under `~/Library` |
| `store.js` `followOmarchy` | still defaults **true** |
| Theme picker | the **Desktop** category is present and tracks `omarchy theme set` |
| Settings sheet | the **System** section is present, with "Add to applications menu" |
| Toolbar tooltips | read `Ctrl+B`, `Ctrl+I`, `Ctrl+F` — not `⌘` |
| Toolbar left edge | no traffic-light gap, no drag region |
| `Ctrl+N` | still creates a note from the renderer's keydown handler |

That last one is worth being explicit about: on macOS the File menu owns ⌘N and
the renderer stands down, guarded by `isMac` in `App.svelte`. On Linux there is
no menu, so the renderer must still be handling it. If Ctrl+N does nothing, that
guard is inverted.

### 3.4 The interface scale. **UNVERIFIED on Linux.**

`ui:scale` no longer calls `setZoomFactor` directly; it goes through
`applyZoom()`, which also pushes a `ui:zoom` event to the renderer and then
returns early on anything that is not darwin. The renderer writes that value into
a `--zoom` CSS variable which **only the macOS toolbar rules consume**, so on
Linux it should be inert.

Check Settings → Appearance: 50 / 75 / 100 / 125 / 150 / 200 all apply
immediately and survive a restart. If nothing happens, `applyZoom` is returning
before `setZoomFactor` — but read it, the `IS_MAC` guard is deliberately *after*
the zoom call for exactly this reason.

### 3.5 Sanity on the artifact itself

```bash
ls -la dist/Scriptorium.AppImage
./dist/Scriptorium.AppImage --version   # or just run it
```

And confirm the runtime dependencies are inside, the same check `MACOS.md` §6.4
does for the `.app` — `simperium`, `ws`, `electron-store` and `adm-zip` are
collected separately from the `out/**/*` glob, and a missing one fails at sync
time looking like a login problem.

---

## 4. If something in section 3 is broken

Do not upload. Fix it on `main`, and decide between:

- **A `v0.2.1`** with both artifacts, if the bug is real and shipped. Leave
  v0.2.0's DMG where it is and say in the new notes what was wrong with it.
- **Amending `v0.2.0`** only if the bug is Linux-only and the macOS DMG is
  unaffected — retag and re-release, and the DMG will need rebuilding on a Mac
  from the new tag so the two artifacts come from the same commit.

The second is more work than it looks. Prefer the first.

---

## 5. What was verified, so you do not redo it

All on macOS 26.6.2, Apple Silicon, Node 22.22.2, Electron 34.5.8:

- `npm test` passes — but it is pure JS, so it proves the same thing on Linux and
  is worth running anyway as a five-second gate.
- The `.app` builds, ad-hoc signs itself in `afterPack`, verifies as
  `adhoc` / `valid on disk` / `satisfies its Designated Requirement`, and launches
  from Finder.
- The application menu, including the system's own Start Dictation and Emoji &
  Symbols in Edit.
- Theme picker opens on a real category with no Desktop tab; Settings has no
  System section.
- Window bounds survive quit and relaunch.
- All four runtime deps are inside `app.asar`.

Still unverified **everywhere**, macOS and Linux alike, because it needs a real
Simplenote account and a second device: sign-in, the no-edit guarantee end to
end, autosave reaching another device, and export. `MACOS.md` section 8 tracks
these as checklist items 4, 5, 6 and 9.

---

## 6. Suggested order

1. `npm test`, then `npm run dist:linux`. If the build fails, nothing else
   matters.
2. Section 3.1. If closing the window does not quit, stop and fix that.
3. Sections 3.2 to 3.4.
4. Upload, then edit the notes.
