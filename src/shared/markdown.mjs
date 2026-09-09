// Markdown ⇄ ProseMirror, both directions, against the Scriptorium schema.
//
// This is the load-bearing module of the whole app. A Simplenote note is a
// Markdown string; the editor is a ProseMirror document. Every note open runs
// `fromMarkdown`, every save runs `toMarkdown`, and if that pair is not stable
// the app does not merely display something wrong. It writes the damage back to
// the account and syncs it to the user's phone.
//
// Two properties matter, and scripts/roundtrip.mjs asserts both:
//
//   fidelity     the structure survives: a heading stays a heading, a checked
//                task stays checked, a table keeps its column alignment.
//   idempotence  toMarkdown(fromMarkdown(x)) applied twice equals applied once.
//                The FIRST pass may normalise (`*` bullets become `-`, `_em_`
//                becomes `*em*`) because the serialiser has one way of writing
//                each construct. Every pass after that must be a fixed point,
//                or a note would drift a little further on every keystroke.
//
// Because the first pass can normalise, the app must never write a note back
// unless the user actually edited it. See `hasEdits` at the bottom.

import MarkdownIt from 'markdown-it'
import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown'
import { getSchema } from '@tiptap/core'
import { markdownExtensions } from './schema.mjs'

export const schema = getSchema(markdownExtensions)

// ── the tokenizer ───────────────────────────────────────────────────────────
// Deliberately conservative options. `linkify` would turn a bare URL the user
// typed into a link node, and `typographer` would swap their quotes for curly
// ones. Both are silent rewrites of text nobody asked us to touch. `html:false`
// leaves any raw HTML in the note as literal text, which is the only honest
// thing to do with a construct this schema cannot hold.
const TASK = /^\[([ xX])\][ \t]+/

function scriptoriumTokens(md) {
  md.core.ruler.push('scriptorium', (state) => {
    taskLists(state.tokens)
    cellParagraphs(state.tokens, state.Token)
    softBreaks(state.tokens)
  })
}

// markdown-it has no notion of a task list; GFM checkboxes arrive as the literal
// text "[x] " at the head of a list item. Promote a list to a task list only
// when EVERY item is a checkbox. A mixed list is left completely alone, so the
// brackets stay as the text they are rather than half-converting the list.
function taskLists(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i]
    if (open.type !== 'bullet_list_open') continue

    const close = tokens.findIndex((t, j) => j > i && t.type === 'bullet_list_close' && t.level === open.level)
    if (close === -1) continue

    const items = []
    for (let j = i + 1; j < close; j++) {
      if (tokens[j].type === 'list_item_open' && tokens[j].level === open.level + 1) items.push(j)
    }
    if (!items.length) continue

    const found = items.map((idx) => {
      const end = tokens.findIndex((t, j) => j > idx && t.type === 'list_item_close' && t.level === tokens[idx].level)
      for (let j = idx + 1; j < (end === -1 ? close : end); j++) {
        if (tokens[j].type !== 'inline') continue
        const first = tokens[j].children && tokens[j].children[0]
        if (!first || first.type !== 'text') return null
        const m = TASK.exec(first.content)
        return m ? { first, checked: m[1].toLowerCase() === 'x', strip: m[0].length, end } : null
      }
      return null
    })
    if (found.some((f) => !f)) continue

    open.type = 'task_list_open'
    tokens[close].type = 'task_list_close'
    items.forEach((idx, k) => {
      const f = found[k]
      tokens[idx].type = 'task_item_open'
      tokens[idx].meta = { ...(tokens[idx].meta || {}), checked: f.checked }
      if (f.end !== -1) tokens[f.end].type = 'task_item_close'
      f.first.content = f.first.content.slice(f.strip)
    })
  }
}

// markdown-it puts an `inline` token straight inside a table cell, but the
// schema's cells hold blocks. Wrap each cell's content in a paragraph so the
// parser has somewhere to put the text.
function cellParagraphs(tokens, Token) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type !== 'th_open' && t.type !== 'td_open') continue
    if (!tokens[i + 1] || tokens[i + 1].type !== 'inline') continue
    const open = new Token('paragraph_open', 'p', 1)
    const close = new Token('paragraph_close', 'p', -1)
    open.hidden = close.hidden = true
    tokens.splice(i + 1, 0, open)
    tokens.splice(i + 3, 0, close)
    i += 3
  }
}

// A single newline inside a paragraph is a "softbreak", and prosemirror-markdown
// turns those into spaces by default. That silently reflows a hand-wrapped note
// the first time it is saved. Carry the newline through as text instead, because
// the serialiser writes it back out with the right block delimiters.
function softBreaks(tokens) {
  for (const tok of tokens) {
    if (tok.type !== 'inline' || !tok.children) continue
    for (const child of tok.children) {
      if (child.type === 'softbreak') { child.type = 'text'; child.content = '\n' }
    }
  }
}

const tokenizer = MarkdownIt('default', {
  html: false, linkify: false, typographer: false, breaks: false
}).use(scriptoriumTokens)

// ── Markdown → doc ──────────────────────────────────────────────────────────
const alignOf = (tok) => {
  const style = tok.attrGet('style') || ''
  const m = /text-align:\s*(left|center|right)/.exec(style)
  return m ? m[1] : null
}

export const parser = new MarkdownParser(schema, tokenizer, {
  blockquote:  { block: 'blockquote' },
  paragraph:   { block: 'paragraph' },
  list_item:   { block: 'listItem' },
  bullet_list: { block: 'bulletList' },
  ordered_list:{ block: 'orderedList', getAttrs: (tok) => ({ start: +(tok.attrGet('start') || 1) }) },
  task_list:   { block: 'taskList' },
  task_item:   { block: 'taskItem', getAttrs: (tok) => ({ checked: !!(tok.meta && tok.meta.checked) }) },
  heading:     { block: 'heading', getAttrs: (tok) => ({ level: +tok.tag.slice(1) }) },
  code_block:  { block: 'codeBlock', noCloseToken: true },
  fence:       { block: 'codeBlock', getAttrs: (tok) => ({ language: (tok.info || '').trim() || null }), noCloseToken: true },
  hr:          { node: 'horizontalRule' },
  hardbreak:   { node: 'hardBreak' },
  image:       { node: 'image', getAttrs: (tok) => ({
                   src: tok.attrGet('src'),
                   alt: (tok.children || []).reduce((s, c) => s + (c.content || ''), '') || null,
                   title: tok.attrGet('title') || null
                 }) },

  table: { block: 'table' },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr:    { block: 'tableRow' },
  th:    { block: 'tableHeader', getAttrs: (tok) => ({ align: alignOf(tok) }) },
  td:    { block: 'tableCell', getAttrs: (tok) => ({ align: alignOf(tok) }) },

  em:          { mark: 'italic' },
  strong:      { mark: 'bold' },
  s:           { mark: 'strike' },
  link:        { mark: 'link', getAttrs: (tok) => ({ href: tok.attrGet('href') }) },
  code_inline: { mark: 'code', noCloseToken: true }
})

// ── doc → Markdown ──────────────────────────────────────────────────────────
// Inline code containing backticks needs a longer fence than the content holds.
function backticksFor(node, side) {
  const ticks = /`+/g
  let len = 0
  if (node.isText) {
    let m
    while ((m = ticks.exec(node.text))) len = Math.max(len, m[0].length)
  }
  let result = len > 0 && side > 0 ? ' `' : '`'
  for (let i = 0; i < len; i++) result += '`'
  if (len > 0 && side < 0) result += ' '
  return result
}

// One cell's inline content, rendered on its own. A pipe table is a single line
// per row, so anything multi-line collapses and any literal pipe is escaped.
// There is no other way to write it in GFM.
function renderCell(cell) {
  const doc = schema.topNodeType.createAndFill(null, cell.content)
  if (!doc) return ''
  return serializer.serialize(doc, { tightLists: true })
    .replace(/\\\n/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim()
}

const RULE = { left: ':---', center: ':---:', right: '---:', null: '---' }

export const serializer = new MarkdownSerializer({
  text(state, node) { state.text(node.text) },

  paragraph(state, node) { state.renderInline(node); state.closeBlock(node) },

  heading(state, node) {
    state.write(state.repeat('#', node.attrs.level) + ' ')
    state.renderInline(node)
    state.closeBlock(node)
  },

  blockquote(state, node) {
    state.wrapBlock('> ', null, node, () => state.renderContent(node))
  },

  codeBlock(state, node) {
    state.write('```' + (node.attrs.language || '') + '\n')
    state.text(node.textContent, false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },

  horizontalRule(state, node) { state.write('---'); state.closeBlock(node) },

  hardBreak(state, node, parent, index) {
    for (let i = index + 1; i < parent.childCount; i++) {
      if (parent.child(i).type !== node.type) { state.write('\\\n'); return }
    }
  },

  bulletList(state, node) { state.renderList(node, '  ', () => '- ') },

  orderedList(state, node) {
    const start = node.attrs.start || 1
    const width = String(start + node.childCount - 1).length
    state.renderList(node, state.repeat(' ', width + 2), (i) => {
      const n = String(start + i)
      return state.repeat(' ', width - n.length) + n + '. '
    })
  },

  listItem(state, node) { state.renderContent(node) },

  taskList(state, node) { state.renderList(node, '  ', () => '- ') },

  taskItem(state, node) {
    state.write(node.attrs.checked ? '[x] ' : '[ ] ')
    state.renderContent(node)
  },

  image(state, node) {
    state.write('![' + state.esc(node.attrs.alt || '') + '](' + node.attrs.src +
      (node.attrs.title ? ' "' + node.attrs.title.replace(/"/g, '\\"') + '"' : '') + ')')
  },

  table(state, node) {
    const rows = []
    node.forEach((row) => {
      const cells = []
      row.forEach((cell) => cells.push({ text: renderCell(cell), align: cell.attrs.align }))
      rows.push(cells)
    })
    if (!rows.length) return

    const cols = rows.reduce((n, r) => Math.max(n, r.length), 0)
    const cell = (r, i) => (r[i] ? r[i].text : '')
    const line = (r) => '| ' + Array.from({ length: cols }, (_, i) => cell(r, i)).join(' | ') + ' |'

    state.write(line(rows[0])); state.ensureNewLine()
    state.write('| ' + Array.from({ length: cols }, (_, i) =>
      RULE[(rows[0][i] && rows[0][i].align) || null]).join(' | ') + ' |')
    state.ensureNewLine()
    for (const row of rows.slice(1)) { state.write(line(row)); state.ensureNewLine() }
    state.closeBlock(node)
  },

  // A table that somehow reaches the serialiser outside `table` (it should not)
  // still needs handlers, or serialisation throws mid-save.
  tableRow(state, node) { state.renderContent(node) },
  tableHeader(state, node) { state.renderContent(node) },
  tableCell(state, node) { state.renderContent(node) }
}, {
  bold:   { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
  italic: { open: '*',  close: '*',  mixable: true, expelEnclosingWhitespace: true },
  strike: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
  code: {
    open(_state, _mark, parent, index) { return backticksFor(parent.child(index), -1) },
    close(_state, _mark, parent, index) { return backticksFor(parent.child(index - 1), 1) },
    escape: false
  },
  link: {
    // `index` means different things either side of the mark: on open it points
    // at the first child inside it, on close at one past the last. Passing a
    // side keeps the two answers in agreement. Get this wrong and a bare URL
    // opens with `[` and closes with `>`, which is not even valid Markdown.
    open(_state, mark, parent, index) {
      return isPlainURL(mark, parent, index, 1) ? '<' : '['
    },
    close(_state, mark, parent, index) {
      return isPlainURL(mark, parent, index, -1)
        ? '>'
        : '](' + mark.attrs.href.replace(/[()"]/g, '\\$&') + ')'
    }
  }
})

// A link whose text IS its href can be written as <https://…> instead of the
// long form. Only when the mark covers exactly that one text node and stops.
function isPlainURL(link, parent, index, side) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) return false
  const content = parent.child(index + (side < 0 ? -1 : 0))
  if (!content || !content.isText || content.text !== link.attrs.href) return false
  if (content.marks[content.marks.length - 1] !== link) return false
  if (index === (side < 0 ? 1 : parent.childCount - 1)) return true
  const next = parent.child(index + (side < 0 ? -2 : 1))
  return !link.isInSet(next.marks)
}

// ── the public pair ─────────────────────────────────────────────────────────

/** Markdown string → ProseMirror document node. */
export function fromMarkdown(md) {
  return parser.parse(md == null ? '' : String(md))
}

/** ProseMirror document (node or JSON) → Markdown string. */
export function toMarkdown(doc) {
  const node = doc && typeof doc.toJSON === 'function' ? doc : schema.nodeFromJSON(doc)
  return serializer.serialize(node, { tightLists: true })
}

/**
 * Whether a note is safe to write back.
 *
 * Opening a note normalises it: `*` bullets become `-`, emphasis settles on one
 * marker. That is harmless as a display, but writing it back would show up as an
 * edit on every device for a note the user only looked at, and would fight any
 * other client that has its own idea of normal form. So the app saves only when
 * the text differs from what the editor first parsed, never merely because the
 * serialiser would spell it differently.
 */
export function hasEdits(originalMarkdown, currentDoc) {
  return toMarkdown(currentDoc) !== toMarkdown(fromMarkdown(originalMarkdown))
}
