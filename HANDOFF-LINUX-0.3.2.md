# Build the Linux AppImage for 0.3.2

> **Delete this file when you are done.**
>
> It describes one release and stops being true once that release is complete.
> A stale handoff is worse than none: the 0.3.1 Mac handoff did its job but was
> never removed, and this branch deletes it. Do not repeat that. The last step
> of section 6 removes this one.

Written on the Mac (Mac-M2Air) by someone who could not run any of it on
Linux. It mirrors `HANDOFF-MAC-0.3.1.md`, which came the other way.

One job: **build, check and install the AppImage for 0.3.2 on Omarchy.** Cut
the release only if Jose says so (section 6.3).

Anything marked **UNVERIFIED** could not be checked from macOS.

---

## 1. Where things stand

- The work is on the branch **`table-controls`**, with an open PR into `main`
  (see the PR linked from the branch on GitHub). It is **not merged** and
  **not tagged**, and there is no v0.3.2 release yet.
- `package.json` is at `0.3.2`.
- The branch starts from `f5ee7d5`, which is the current `main`, so it
  fast-forwards cleanly.
- The Mac app was built from this branch and installed at
  `/Applications/Scriptorium.app` on the Mac. It is **not** uploaded anywhere.

---

## 2. What is new since 0.3.1

### 2.1 A data-loss bug, present in every release from v0.1.0 to v0.3.1

**Editing any note that contains a table saved that table with every cell
empty**, and Simperium synced the blanks to every device.

The cause was in `renderCell` in `src/shared/markdown.mjs`. It rebuilt each cell
with `schema.topNodeType.createAndFill(null, cell.content)`, where `schema` is
the module's own Schema. The editor builds a *separate* Schema instance from the
same extensions, and ProseMirror compares node types by identity, not by name.
So for every document coming from the app, the fill returned null and the cell
became `''`.

`npm test` never caught it, because it only ever serialised documents built from
the module's schema. The cell is now serialised as itself, with no schema
involved. The round-trip test now saves every corpus case through a schema built
the way `Editor.svelte` builds one. Against `main`'s serialiser it fails on
every table case.

**Until 0.3.2 is installed on Linux, do not edit table notes with the 0.3.1
AppImage.**

### 2.2 The table menu, ported from LatteWrite

The table button used to insert a fixed 3×3 table. It now opens LatteWrite's
menu:

- an 8×8 grid to pick the size;
- add row above or below, add column left or right;
- delete row, column or table.

Entries grey out when they cannot apply: no table under the caret, or the last
row or column of a table. LatteWrite's "Toggle borders" was left behind because
Markdown cannot store it.

Files: `TopBar.svelte` and the `.tablemenu` / `.menu-scrim` rules in
`scriptorium.css`. The transparent click-away layer is `.menu-scrim`, not
`.scrim`, because `.scrim` is the Settings sheet's dimmed backdrop and sharing
the name broke its z-index.

### 2.3 Tables follow GFM's rules on screen, not just on disk

`gfmGrid` in `src/shared/schema.mjs` is one view of a table, shared by the
serialiser and by an `appendTransaction` normaliser on the Table extension. It
enforces three rules:

- row 0 is always the header;
- each column has one alignment (the first one set in that column, top down);
- merged cells are split.

Before this, three things saved differently from how they looked:

- deleting the header showed a body row that came back as the header after
  reloading;
- adding a row above the header silently dropped every column alignment;
- pasted merged cells saved their text into the wrong columns.

A freshly opened note is never touched by the normaliser, and a test asserts
this. So the no-edit guarantee is unchanged.

---

## 3. A design decision you may want to argue with

**Alignment follows the column, not the cell.** Scriptorium has no control that
sets alignment, so every alignment comes from the note's own Markdown. Taking
the first one set in each column keeps it when the header row is replaced. The
cost: a table pasted with mixed alignments inside one column is evened out to
the first one. GFM cannot represent mixed alignment anyway, so the same thing
would have happened on save.

---

## 4. What was verified on the Mac, so you do not redo it

- **Tests:** `npm test` passes. That is 19 corpus cases plus 12 table-editing
  checks: every row and column command, merged cells, the last-row and
  last-column refusal, and a table note opening untouched. Each new check was
  shown to fail when its fix is removed.
- **Builds:** `npm run build` and `npm run dist:mac` build with no Svelte or
  a11y warnings.
- **The real built renderer:** it was driven in a hidden Electron window with a
  stub preload, using a fake note and **no real account**. The menu greys out
  correctly. Adding a row above the header kept left, centre and right
  alignment. Adding a column, then deleting the header, produced this saved
  Markdown, with all text intact:

  ```
  | Left | Middle |  | Right |
  | :--- | :---: | --- | ---: |
  | a | b |  | c |
  | d | e |  | f |
  ```

  A 4×2 table inserted from the grid saved as valid GFM.

---

## 5. What to check on Linux

### 5.1 The fix against a REAL account. **UNVERIFIED everywhere. Do this first.**

This is the one that matters, and it has never touched Simperium.

1. Create a throwaway note on the phone containing a table with an aligned
   column, for example `| a | b |` / `| :--- | ---: |` / `| 1 | 2 |`.
2. Open it in the 0.3.2 AppImage and edit a word **outside** the table.
3. Confirm on the phone that every cell still has its text and the alignment
   row is unchanged.
4. Then add a column and delete a row from the menu, and confirm both arrive on
   the phone as a valid table.

If any cell comes back empty, **stop**. Do not release.

### 5.2 The menu under Hyprland. **UNVERIFIED.**

- The menu opens below the table button and is not clipped by the window edge
  at a narrow width. The toolbar wraps.
- Clicking outside the menu closes it, and Escape closes it.
- It sits above the editor and below the Settings sheet. Open Settings with the
  menu shut and check its dimmed backdrop still covers the window.
- At 150% and 200% interface scale the grid cells stay square and clickable.

### 5.3 Paste. **UNVERIFIED.**

Paste a table with merged cells from a browser, such as a Wikipedia table with
`colspan`. It should appear unmerged, with each value in its own column, and
reload exactly the same.

---

## 6. Do this

### 6.1 Build and install

```bash
cd ~/…/Scriptorium
git fetch --all
git checkout table-controls
git pull

npm ci
npm test                 # the gate: expect "All checks passed", 19 cases + TABLE EDITING
npm run dist:linux       # postdist:linux deploys to ~/Apps/Scriptorium/Scriptorium.AppImage
```

Quit any running Scriptorium first. A running copy keeps the old build.

### 6.2 Work through section 5

If section 5.1 fails, stop and report on the PR. Everything else in section 5
can be fixed on the branch.

### 6.3 Release (only if Jose says to)

Merge with a fast-forward so the tag lands on the exact commit the Mac app was
built from:

```bash
git checkout main && git pull
git merge --ff-only table-controls
git push
git tag v0.3.2 && git push origin v0.3.2

gh release create v0.3.2 dist/Scriptorium.AppImage \
  --title "Scriptorium 0.3.2 — tables keep their text, and a table menu" \
  --notes-file /tmp/notes.md
```

The notes should lead with the data-loss fix, not the feature: anyone on 0.3.1
or earlier who edits a table note loses its contents. Say there is no macOS
artifact yet. Then hand the DMG back to the Mac, the way 0.3.1 went, either as
a `HANDOFF-MAC-0.3.2.md` on `main` or a GitHub issue titled
"Handoff to the Mac: 0.3.2 DMG".

### 6.4 Remove this file

```bash
git checkout main && git pull
git rm HANDOFF-LINUX-0.3.2.md
git commit -m "Remove the 0.3.2 Linux handoff, its job is done"
git push
```

If there is no release yet, delete the file on `table-controls` instead, so it
never reaches `main`.
