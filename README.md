# Scriptorium

A visual Markdown editor for **Simplenote**. Your notes, edited the way you'd
edit a document, with a toolbar, real headings, checklists and tables, syncing to
the same account your phone reads.

Forked from [LatteWrite](https://github.com/FromChaosComesClarity/LatteWrite),
which supplied the Electron + Svelte + Tiptap shell and all 93 themes.

## The rule the whole app is built around

A Simplenote note **is** a Markdown string. Anything the editor can express that
Markdown cannot is not a feature. It is a way to destroy the note on the next
save, on every device at once.

So Scriptorium's schema is deliberately smaller than LatteWrite's. Text colour,
highlight, the glow/neon effects, per-selection fonts and text alignment are
**gone**, not hidden: `npm test` fails the build if any of them reappear in the
schema. The toolbar can only offer what Markdown can hold.

What it does hold: headings, bold, italic, strikethrough, inline code, links,
blockquotes, bullet and numbered lists, checklists, code blocks with a language,
tables with column alignment, and horizontal rules.

**Images** are a deliberate half-exception. Nothing in the UI inserts one, since
Simplenote stores text and there is nowhere for a picture to live. But a note may
already contain `![alt](url)`, and eating that on open would be exactly the
damage this design prevents, so image syntax is parsed and written back intact.

## Opening a note is not editing it

Parsing and re-serialising Markdown normalises it: `*` bullets become `-`,
`_em_` becomes `*em*`. Writing that back would mark a note as edited on every one
of your devices for a note you only read, and would fight any other client that
normalises differently.

So Scriptorium compares against the Markdown the note **had when it was opened**,
and saves only when the meaning actually changed. `npm test` asserts this on
notes deliberately written in non-normal form.

## Sync

Simplenote runs on Simperium. Two of its hosts are up and one is not:

| Host | State |
| --- | --- |
| `api.simperium.com` | Alive. Serves the WebSocket everything here uses. |
| `auth.simperium.com` | **Dead**, no TCP listener on 443 or 80. |

The dead one is the host every third-party client used to log in through, and the
one `node-simperium`'s own `auth.js` still points at. So Scriptorium never calls
it. Instead it opens **Simplenote's own login page in its own window**, a real
browser, which is what the page's reCAPTCHA Enterprise requires. It then reads
the access token out of that window's session. Your password goes from
your keyboard to Simplenote and is never seen by this app.

If that ever stops working, Settings takes a pasted token.

## Testing

```bash
npm test          # schema audit, round-trip fidelity, idempotence, no-edit guarantee
npm run dev       # run it
npm run dist:linux
npm run dist:mac  # dmg, arm64;  dist:mac:zip for a zip
```

`npm test` needs no account and no network. It is the gate that decides whether
this is safe to point at real notes.

## macOS

Built and running on Apple Silicon. Download `Scriptorium-arm64.dmg` from
[Releases](https://github.com/FromChaosComesClarity/Scriptorium/releases), open
it, and drag Scriptorium to Applications.

**Then run this once, or it will not start:**

```bash
xattr -cr /Applications/Scriptorium.app
codesign --force --deep --sign - /Applications/Scriptorium.app
```

Open it from Finder afterwards, not from a terminal.

Both lines are needed and neither is optional. The first clears the quarantine
macOS attaches to anything downloaded. The second is an ad-hoc signature: there
is no Apple Developer certificate behind this app, and **Apple Silicon refuses
to launch an unsigned bundle**, killing it with an error that reads like a crash
inside the app rather than a security refusal. `codesign` only exists on macOS,
so a release built anywhere else cannot have done it for you.

`./install-on-mac.sh [path/to/Scriptorium.app]` in this repo runs both lines and
verifies the result, if you would rather not type them.

If you build it yourself on a Mac, `npm run dist:mac` signs the bundle during
packaging (`scripts/afterPack.cjs`) and you need neither line.

[MACOS.md](MACOS.md) is the full record: what is Linux-specific and what was
done with each piece, the signing trap, the packaging config, and a test
checklist marking what has been run on a Mac and what still has not.

## Omarchy

The companion plugin lives in
[omarchy-scriptorium](https://github.com/FromChaosComesClarity/omarchy-scriptorium):
note count and sync state in the bar, and a fuzzy note search overlay.

Scriptorium follows the desktop theme automatically, reading the active Omarchy
palette and mapping it onto a theme object. Picking a theme by hand turns that off.

## Licence

GPL-3.0-or-later, inherited from LatteWrite.
