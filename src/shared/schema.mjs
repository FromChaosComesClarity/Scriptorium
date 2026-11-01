// The Scriptorium schema: deliberately smaller than LatteWrite's.
//
// A Simplenote note IS a Markdown string. Anything the editor can express that
// Markdown cannot is not a feature, it is a way to destroy the user's note on
// the next save. So the schema carries exactly what Markdown can hold, and the
// toolbar can only offer what the schema carries.
//
// Removed from LatteWrite on purpose: text colour, highlight, the textFx marks,
// per-selection font family, text alignment, the presentation extension, and the
// borderless-table flag. None of them survive a trip through Markdown.
//
// Images are a deliberate half-exception. There is no way to PUT a picture into
// a Simplenote note, which stores text, so nothing in the UI inserts one. But a
// note may already contain `![alt](url)`, and silently eating that on open would
// be exactly the destruction this schema exists to prevent. So the image node
// stays, parsed and serialised, with no way to create one.

import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'

// GFM carries per-column alignment in the delimiter row (`:---`, `:---:`, `---:`)
// and Tiptap's table cells have nowhere to put it, so a round trip would quietly
// left-align every table it touched. One attribute fixes that.
const align = {
  align: {
    default: null,
    parseHTML: (el) => el.style.textAlign || null,
    renderHTML: (attrs) => (attrs.align ? { style: `text-align: ${attrs.align}` } : {})
  }
}

const AlignedHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), ...align } }
})

const AlignedCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), ...align } }
})

// ── tables, the GFM way ─────────────────────────────────────────────────────
// A ProseMirror table can be shapes a GFM pipe table cannot: a header row that
// is not the first row, a header deleted outright, cells merged across columns
// or rows, alignment that differs from cell to cell. Once rows and columns can
// be added and removed from the toolbar, every one of those is a click away,
// and each one would SAVE differently from how it LOOKS. Delete the header and
// the next row silently becomes the header on reload; add a row above the
// header and the column alignment silently vanishes.
//
// So a table is read through one lens, `gfmGrid`, by both the serialiser and
// the editor. The serialiser writes exactly that grid, and the editor reshapes
// itself into it after every change, so what is on screen is what Simplenote
// will get.

/**
 * A table as GFM sees it: a plain grid, one alignment per column.
 *
 * `cells[r][c]` is the cell whose top-left corner is at that position, or null
 * where a merged cell spills over. A column's alignment is the first one set
 * anywhere in it, top down. Scriptorium has no control that sets or clears an
 * alignment, so every alignment came from the note's own Markdown, and taking
 * the first one found keeps it when the header row is replaced or a column is
 * shuffled, instead of dropping it because one new cell has none.
 */
export function gfmGrid(table) {
  const map = TableMap.get(table)
  const cells = []
  const aligns = Array(map.width).fill(null)
  for (let r = 0; r < map.height; r++) {
    const row = []
    for (let c = 0; c < map.width; c++) {
      const offset = map.map[r * map.width + c]
      // A ragged row (fewer cells than the widest) leaves offset 0 in the map,
      // which is the first row, never a cell; findCell would throw on it. It is
      // an empty position, as the serialiser always wrote it.
      if (!offset) { row.push(null); continue }
      const rect = map.findCell(offset)
      const cell = rect.left === c && rect.top === r ? table.nodeAt(offset) : null
      row.push(cell)
      if (cell && !aligns[c] && cell.attrs.align) aligns[c] = cell.attrs.align
    }
    cells.push(row)
  }
  return { width: map.width, height: map.height, cells, aligns }
}

// Bring one table into GFM shape inside `tr`. Returns nothing; `tr` records
// whether anything changed.
function fixTable(tr, table, pos) {
  const { tableHeader, tableCell, tableRow } = tr.doc.type.schema.nodes
  const grid = gfmGrid(table)

  // Merged cells first. GFM has no spans, so a merged cell becomes its
  // top-left cell plus empty ones, exactly as the serialiser would write it.
  // This replaces the whole table, which is acceptable only because a merge
  // can arrive by paste alone: nothing in the app creates one.
  let merged = false
  table.descendants((n) => {
    if (n.attrs.colspan > 1 || n.attrs.rowspan > 1) merged = true
    return n.type === tableRow
  })
  if (merged) {
    const rows = grid.cells.map((row, r) => tableRow.create(null, row.map((cell, c) => {
      const type = r === 0 ? tableHeader : tableCell
      const attrs = { align: grid.aligns[c] }
      return cell ? type.create(attrs, cell.content) : type.createAndFill(attrs)
    })))
    tr.replaceWith(pos, pos + table.nodeSize, table.type.create(table.attrs, rows))
    return
  }

  // Otherwise only node types and attributes change, which setNodeMarkup does
  // in place, so the caret stays exactly where the user left it.
  table.forEach((row, rowOffset, r) => {
    row.forEach((cell, cellOffset, c) => {
      const type = r === 0 ? tableHeader : tableCell
      const align = grid.aligns[c] ?? null
      if (cell.type === type && cell.attrs.align === align) return
      const at = pos + 1 + rowOffset + 1 + cellOffset
      tr.setNodeMarkup(at, type, { ...cell.attrs, align })
    })
  })
}

/**
 * A transaction that puts every table in `state` into GFM shape, or null when
 * they all already are. Exported for the round-trip test.
 */
export function gfmTablesFix(state) {
  const tables = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') { tables.push(pos); return false }
    return true
  })
  if (!tables.length) return null
  const tr = state.tr
  // Last first, so a table rebuilt for merged cells cannot shift the position
  // of one still waiting to be checked.
  for (const pos of tables.reverse()) fixTable(tr, tr.doc.nodeAt(pos), pos)
  return tr.docChanged ? tr : null
}

const gfmTablesKey = new PluginKey('gfmTables')

const GfmTable = Table.extend({
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: gfmTablesKey,
        appendTransaction: (trs, _old, state) =>
          trs.some((t) => t.docChanged) ? gfmTablesFix(state) : null
      })
    ]
  }
})

// Shared by the editor and by the round-trip test, so what the tests prove is
// the schema the app actually runs.
export const markdownExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] }
  }),
  Link.configure({
    openOnClick: false,
    // Autolink rewrites a bare URL into a link node as you type. That is a
    // silent edit to the user's text, and it would show up as a diff against a
    // note they only opened. Off.
    autolink: false,
    linkOnPaste: true
  }),
  // `inline: true` is not cosmetic. Tiptap's default makes the image a BLOCK
  // node, which cannot sit inside a paragraph, so `text ![alt](url) text`
  // parses with the image silently dropped: the exact data loss this schema
  // exists to prevent.
  Image.configure({ inline: true, allowBase64: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  GfmTable.configure({ resizable: false }),
  TableRow,
  AlignedHeader,
  AlignedCell
]

// Every node and mark Scriptorium is allowed to produce. The round-trip test
// asserts the schema contains nothing beyond this, so adding an extension
// without teaching Markdown about it fails the test rather than the user.
export const ALLOWED_NODES = [
  'doc', 'paragraph', 'text', 'heading', 'blockquote', 'codeBlock',
  'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem',
  'horizontalRule', 'hardBreak', 'image',
  'table', 'tableRow', 'tableHeader', 'tableCell'
]

export const ALLOWED_MARKS = ['bold', 'italic', 'strike', 'code', 'link']
