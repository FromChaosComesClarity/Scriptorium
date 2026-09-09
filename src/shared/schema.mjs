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
  Table.configure({ resizable: false }),
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
