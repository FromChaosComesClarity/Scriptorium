// Getting notes back out as files.
//
// Simplenote is the only copy of these notes, and "the only copy" is a bad
// place for anything to live. Export is the escape hatch: plain .md files that
// open anywhere, with no part of this app required to read them.
//
// Filenames come from the note's first line, which is what every Simplenote
// client already treats as the title.

import fs from 'fs'
import AdmZip from 'adm-zip'
import { titleOf } from './sync.js'

// A filename that survives Linux, macOS and Windows, and that a human still
// recognises as their note. Control characters and the Windows-reserved set go,
// as does a trailing dot or space, which Windows silently strips and then
// cannot open.
function safeName(title, fallback) {
  const cleaned = String(title || '')
    .replace(/[\x00-\x1f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return (cleaned || fallback).slice(0, 80)
}

/** One note to one .md file. */
export function writeNote(filePath, content) {
  fs.writeFileSync(filePath, String(content ?? ''), 'utf8')
  return filePath
}

export const suggestedName = (content) => safeName(titleOf(content), 'note') + '.md'

/**
 * Every live note into one zip of .md files.
 *
 * Two notes can share a title, and on Simplenote they very often do, so names
 * that collide get a numeric suffix rather than silently overwriting each other
 * inside the archive. An export that quietly loses notes would be worse than no
 * export at all, given this is the backup.
 */
export function writeAllZip(filePath, notes) {
  const zip = new AdmZip()
  const used = new Map()

  for (const note of notes) {
    const base = safeName(titleOf(note.content), 'note')
    const key = base.toLowerCase()
    const seen = used.get(key) || 0
    used.set(key, seen + 1)
    const name = seen === 0 ? base + '.md' : base + ' (' + (seen + 1) + ').md'
    zip.addFile(name, Buffer.from(String(note.content ?? ''), 'utf8'))
  }

  zip.writeZip(filePath)
  return { filePath, count: notes.length }
}

export { safeName }
