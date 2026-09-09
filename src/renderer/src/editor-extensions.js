// Editor extensions, trimmed to what a Markdown note can hold.
//
// LatteWrite's version of this file also carried resizable images, borderless
// tables and the textFx glow marks. None of those survive serialisation to
// Markdown, so they are gone. See src/shared/schema.mjs for why that is a
// deletion rather than a hidden feature.
//
// What is left is Find, which is pure editor behaviour: it decorates matches
// without touching the document, so it cannot affect what gets saved.

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ── Find in document (Ctrl+F) ────────────────────────────────────────────────
// Highlights every occurrence of the query and tracks which one is current.
// Deliberately never touches the selection: the search field keeps the keyboard
// focus while you step through hits, so typing keeps refining the search.
export const findKey = new PluginKey('lwFind')

const emptyFind = { query: '', caseSensitive: false, matches: [], index: 0, decos: DecorationSet.empty }

function findMatches(doc, query, caseSensitive) {
  const needle = caseSensitive ? query : query.toLowerCase()
  const out = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    // Flatten the block's inline content so a match still lands when marks
    // (bold, colour, …) split it into several text nodes.
    let text = ''
    const at = []
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text.length; i++) at.push(pos + 1 + offset + i)
        text += child.text
      } else {
        at.push(pos + 1 + offset)
        text += '￼'
      }
    })
    const hay = caseSensitive ? text : text.toLowerCase()
    let i = hay.indexOf(needle)
    while (i !== -1) {
      out.push({ from: at[i], to: at[i + needle.length - 1] + 1 })
      i = hay.indexOf(needle, i + needle.length)
    }
    return false
  })
  return out
}

function decorate(doc, matches, index) {
  if (!matches.length) return DecorationSet.empty
  return DecorationSet.create(doc, matches.map((m, i) =>
    Decoration.inline(m.from, m.to, { class: i === index ? 'find-hit find-current' : 'find-hit' })
  ))
}

function rebuild(doc, query, caseSensitive, matches, index) {
  const i = matches.length ? Math.min(Math.max(index, 0), matches.length - 1) : 0
  return { query, caseSensitive, matches, index: i, decos: decorate(doc, matches, i) }
}

export const Find = Extension.create({
  name: 'lwFind',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findKey,
        state: {
          init: () => emptyFind,
          apply(tr, prev) {
            const meta = tr.getMeta(findKey)
            if (meta) {
              if (meta.close) return emptyFind
              // Stepping wraps around the hits we already have.
              if (meta.step && prev.matches.length) {
                const index = (prev.index + meta.step + prev.matches.length) % prev.matches.length
                return { ...prev, index, decos: decorate(tr.doc, prev.matches, index) }
              }
              const query = meta.query !== undefined ? meta.query : prev.query
              const caseSensitive = meta.caseSensitive !== undefined ? meta.caseSensitive : prev.caseSensitive
              if (!query) return { ...emptyFind, caseSensitive }
              const matches = findMatches(tr.doc, query, caseSensitive)
              // A changed query jumps to the hit nearest the caret; a repeat of
              // the same one stays where you were.
              let index = prev.index
              if (query !== prev.query || caseSensitive !== prev.caseSensitive) {
                const near = matches.findIndex((m) => m.to >= tr.selection.from)
                index = near === -1 ? 0 : near
              }
              return rebuild(tr.doc, query, caseSensitive, matches, index)
            }
            if (!prev.query) return prev
            if (tr.docChanged) {
              return rebuild(tr.doc, prev.query, prev.caseSensitive,
                findMatches(tr.doc, prev.query, prev.caseSensitive), prev.index)
            }
            return prev
          }
        },
        props: { decorations: (state) => findKey.getState(state).decos }
      })
    ]
  }
})

export const findState = (editor) => findKey.getState(editor.state)

export function setFindQuery(editor, query, caseSensitive) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { query, caseSensitive }))
  return findState(editor)
}

export function stepFind(editor, step) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { step }))
  return findState(editor)
}

export function closeFind(editor) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { close: true }))
}

// Centre the current hit in whatever is scrolling the editor.
export function scrollToFindMatch(editor) {
  const { matches, index } = findState(editor)
  const match = matches[index]
  if (!match) return
  const scroller = editor.view.dom.closest('.editor-scroll')
  if (!scroller) return
  const box = scroller.getBoundingClientRect()
  const { top } = editor.view.coordsAtPos(match.from)
  if (top >= box.top + 40 && top <= box.bottom - 40) return
  scroller.scrollTo({ top: scroller.scrollTop + (top - box.top) - box.height / 2, behavior: 'smooth' })
}
