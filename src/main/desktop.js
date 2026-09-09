// Adding Scriptorium to the system menu.
//
// The same shape OAKANIZER uses: a .desktop file in the user's own applications
// directory, pointing at the AppImage that is actually running, with the icon
// copied out of the bundle so the entry keeps its picture even if the AppImage
// is later moved or replaced.
//
// Only meaningful for a packaged AppImage. Run from a dev checkout there is no
// stable binary for an Exec line to point at, so this says so rather than
// writing an entry that would not work.

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const entryPath = () =>
  path.join(app.getPath('home'), '.local', 'share', 'applications', 'scriptorium.desktop')

export function install() {
  const appimage = process.env.APPIMAGE
  if (!appimage) {
    return { error: 'Only available when running the packaged AppImage.' }
  }

  const home = app.getPath('home')
  const iconSrc = path.join(process.resourcesPath, 'icon.png')
  const iconDest = path.join(home, '.local', 'share', 'icons', 'scriptorium.png')
  const file = entryPath()

  try {
    fs.mkdirSync(path.dirname(iconDest), { recursive: true })
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, iconDest)

    const entry = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Scriptorium',
      'Comment=A visual Markdown editor for Simplenote',
      'Exec=' + appimage,
      'Icon=' + iconDest,
      'Categories=Office;TextEditor;',
      'Terminal=false',
      // ⚠️ Lowercase, because that is what the window actually reports.
      // hyprctl clients shows class "scriptorium"; a capitalised value here
      // silently fails to associate the window with this entry, so docks and
      // task switchers show a generic icon instead of ours.
      'StartupWMClass=scriptorium'
    ].join('\n') + '\n'

    fs.writeFileSync(file, entry, 'utf8')
    return { ok: true, file }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
}

export function remove() {
  try {
    fs.rmSync(entryPath(), { force: true })
    return { ok: true }
  } catch (e) {
    return { error: String((e && e.message) || e) }
  }
}

export const installed = () => fs.existsSync(entryPath())
