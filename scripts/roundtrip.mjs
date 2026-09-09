// The proof that Scriptorium is safe to point at a real Simplenote account.
//
// Run with: npm test
//
// Three things are checked, in increasing order of how badly failure would hurt:
//
//   1. SCHEMA AUDIT   the schema holds nothing Markdown cannot express. This is
//                     what stops someone adding a colour picker in six months
//                     and quietly turning every save into data loss.
//   2. FIDELITY       structure survives the trip. Asserted against the parsed
//                     document, not against a string, so it tests meaning.
//   3. IDEMPOTENCE    the round trip reaches a fixed point after one pass. The
//                     first pass may normalise; every pass after it must not
//                     change a single byte, or notes drift forever.

import { fromMarkdown, toMarkdown, schema, hasEdits } from '../src/shared/markdown.mjs'
import { ALLOWED_NODES, ALLOWED_MARKS } from '../src/shared/schema.mjs'

let failures = 0
let normalised = 0

const red = (s) => `\x1b[31m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

function fail(name, detail) {
  failures++
  console.log(`  ${red('FAIL')} ${name}`)
  console.log(detail.split('\n').map((l) => '       ' + l).join('\n'))
}

// ── 1. schema audit ─────────────────────────────────────────────────────────
console.log('\nSCHEMA AUDIT')
{
  const nodes = Object.keys(schema.nodes)
  const marks = Object.keys(schema.marks)
  const strayNodes = nodes.filter((n) => !ALLOWED_NODES.includes(n))
  const strayMarks = marks.filter((m) => !ALLOWED_MARKS.includes(m))

  if (strayNodes.length) fail('no nodes beyond the Markdown-safe set', `found: ${strayNodes.join(', ')}`)
  else console.log(`  ${green('ok')}   ${nodes.length} nodes, all Markdown-expressible`)

  if (strayMarks.length) fail('no marks beyond the Markdown-safe set', `found: ${strayMarks.join(', ')}`)
  else console.log(`  ${green('ok')}   ${marks.length} marks, all Markdown-expressible`)

  // The features that would silently destroy a note, named explicitly so the
  // test reads as the promise it is enforcing.
  for (const banned of ['textStyle', 'highlight', 'textFx', 'fontFamily', 'color']) {
    if (schema.marks[banned] || schema.nodes[banned]) {
      fail(`"${banned}" must not be in the schema`, 'Markdown cannot hold it; a save would destroy it')
    }
  }
  if (!failures) console.log(`  ${green('ok')}   colour, highlight, FX, font and alignment are absent`)
}

// ── the corpus ──────────────────────────────────────────────────────────────
// Written to hit the constructs a real note actually contains, plus the ones
// most likely to break: hard-wrapped prose, nested structure, escaping, and
// tables with alignment.
const cases = [
  {
    name: 'headings, all six levels',
    md: '# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six',
    check: (doc) => {
      const levels = []
      doc.forEach((n) => { if (n.type.name === 'heading') levels.push(n.attrs.level) })
      return levels.join(',') === '1,2,3,4,5,6' || `levels were ${levels.join(',')}`
    }
  },
  {
    name: 'emphasis, strong, strike, inline code',
    md: 'Plain *em* and **strong** and ~~struck~~ and `code()` together.',
    check: (doc) => {
      const marks = new Set()
      doc.descendants((n) => n.marks.forEach((m) => marks.add(m.type.name)))
      const want = ['italic', 'bold', 'strike', 'code']
      const missing = want.filter((w) => !marks.has(w))
      return !missing.length || `missing marks: ${missing.join(', ')}`
    }
  },
  {
    name: 'inline code containing backticks',
    md: 'Use ``a ` b`` in a sentence.'
  },
  {
    name: 'hard-wrapped paragraph keeps its line breaks',
    md: 'This note was written\nwith the lines wrapped\nby hand.',
    check: (doc) => {
      const text = doc.textContent
      return text.includes('\n') || 'the newlines were collapsed to spaces'
    }
  },
  {
    name: 'explicit hard break',
    md: 'Line one\\\nline two'
  },
  {
    name: 'bullet list, nested',
    md: '- one\n- two\n  - two a\n  - two b\n- three'
  },
  {
    name: 'ordered list with a start offset',
    md: '3. three\n4. four\n5. five',
    check: (doc) => {
      let start = null
      doc.forEach((n) => { if (n.type.name === 'orderedList') start = n.attrs.start })
      return start === 3 || `start was ${start}`
    }
  },
  {
    name: 'task list, mixed checked state',
    md: '- [ ] unchecked\n- [x] checked\n- [ ] another',
    check: (doc) => {
      const states = []
      doc.descendants((n) => { if (n.type.name === 'taskItem') states.push(n.attrs.checked) })
      if (states.length !== 3) return `expected 3 task items, got ${states.length}`
      return states.join(',') === 'false,true,false' || `states were ${states.join(',')}`
    }
  },
  {
    name: 'a list that is NOT a task list is left alone',
    md: '- [ ] a checkbox\n- but this one is plain text',
    check: (doc) => {
      let hasTask = false
      doc.descendants((n) => { if (n.type.name === 'taskItem') hasTask = true })
      return !hasTask || 'a mixed list was half-converted into a task list'
    }
  },
  {
    name: 'blockquote containing a list',
    md: '> quoted line\n>\n> - and a bullet\n> - inside the quote'
  },
  {
    name: 'fenced code block keeps its language',
    md: '```js\nconst a = 1\nif (a > 0) { console.log("hi") }\n```',
    check: (doc) => {
      let lang = null
      doc.forEach((n) => { if (n.type.name === 'codeBlock') lang = n.attrs.language })
      return lang === 'js' || `language was ${JSON.stringify(lang)}`
    }
  },
  {
    name: 'code block content is not markdown-escaped',
    md: '```\n*not emphasis* and _not italic_\n```',
    check: (doc) => {
      const md = toMarkdown(doc)
      return !md.includes('\\*') || 'the code block content was escaped'
    }
  },
  {
    name: 'links, inline and bare',
    md: 'See [the docs](https://example.com/a_b) and <https://example.com/plain>.',
    check: (doc) => {
      const hrefs = []
      doc.descendants((n) => n.marks.forEach((m) => { if (m.type.name === 'link') hrefs.push(m.attrs.href) }))
      return hrefs.length === 2 || `found ${hrefs.length} links`
    }
  },
  {
    name: 'image survives even though nothing can create one',
    md: '![a diagram](https://example.com/d.png)',
    check: (doc) => {
      let src = null
      doc.descendants((n) => { if (n.type.name === 'image') src = n.attrs.src })
      return src === 'https://example.com/d.png' || `src was ${JSON.stringify(src)}`
    }
  },
  {
    name: 'table with column alignment',
    md: '| Left | Middle | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n| d | e | f |',
    check: (doc) => {
      const aligns = []
      doc.descendants((n) => { if (n.type.name === 'tableHeader') aligns.push(n.attrs.align) })
      return aligns.join(',') === 'left,center,right' || `alignments were ${aligns.join(',')}`
    }
  },
  {
    name: 'table cell containing a pipe',
    md: '| a | b |\n| --- | --- |\n| x \\| y | z |'
  },
  {
    name: 'horizontal rule',
    md: 'above\n\n---\n\nbelow'
  },
  {
    name: 'raw HTML is preserved as literal text',
    md: 'before <span class="x">middle</span> after',
    check: (doc) => {
      const t = doc.textContent
      return t.includes('<span') || 'the HTML was swallowed'
    }
  },
  {
    name: 'a realistic note',
    md: [
      '# Shopping and other business',
      '',
      'Things to pick up **before** Friday, in rough order of how badly',
      'I need them.',
      '',
      '- [x] coffee beans',
      '- [ ] oat milk',
      '- [ ] a new `.zshrc` that works',
      '',
      '## Notes',
      '',
      '> The good grinder is the one with the *red* dial, not the black one.',
      '',
      '| Shop | Open until | Good? |',
      '| --- | ---: | :---: |',
      '| The corner place | 18:00 | yes |',
      '| Supermarket | 22:00 | no |',
      '',
      'See [the list](https://example.com/list) for the rest.'
    ].join('\n')
  }
]

// ── 2 + 3. fidelity and idempotence ─────────────────────────────────────────
console.log('\nFIDELITY AND IDEMPOTENCE')
for (const c of cases) {
  let doc
  try {
    doc = fromMarkdown(c.md)
  } catch (e) {
    fail(c.name, `parse threw: ${e.message}`)
    continue
  }

  if (c.check) {
    let verdict
    try { verdict = c.check(doc) } catch (e) { verdict = `check threw: ${e.message}` }
    if (verdict !== true) { fail(c.name, String(verdict)); continue }
  }

  let pass1, pass2
  try {
    pass1 = toMarkdown(doc)
    pass2 = toMarkdown(fromMarkdown(pass1))
  } catch (e) {
    fail(c.name, `serialise threw: ${e.message}`)
    continue
  }

  if (pass1 !== pass2) {
    fail(c.name, 'NOT IDEMPOTENT: the note would drift on every save\n' +
      `pass 1: ${JSON.stringify(pass1)}\npass 2: ${JSON.stringify(pass2)}`)
    continue
  }

  const drifted = pass1.trim() !== c.md.trim()
  if (drifted) normalised++
  console.log(`  ${green('ok')}   ${c.name}${drifted ? ' ' + yellow('(normalises)') : ''}`)
  if (drifted) {
    console.log(dim(`         in:  ${JSON.stringify(c.md.length > 70 ? c.md.slice(0, 70) + '…' : c.md)}`))
    console.log(dim(`         out: ${JSON.stringify(pass1.length > 70 ? pass1.slice(0, 70) + '…' : pass1)}`))
  }
}

// ── the safety net that makes normalisation harmless ────────────────────────
console.log('\nNO-EDIT GUARANTEE')
{
  // Notes whose source is not in the serialiser's normal form. Opening one and
  // closing it again must never count as an edit, or every note the user merely
  // looks at gets rewritten on all their devices.
  const quirky = [
    '* star bullets\n* second',
    '_underscore emphasis_',
    'Setext heading\n==============',
    '1)  paren ordered\n2)  second'
  ]
  let bad = 0
  for (const md of quirky) {
    const doc = fromMarkdown(md)
    if (hasEdits(md, doc)) {
      bad++
      fail('opening a note is not an edit', `this note would be rewritten unasked:\n${JSON.stringify(md)}`)
    }
  }
  if (!bad) console.log(`  ${green('ok')}   ${quirky.length} non-normal-form notes open without counting as edits`)

  // And a real edit must still be detected, or nothing would ever save.
  const original = '# Title\n\nbody'
  const edited = fromMarkdown('# Title\n\nbody, changed')
  if (!hasEdits(original, edited)) fail('a real edit is detected', 'hasEdits returned false for a changed document')
  else console.log(`  ${green('ok')}   a genuine change is still detected as an edit`)
}

// ── verdict ─────────────────────────────────────────────────────────────────
console.log('')
if (failures) {
  console.log(red(`${failures} failure${failures === 1 ? '' : 's'}. Do not point this at a real account.`))
  process.exit(1)
}
console.log(green(`All checks passed.`) + dim(` ${cases.length} corpus cases, ${normalised} normalise on first save.`))
