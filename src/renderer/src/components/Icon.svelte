<script>
  // The app's icons, drawn.
  //
  // Everything here is stroked with `currentColor`, so an icon takes the colour
  // of whatever it sits in and follows all 93 themes without a second thought.
  // No emoji: they carry someone else's colour, someone else's drawing style,
  // and they render differently on every machine.
  export let name = ''
  export let size = 16

  // 24x24 grid, 2px stroke, round caps. One geometry for the whole set so they
  // sit together rather than looking like a collection of borrowed parts.
  const PATHS = {
    bulletList: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    taskList: 'M3.5 6.5l2 2 3.5-4M3.5 16.5l2 2 3.5-4M13 7h7M13 17h7',
    quote: 'M9 7c-2.5 0-4 1.8-4 4v6h6v-6H7c0-1.2.8-2 2-2zm10 0c-2.5 0-4 1.8-4 4v6h6v-6h-4c0-1.2.8-2 2-2z',
    link: 'M10 13a4 4 0 006 .5l2-2a4 4 0 00-5.7-5.7L11.5 7M14 11a4 4 0 00-6-.5l-2 2A4 4 0 0011.7 18l.8-.8',
    table: 'M4 5h16v14H4zM4 10h16M10 10v9',
    divider: 'M4 12h16',
    heading: 'M6 5v14M18 5v14M6 12h12',
    settings: 'M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z M19.3 14a1.5 1.5 0 00.3 1.7l.1.1a1.8 1.8 0 11-2.6 2.6l-.1-.1a1.5 1.5 0 00-2.6 1.1v.2a1.8 1.8 0 11-3.6 0v-.1a1.5 1.5 0 00-2.6-1.1l-.1.1a1.8 1.8 0 11-2.6-2.6l.1-.1A1.5 1.5 0 004 14H3.8a1.8 1.8 0 010-3.6h.1A1.5 1.5 0 005 7.8l-.1-.1a1.8 1.8 0 112.6-2.6l.1.1a1.5 1.5 0 002.6-1.1V4a1.8 1.8 0 013.6 0v.1a1.5 1.5 0 002.6 1.1l.1-.1a1.8 1.8 0 112.6 2.6l-.1.1a1.5 1.5 0 001.1 2.6h.2a1.8 1.8 0 010 3.6h-.1a1.5 1.5 0 00-1.4 1z',
    close: 'M6 6l12 12M18 6L6 18',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
    download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
    palette: 'M12 4a8 8 0 000 16c1.1 0 1.6-.8 1.6-1.5 0-.9-.8-1.3-.8-2.2 0-.7.6-1.3 1.3-1.3H16a4 4 0 004-4c0-3.9-3.6-7-8-7zM7.5 12h.01M9.5 8.2h.01M14.2 7.6h.01',
    clear: 'M8 5h11M6 5l1 14h10l1-14M4 9l6 6M10 9l-6 6',
    user: 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5',
    pencil: 'M4 20l4.5-1 9.8-9.8a2.1 2.1 0 00-3-3L5.5 15.5 4 20z',
    monitor: 'M4 5h16v11H4zM9 20h6M12 16v4',
    archive: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4'
  }

  // The pilcrow reads better as a real glyph than as a traced outline, and it is
  // typography rather than an emoji, so it stays a character.
  $: d = PATHS[name] || ''
  $: filled = name === 'quote'
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke={filled ? 'none' : 'currentColor'}
  stroke-width="1.9"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false">
  <path {d} />
</svg>

<style>
  .icon { display: block; flex: none; }
</style>
