# Building the Linux release of Scriptorium 0.2.1

A handoff written on the Mac by someone who could not run a single line of it on
Linux. It is the mirror of `MACOS.md`, which came the other way.

There is one job: **build the AppImage for the existing v0.2.1 release and upload
it.** The release is already published and is missing its Linux artifact, because
an AppImage cannot be built on macOS.

⚠️ **v0.2.1, not v0.2.0.** v0.2.0's AppImage was built and uploaded on
2026-09-10 and is now known-bad: it carries a crash that kills the app on an
aborted reconnect, which closing the laptop lid is enough to trigger. Its release
notes are marked accordingly. Do not rebuild it; build 0.2.1 and leave 0.2.0 as
the record of what went out.

Everything below marked **UNVERIFIED** could not be checked from macOS. That is
most of section 3, and section 3 is the part that matters.

---

## 1. Where things stand

`main` is at the merge commit `aef8dcb`, tagged `v0.2.1` and published:

```
https://github.com/FromChaosComesClarity/Scriptorium/releases/tag/v0.2.1
```

The release currently carries **one** asset, `Scriptorium-arm64.dmg`
(`sha256 fae1af84…`, built and signed on macOS 26.6.2). Its notes end with a
"Known limits" section saying, in as many words, that there is no Linux artifact
in this release and pointing Linux users at v0.1.2. That bullet is what you are
here to delete.

`package.json` is at `0.2.1`. It had drifted at `0.1.0` while the tags ran ahead
to `v0.1.2`; the release commit brought it in line.

---

## 2. Build and upload

This file *is* in the `v0.2.1` tag, so checking the tag out keeps it in front of
you. (It was not in `v0.2.0`, which is why the last round of this said otherwise.)

```bash
cd ~/…/Scriptorium
git fetch --all --tags
git checkout v0.2.1          # the tag, not main — the artifact must match the release

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
gh release upload v0.2.1 dist/Scriptorium.AppImage
gh release view v0.2.1 --json assets --jq '.assets[].name'   # expect both files
```

Finally edit the release notes to drop the "No Linux artifact in this release"
bullet, since it will no longer be true:

```bash
gh release edit v0.2.1 --notes-file <edited notes>
```

`gh release view v0.2.1 --json body --jq .body > /tmp/notes.md` gets you the
current text to edit.

---

## 3. What to check before you upload. Read this part.

**Most of what used to be here is done.** You verified the whole macOS port on
Linux for 0.2.0 on 2026-09-10 — window-all-closed, `--serve`, the Omarchy widget,
every branch the port added, the interface scale. None of that changed in 0.2.1,
so sections 3.2 to 3.4 are now a re-read rather than a test, kept because a
regression there is the expensive kind.

What is actually new in 0.2.1 is **two changes to `src/main/sync.js`**, and both
are shared code that affects Linux exactly as much as macOS. Check 3.0 and 3.1.

### 3.0 The two sync fixes. **NEW in 0.2.1, UNVERIFIED on Linux.**

Neither could be tested properly from macOS against your account, so both were
verified in the narrow way described in section 5. On Linux you can watch them.

**The status must leave "Downloading notes".** `sync.js` now listens for the
bucket's `index` event — not `indexed`, the library's name for "finished" really
is `index` — and returns the status to `connected`. Start the app signed in and
watch the sidebar footer: it should read "Downloading notes" briefly and then
**"Synced"**. On macOS with 193 notes that took under ten seconds; before the
fix it sat there indefinitely. `~/.config/scriptorium/status.json` shows the same
thing, and the Omarchy bar widget reads that file, so this is the one most
visible to you day to day.

**The reconnect crash must not happen.** This is the bug the release is named
for. To provoke it: sign in, let it reach Synced, then take the network away
(`nmcli networking off`, or pull the cable) and leave it for a minute or two
while the reconnection timer runs. Before the fix the app died with
`Error: WebSocket was closed before the connection was established`. After it,
the status should simply fall to "Not connected", and bringing the network back
should return it to Synced without a restart.

### 3.1 Closing the window must still quit the app. **Verified on Linux for 0.2.0; unchanged in 0.2.1.**

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

### 3.2 `--serve` and the Omarchy plugin. **Verified for 0.2.0; unchanged.**

A `--serve` instance still returns early from `window-all-closed`, as before, so
it should outlive its window exactly as it used to. But the teardown it eventually
does now comes from `before-quit` rather than from the window closing.

- Start with `--serve`, confirm the bar widget shows note count and sync state.
- Open a window from the launcher overlay, close the window, confirm the overlay
  can still read and write notes.
- Middle-click the widget. This is what commit `9107474` fixed; it should open
  Scriptorium, not Electron's welcome window.
- `scriptorium --new` and `--note <id>` against a running instance.

### 3.3 The things the port deliberately branched. **Verified for 0.2.0; unchanged.**

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

### 3.4 The interface scale. **Verified for 0.2.0; unchanged.**

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

- **A `v0.2.2`** with both artifacts, if the bug is real and shipped. Leave
  v0.2.1's DMG where it is, mark its notes the way v0.2.0's are marked, and say
  in the new notes what was wrong.
- **Amending `v0.2.1`** only if the bug is Linux-only and the macOS DMG is
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

Confirmed on Linux 2026-09-10, against a real account: **sign-in**, and **edits
persisting across devices and to the Simplenote web app**. That is `MACOS.md`
checklist items 4 and 6, and it is the end-to-end proof that the Markdown round
trip survives real sync rather than only the local harness.

Confirmed **on macOS** 2026-09-11: **sign-in**, properly this time. The stored
`tokenSource` is `localStorage:stored_user.accessToken`, so the login window,
reCAPTCHA Enterprise and the token sweep all worked in a macOS Electron session,
and 193 notes then arrived. That closes `MACOS.md` item 4 on macOS evidence
rather than Linux evidence, which is what it was always asking for.

The 0.2.1 fixes were verified only as narrowly as macOS allowed:

- **The stuck status** was watched end to end on a real account — `indexing` for
  75+ seconds before, `connected` in under ten after, footer reading "Synced".
  That one is genuinely confirmed, just not on Linux.
- **The reconnect crash** was reproduced and fixed at the seam, not in the wild:
  a `close()` during a handshake to 192.0.2.1 (TEST-NET-1, unroutable), driven
  through the real exported `createSocket` the way simperium drives it. Before,
  the reported crash verbatim; after, the error is handled and `close` fires.
  **Nobody has yet watched a real machine sleep, wake and recover.** That is
  section 3.0, and it is the single most valuable thing you can do with this
  release.

Still unverified **everywhere**, macOS and Linux alike: the **no-edit guarantee**
(item 5) and **export** (item 9). Item 6 passing does not cover item 5, because
that one tests for the *absence* of a change: opening a note and closing it must
leave its modified date alone on every other device.

---

## 6. Suggested order

1. `npm test`, then `npm run dist:linux`. If the build fails, nothing else
   matters.
2. Section 3.0, the two new fixes. The sleep-and-wake test is the one nobody has
   run anywhere.
3. Skim 3.1 to 3.4. They passed for 0.2.0 and nothing in them changed, so this is
   a regression check, not a fresh one.
4. Upload, then edit the notes to drop the "no Linux artifact yet" bullet.
