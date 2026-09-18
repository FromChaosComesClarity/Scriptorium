# Build the macOS artifact for 0.3.1

> **Delete this file when you are done.**
>
> It describes one release and stops being true the moment that release is
> complete. A stale handoff in a repository is worse than none, because the next
> person reads it as current. The last step of section 6 removes it.

A handoff written on the Linux side by someone who could not run a single line of
it on macOS. It is the mirror of `LINUX.md`, which came the other way.

One job: **build and upload the macOS DMG for v0.3.1.** Everything else about
the release is already done.

Anything marked **UNVERIFIED** could not be checked from Linux.

---

## 1. Where things stand

`main` is tagged `v0.3.1` and published. The release carries **one** asset,
`Scriptorium.AppImage`, built and verified on Omarchy 4 / Hyprland. Its notes say
in as many words that there is no macOS artifact yet and point Mac users at
`v0.2.1`. Those sentences are what you are here to delete.

`package.json` is at `0.3.1`.

Unlike `LINUX.md`, **this file is inside the tag**, so `git checkout v0.3.1`
keeps it in your working tree. That was deliberate; the reverse handoff was not,
and it vanished exactly when it was needed.

---

## 2. What is new since 0.2.1

**0.3.0, pin and unpin notes.** Both codebases already read Simplenote's
`pinned` systemTag and neither could set it. The sidebar now can.

- `src/main/sync.js` gains `setPinned(id, pinned)` and a `PINNED_TAG` constant.
- `src/main/index.js` gains the `notes:pin` IPC handler, `src/preload` exposes
  `notes.pin`.
- `src/renderer/src/components/Icon.svelte` gains a `pin` glyph.
- `NoteList.svelte` and `scriptorium.css` carry the control.

**0.3.1, one CSS fix.** `scriptorium.css` had `.note-pin.on :global(svg)`.
That file is a plain stylesheet imported by `main.js`, not a Svelte component
`<style>`, so `:global()` is not valid CSS there and the browser dropped the
whole rule: a pinned note's icon never rotated. Cosmetic only.

Your 0.2.1 reconnect crash fix is included. The rebase kept both changes: both
sides had inserted at the same anchor in `sync.js`, and `createSocket` is still
wired into `websocketClientProvider`.

---

## 3. Two design decisions you may want to argue with

**Pinning does not bump `modificationDate`.** Pinning is metadata, not content.
Bumping it would make a note you merely filed look freshly written on every
device, and in a date-ordered list it would jump to the top, which is the
opposite of what pinning means. The object version still advances, so it syncs
normally. Confirmed by reading a note's version history either side of a pin.

Note the consequence: a preserved modified date is now **Scriptorium's**
signature, not any one person's. It can no longer be used to work out who pinned
something.

**The note row is no longer a `<button>`.** A pin control inside it would have
been a button nested in a button, which is invalid markup and swallows the inner
click. The row is now a container holding the open-note button and the pin
button as siblings. That is the change most likely to need macOS eyes; see 4.2.

---

## 4. What to check on macOS before you upload

None of this was run on a Mac.

### 4.1 The build itself

`MACOS.md` section 3 still applies in full and has not changed. Apple Silicon
refuses to launch an unsigned bundle and kills it with an error that looks like a
crash in our own code. `scripts/afterPack.cjs` ad-hoc signs during packaging.

### 4.2 The restructured note row. **UNVERIFIED.**

The row went from one `<button>` to a container with two sibling buttons, which
changes focus and tab order.

- Tab through the sidebar. Each note should give you the row button and then its
  pin button, and both should show a visible focus ring.
- With VoiceOver on, the pin should read as a toggle: it carries
  `aria-pressed` and an `aria-label` that names the note.
- Clicking the pin must **not** also open the note. It uses `on:click|stopPropagation`
  for exactly that reason, and that is worth confirming rather than assuming.

### 4.3 The pin against the macOS window chrome. **UNVERIFIED.**

The darwin stylesheet makes `.topbar` a drag region. The sidebar is not one, so
the pin button should be unaffected, but the two had never met until now.

- Pinning must not start a window drag.
- At 150% and 200% interface scale the pin should stay inside its row and keep
  its distance from the timestamp.

### 4.4 The feature working at all. **Verified on Linux, not macOS.**

Pin a note, confirm on another device it is pinned and its modified date is
unchanged. Unpin, confirm both again.

### 4.5 The usual artifact sanity

`MACOS.md` section 6.4: confirm `simperium`, `ws`, `electron-store` and
`adm-zip` are all inside `app.asar`. A missing one fails at sync time and looks
like a login problem rather than a packaging one.

---

## 5. What was verified on Linux, so you do not redo it

- `npm test` passes on the merged result: 19 corpus cases, 2 normalise.
- Pin, unpin and trash against a real account, with the body intact throughout
  and the modified date unchanged across a pin and its reversal.
- The AppImage builds, deploys and runs, and Jose confirmed pinning works
  through the UI.

Still unverified **everywhere**: the **no-edit guarantee** (open a note, close it
untouched, confirm on another device that its modified date did not move) and
**export**. `MACOS.md` section 8 tracks these as items 5 and 9. The pin work did
not touch either path, but neither has ever been run.

---

## 6. Do this

```bash
cd ~/…/Scriptorium
git fetch --all --tags
git checkout v0.3.1          # the tag, not main, so the artifact matches the release

npm ci
npm test                     # the gate. If this fails, the problem is not macOS
npm run dist:mac
```

Work section 4. Then, only if it is clean:

```bash
gh release upload v0.3.1 dist/Scriptorium-arm64.dmg
gh release view v0.3.1 --json assets --jq '.assets[].name'   # expect both files
```

Edit the notes to drop the "No macOS artifact in this release yet" paragraph,
since it will no longer be true:

```bash
gh release view v0.3.1 --json body --jq .body > /tmp/notes.md
# edit it, then
gh release edit v0.3.1 --notes-file /tmp/notes.md
```

Finally, on `main`, delete this file:

```bash
git checkout main && git pull
git rm HANDOFF-MAC-0.3.1.md
git commit -m "Remove the 0.3.1 Mac handoff, its job is done"
git push
```

---

## 7. If something in section 4 is broken

Do not upload. Fix it on `main` and cut a **v0.3.2** with both artifacts, rather
than retagging 0.3.1. Amending a tag means the DMG and the AppImage stop coming
from the same commit unless both are rebuilt, and that is more work than it
looks. `LINUX.md` reached the same conclusion from the other direction.
