// A Style is a full look: color tokens + a heading/body/ui font pairing (family
// names) + reading measure + caret personality. Built-ins are IMMUTABLE — the
// app never mutates these; changing a font forks a custom copy instead.
// Fonts are family names; the theme engine builds the CSS stack and loads any
// non-bundled (Google) family on demand.

export const STYLES = {
  // ── Coffee ────────────────────────────────────────────────────────────────
  Espresso: {
    dark: true,
    fonts: { heading: 'Raleway', body: 'Source Serif 4', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#17100a', surface: '#21160d', text: '#efe3d2', muted: '#b89b7d',
      accent: '#d4a373', selection: 'rgba(212,163,115,0.28)', caret: '#d4a373', rule: '#3a2a1b'
    }
  },
  Poppins: {
    dark: true,
    fonts: { heading: 'Poppins', body: 'Poppins', ui: 'Raleway' },
    measure: '52rem', scale: 1,
    tokens: {
      bg: '#17100a', surface: '#2e2014', text: '#efe3d2', muted: '#fbdab7',
      accent: '#ffc48a', selection: 'rgba(255,196,138,0.28)', caret: '#d4a373', rule: '#3a2a1b'
    }
  },
  Unbounded: {
    dark: true,
    fonts: { heading: 'Unbounded', body: 'Unbounded', ui: 'Raleway' },
    measure: '52rem', scale: 1,
    tokens: {
      bg: '#17100a', surface: '#21160d', text: '#efe3d2', muted: '#b89b7d',
      accent: '#d4a373', selection: 'rgba(212,163,115,0.28)', caret: '#d4a373', rule: '#3a2a1b'
    }
  },
  'Unbounded Light': {
    dark: false,
    fonts: { heading: 'Unbounded', body: 'Unbounded', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#ffefe0', surface: '#ffdbbd', text: '#613900', muted: '#8f4a00',
      accent: '#d4a373', selection: 'rgba(212,163,115,0.28)', caret: '#ff8000', rule: '#3a2a1b'
    }
  },

  // ── BrewBalance ───────────────────────────────────────────────────────────
  // The five brand palettes from our sibling app BrewBalance, re-cast as full
  // LatteWrite Styles (colours + a coffee-menu type pairing). Dark & Light share
  // the Fraunces/Source Serif 4 pairing so they read as a matched set, just as
  // BrewBalance's own Dark/Light mirror each other.
  'BrewBalance Dark': {
    dark: true,
    fonts: { heading: 'Fraunces', body: 'Source Serif 4', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#17100a', surface: '#1e150d', text: '#efe3d2', muted: '#b89b7d',
      accent: '#d4a373', selection: 'rgba(212,163,115,0.26)', caret: '#d4a373', rule: '#382718'
    }
  },
  'BrewBalance Light': {
    dark: false,
    fonts: { heading: 'Fraunces', body: 'Source Serif 4', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#f3ebdd', surface: '#fbf7ef', text: '#2a241c', muted: '#7c6b53',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.20)', caret: '#b5651d', rule: '#ddceb4'
    }
  },
  Mocha: {
    dark: true,
    fonts: { heading: 'Playfair Display', body: 'Lora', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#1a1210', surface: '#241813', text: '#f0dfcf', muted: '#c7a98f',
      accent: '#c98a5e', selection: 'rgba(201,138,94,0.26)', caret: '#c98a5e', rule: '#4a3226'
    }
  },
  'Flat White': {
    dark: false,
    fonts: { heading: 'Quicksand', body: 'Nunito', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#f6f1e9', surface: '#fdfaf4', text: '#33291f', muted: '#6b5a48',
      accent: '#8a5a2b', selection: 'rgba(138,90,43,0.18)', caret: '#8a5a2b', rule: '#e0d4c0'
    }
  },
  Matcha: {
    dark: true,
    fonts: { heading: 'Quicksand', body: 'Nunito', ui: 'Inter' },
    measure: '48rem', scale: 1,
    tokens: {
      bg: '#12160f', surface: '#1a2015', text: '#e6efd8', muted: '#b3c79b',
      accent: '#9bbf6b', selection: 'rgba(155,191,107,0.26)', caret: '#9bbf6b', rule: '#33422a'
    }
  },

  // ── Editorial ─────────────────────────────────────────────────────────────
  Ink: {
    dark: true,
    fonts: { heading: 'Space Grotesk', body: 'Inter', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#0b0b0d', surface: '#141417', text: '#f4f4f6', muted: '#9a9aa2',
      accent: '#8ab4ff', selection: 'rgba(138,180,255,0.24)', caret: '#f4f4f6', rule: '#26262b'
    }
  },
  Paper: {
    dark: false,
    fonts: { heading: 'Lora', body: 'Source Serif 4', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#ffffff', surface: '#ffffff', text: '#1a1a1a', muted: '#6a6a6a',
      accent: '#444444', selection: 'rgba(0,0,0,0.12)', caret: '#1a1a1a', rule: '#e2e2e2'
    }
  },
  Manuscript: {
    dark: false,
    fonts: { heading: 'Lora', body: 'Source Serif 4', ui: 'Inter' },
    measure: '42rem', scale: 1,
    tokens: {
      bg: '#f5efe4', surface: '#fbf7ef', text: '#2a241c', muted: '#7c7263',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.2)', caret: '#b5651d', rule: '#ddd2bf'
    }
  },
  Lora: {
    dark: false,
    fonts: { heading: 'Lora', body: 'Lora', ui: 'Inter' },
    measure: '42rem', scale: 1,
    tokens: {
      bg: '#f5efe4', surface: '#fbf7ef', text: '#2a241c', muted: '#7c7263',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.2)', caret: '#b5651d', rule: '#ddd2bf'
    }
  },
  Caslon: {
    dark: false,
    fonts: { heading: 'Libre Caslon Text', body: 'Libre Caslon Text', ui: 'Inter' },
    measure: '42rem', scale: 1,
    tokens: {
      bg: '#f5efe4', surface: '#fbf7ef', text: '#2a241c', muted: '#7c7263',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.2)', caret: '#b5651d', rule: '#ddd2bf'
    }
  },

  Magazine: {
    dark: true,
    fonts: { heading: 'Playfair Display', body: 'Inter', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#111114', surface: '#1a1a1f', text: '#f4f2ee', muted: '#9b968d',
      accent: '#e0533d', selection: 'rgba(224,83,61,0.26)', caret: '#e0533d', rule: '#29292f'
    }
  },
  'Serif Noir': {
    dark: true,
    fonts: { heading: 'Fraunces', body: 'Newsreader', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#14110e', surface: '#1d1913', text: '#ece4d8', muted: '#9c9184',
      accent: '#d1a15a', selection: 'rgba(209,161,90,0.24)', caret: '#d1a15a', rule: '#2f2820'
    }
  },
  Column: {
    dark: false,
    fonts: { heading: 'DM Serif Display', body: 'Source Serif 4', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#f8f6f1', surface: '#fffdf8', text: '#221f1a', muted: '#6f695d',
      accent: '#3f6f5f', selection: 'rgba(63,111,95,0.18)', caret: '#3f6f5f', rule: '#e6e1d6'
    }
  },

  // ── Lecture ───────────────────────────────────────────────────────────────
  Lecture: {
    dark: true,
    fonts: { heading: 'Space Grotesk', body: 'Inter', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0e131a', surface: '#141b25', text: '#eaf1f8', muted: '#93a4b8',
      accent: '#4bc0d9', selection: 'rgba(75,192,217,0.25)', caret: '#4bc0d9', rule: '#22303f'
    }
  },
  'Poppins Dark Blue': {
    dark: true,
    fonts: { heading: 'Poppins', body: 'Poppins', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0e131a', surface: '#141b25', text: '#eaf1f8', muted: '#93a4b8',
      accent: '#4bc0d9', selection: 'rgba(75,192,217,0.28)', caret: '#4bc0d9', rule: '#22303f'
    }
  },
  'Unbounded Dark Blue': {
    dark: true,
    fonts: { heading: 'Unbounded', body: 'Unbounded', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0e131a', surface: '#141b25', text: '#eaf1f8', muted: '#93a4b8',
      accent: '#4bc0d9', selection: 'rgba(75,192,217,0.28)', caret: '#4bc0d9', rule: '#22303f'
    }
  },

  Chalkboard: {
    dark: true,
    fonts: { heading: 'Poppins', body: 'Inter', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#17241d', surface: '#1e2e25', text: '#f0f4ee', muted: '#a3b3a8',
      accent: '#f4d35e', selection: 'rgba(244,211,94,0.24)', caret: '#f4d35e', rule: '#2c3f34'
    }
  },
  Whiteboard: {
    dark: false,
    fonts: { heading: 'Poppins', body: 'Inter', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#ffffff', surface: '#f7f8fa', text: '#1c2230', muted: '#6b7280',
      accent: '#2563eb', selection: 'rgba(37,99,235,0.16)', caret: '#2563eb', rule: '#e5e7eb'
    }
  },
  Seminar: {
    dark: true,
    fonts: { heading: 'Space Grotesk', body: 'Inter', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#141310', surface: '#1e1c16', text: '#f3efe4', muted: '#a89f8c',
      accent: '#e0a458', selection: 'rgba(224,164,88,0.24)', caret: '#e0a458', rule: '#2d2a20'
    }
  },

  // ── Typewriter ────────────────────────────────────────────────────────────
  'Special Elite': {
    dark: false,
    fonts: { heading: 'Special Elite', body: 'Special Elite', ui: 'Inter' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#f5efe4', surface: '#fbf7ef', text: '#2a241c', muted: '#7c7263',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.2)', caret: '#b5651d', rule: '#ddd2bf'
    }
  },
  'Special Elite Dark': {
    dark: true,
    fonts: { heading: 'Special Elite', body: 'Special Elite', ui: 'Inter' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#30302c', surface: '#373634', text: '#fdffdb', muted: '#cfd2a7',
      accent: '#a1a87a', selection: 'rgba(161,168,122,0.28)', caret: '#ffffff', rule: '#ddd2bf'
    }
  },

  Courier: {
    dark: false,
    fonts: { heading: 'Courier Prime', body: 'Courier Prime', ui: 'Inter' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#f4f0e6', surface: '#faf6ec', text: '#26221b', muted: '#766e5e',
      accent: '#7a5230', selection: 'rgba(122,82,48,0.18)', caret: '#7a5230', rule: '#ddd5c2'
    }
  },
  Draft: {
    dark: false,
    fonts: { heading: 'Courier Prime', body: 'Courier Prime', ui: 'Inter' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#f2f2ef', surface: '#f9f9f6', text: '#22201d', muted: '#6d6a63',
      accent: '#b0472b', selection: 'rgba(176,71,43,0.18)', caret: '#b0472b', rule: '#dedbd3'
    }
  },
  'Noir Type': {
    dark: true,
    fonts: { heading: 'Cutive Mono', body: 'Cutive Mono', ui: 'Inter' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#121210', surface: '#1b1b17', text: '#e8e3d2', muted: '#a39e8c',
      accent: '#c9a24e', selection: 'rgba(201,162,78,0.24)', caret: '#c9a24e', rule: '#2b2a22'
    }
  },

  // ── Retro ─────────────────────────────────────────────────────────────────
  'Press Start 2P': {
    dark: true,
    fonts: { heading: 'Press Start 2P', body: 'Press Start 2P', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0e131a', surface: '#141b25', text: '#eaf1f8', muted: '#93a4b8',
      accent: '#4bc0d9', selection: 'rgba(75,192,217,0.25)', caret: '#4bc0d9', rule: '#22303f'
    }
  },
  'GAMEBOY DMG': {
    dark: false,
    fonts: { heading: 'Press Start 2P', body: 'Press Start 2P', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#7e8b5b', surface: '#b8b8b8', text: '#24301c', muted: '#610022',
      accent: '#003d5c', selection: 'rgba(0,61,92,0.28)', caret: '#054d1e', rule: '#223f32'
    }
  },
  'Terminal Green': {
    dark: true,
    fonts: { heading: 'Bungee', body: 'Sixtyfour', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#111e10', surface: '#13251b', text: '#77ff5c', muted: '#97b893',
      accent: '#83d94a', selection: 'rgba(131,217,74,0.28)', caret: '#4ad94c', rule: '#273f22'
    }
  },
  'Terminal Orange': {
    dark: true,
    fonts: { heading: 'Black Ops One', body: 'Sixtyfour', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#1e1810', surface: '#251d13', text: '#ffbb5c', muted: '#b8a993',
      accent: '#d99d4a', selection: 'rgba(217,157,74,0.28)', caret: '#d9a44a', rule: '#3f3022'
    }
  },

  'Terminal Cyan': {
    dark: true,
    fonts: { heading: 'Bungee', body: 'Sixtyfour', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0a1a1e', surface: '#0e2228', text: '#5cf0ff', muted: '#7fb8c0',
      accent: '#4ad9d4', selection: 'rgba(74,217,212,0.28)', caret: '#4ad9d4', rule: '#1a3a40'
    }
  },
  Synthwave: {
    dark: true,
    fonts: { heading: 'Monoton', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#14082a', surface: '#1d0d3a', text: '#ffe0ff', muted: '#b98fd6',
      accent: '#ff2fb9', selection: 'rgba(255,47,185,0.26)', caret: '#ff2fb9', rule: '#331a55'
    }
  },
  Miami: {
    dark: true,
    fonts: { heading: 'Righteous', body: 'Poppins', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0e2a30', surface: '#123840', text: '#f5ede0', muted: '#7fb0b0',
      accent: '#ff5c8a', selection: 'rgba(255,92,138,0.26)', caret: '#ff5c8a', rule: '#1e4a52'
    }
  },

  // ── Playful ───────────────────────────────────────────────────────────────
  Lucy: {
    dark: true,
    fonts: { heading: 'Fredoka', body: 'Indie Flower', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#1e101c', surface: '#241325', text: '#f7e8f7', muted: '#b693b8',
      accent: '#d94a88', selection: 'rgba(217,74,136,0.28)', caret: '#d94aba', rule: '#3d223f'
    }
  },
  'Lucy Light': {
    dark: false,
    fonts: { heading: 'Fredoka', body: 'Indie Flower', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#ffe0fa', surface: '#fcc2ff', text: '#4d004d', muted: '#6f0075',
      accent: '#d94a88', selection: 'rgba(217,74,136,0.28)', caret: '#ff00c8', rule: '#3d223f'
    }
  },
  'Poppins Candy Light': {
    dark: false,
    fonts: { heading: 'Poppins', body: 'Poppins', ui: 'Inter' },
    measure: '52rem', scale: 1,
    tokens: {
      bg: '#ebebeb', surface: '#d7fbfe', text: '#33000f', muted: '#7a0025',
      accent: '#c7006a', selection: 'rgba(199,0,106,0.28)', caret: '#1a1a1a', rule: '#e2e2e2'
    }
  },
  Orange: {
    dark: false,
    fonts: { heading: 'Righteous', body: 'Outfit', ui: 'Inter' },
    measure: '42rem', scale: 1,
    tokens: {
      bg: '#f5efe4', surface: '#fb983c', text: '#2a241c', muted: '#573400',
      accent: '#b5651d', selection: 'rgba(181,101,29,0.2)', caret: '#b5651d', rule: '#ddd2bf'
    }
  },

  // ── Modern ──────────────────────────────────────────────────────────────────
  Nordic: {
    dark: false,
    fonts: { heading: 'Manrope', body: 'Manrope', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#f7f8fa', surface: '#ffffff', text: '#1c2530', muted: '#6b7684',
      accent: '#3a6ff2', selection: 'rgba(58,111,242,0.18)', caret: '#3a6ff2', rule: '#e3e7ec'
    }
  },
  Onyx: {
    dark: true,
    fonts: { heading: 'Sora', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#0b0d0e', surface: '#15181a', text: '#f2f4f5', muted: '#8b9296',
      accent: '#34d399', selection: 'rgba(52,211,153,0.24)', caret: '#34d399', rule: '#23282b'
    }
  },
  Cobalt: {
    dark: true,
    fonts: { heading: 'Space Grotesk', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#0a0f1e', surface: '#111834', text: '#eaf0ff', muted: '#8794b5',
      accent: '#5b8cff', selection: 'rgba(91,140,255,0.26)', caret: '#5b8cff', rule: '#1e2745'
    }
  },
  Coral: {
    dark: false,
    fonts: { heading: 'Poppins', body: 'Work Sans', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#fbf9f7', surface: '#ffffff', text: '#2b2320', muted: '#8a7d76',
      accent: '#ff6b5e', selection: 'rgba(255,107,94,0.20)', caret: '#ff6b5e', rule: '#eee6e0'
    }
  },
  Graphite: {
    dark: false,
    fonts: { heading: 'Archivo', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#f4f4f5', surface: '#ffffff', text: '#18181b', muted: '#71717a',
      accent: '#f97316', selection: 'rgba(249,115,22,0.18)', caret: '#f97316', rule: '#e4e4e7'
    }
  },

  // ── Vintage ─────────────────────────────────────────────────────────────────
  Sepia: {
    dark: false,
    fonts: { heading: 'Playfair Display', body: 'EB Garamond', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#efe6d3', surface: '#f6efdf', text: '#3a2f22', muted: '#8a765a',
      accent: '#9c5a2c', selection: 'rgba(156,90,44,0.20)', caret: '#9c5a2c', rule: '#d9cbb0'
    }
  },
  'Vintage Rose': {
    dark: false,
    fonts: { heading: 'Cormorant Garamond', body: 'EB Garamond', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#f3e8e6', surface: '#faf1ef', text: '#43302e', muted: '#9a7d78',
      accent: '#a34a4a', selection: 'rgba(163,74,74,0.18)', caret: '#a34a4a', rule: '#e0cbc6'
    }
  },
  'Old Newsprint': {
    dark: false,
    fonts: { heading: 'Playfair Display', body: 'PT Serif', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#e8e4da', surface: '#f1ede3', text: '#262320', muted: '#6f695d',
      accent: '#7a3b2e', selection: 'rgba(122,59,46,0.18)', caret: '#7a3b2e', rule: '#cdc7b8'
    }
  },
  'Forest Vintage': {
    dark: true,
    fonts: { heading: 'Cormorant Garamond', body: 'Lora', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#1b241d', surface: '#232e25', text: '#e8e2ce', muted: '#9aa38f',
      accent: '#c2a24e', selection: 'rgba(194,162,78,0.24)', caret: '#c2a24e', rule: '#38442f'
    }
  },
  Bordeaux: {
    dark: true,
    fonts: { heading: 'Playfair Display', body: 'EB Garamond', ui: 'Inter' },
    measure: '44rem', scale: 1,
    tokens: {
      bg: '#24141a', surface: '#2f1a22', text: '#f0e2dd', muted: '#bd9a95',
      accent: '#c9727b', selection: 'rgba(201,114,123,0.24)', caret: '#c9727b', rule: '#43222c'
    }
  },

  // ── Art Deco ────────────────────────────────────────────────────────────────
  Gatsby: {
    dark: true,
    fonts: { heading: 'Poiret One', body: 'Josefin Sans', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#0e0e0c', surface: '#17150f', text: '#f3ead0', muted: '#b6a678',
      accent: '#d4af37', selection: 'rgba(212,175,55,0.24)', caret: '#d4af37', rule: '#33301f'
    }
  },
  'Deco Emerald': {
    dark: true,
    fonts: { heading: 'Cinzel', body: 'Josefin Sans', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#08201a', surface: '#0d2a22', text: '#ece6d3', muted: '#8fae9f',
      accent: '#cba55b', selection: 'rgba(203,165,91,0.24)', caret: '#cba55b', rule: '#14382d'
    }
  },
  Champagne: {
    dark: false,
    fonts: { heading: 'Cinzel', body: 'Josefin Sans', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#efe9dc', surface: '#f7f2e8', text: '#1c1a15', muted: '#7d735c',
      accent: '#b08d3c', selection: 'rgba(176,141,60,0.20)', caret: '#b08d3c', rule: '#ddd2b8'
    }
  },
  Manhattan: {
    dark: true,
    fonts: { heading: 'Poiret One', body: 'Raleway', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#0b1220', surface: '#121c31', text: '#e9edf5', muted: '#93a1bd',
      accent: '#c9a24b', selection: 'rgba(201,162,75,0.24)', caret: '#c9a24b', rule: '#1f2c45'
    }
  },
  'Ruby Deco': {
    dark: true,
    fonts: { heading: 'Cinzel', body: 'Josefin Sans', ui: 'Raleway' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#120a0c', surface: '#1c0f12', text: '#f2e6dc', muted: '#b58f88',
      accent: '#c0392b', selection: 'rgba(192,57,43,0.26)', caret: '#c0392b', rule: '#351a1e'
    }
  },

  // ── Vintage Gamer ───────────────────────────────────────────────────────────
  'Arcade Night': {
    dark: true,
    fonts: { heading: 'Press Start 2P', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0a0410', surface: '#140820', text: '#f5e9ff', muted: '#a97fd0',
      accent: '#ff3cac', selection: 'rgba(255,60,172,0.26)', caret: '#ff3cac', rule: '#2a123f'
    }
  },
  NES: {
    dark: true,
    fonts: { heading: 'Silkscreen', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#101010', surface: '#1b1b1b', text: '#f0f0f0', muted: '#9a9a9a',
      accent: '#e4000f', selection: 'rgba(228,0,15,0.26)', caret: '#e4000f', rule: '#2e2e2e'
    }
  },
  'SNES Purple': {
    dark: true,
    fonts: { heading: 'Pixelify Sans', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#1a1626', surface: '#241e33', text: '#e9e4f5', muted: '#9c93b5',
      accent: '#b39ddb', selection: 'rgba(179,157,219,0.28)', caret: '#b39ddb', rule: '#332a4a'
    }
  },
  'Sega Genesis': {
    dark: true,
    fonts: { heading: 'Press Start 2P', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#0a0e18', surface: '#111726', text: '#e8edf7', muted: '#8792ab',
      accent: '#d81e2c', selection: 'rgba(216,30,44,0.26)', caret: '#d81e2c', rule: '#1d2740'
    }
  },
  'Amber Arcade': {
    dark: true,
    fonts: { heading: 'DotGothic16', body: 'VT323', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#140d00', surface: '#1e1400', text: '#ffb000', muted: '#b57e12',
      accent: '#ffcc44', selection: 'rgba(255,204,68,0.24)', caret: '#ffcc44', rule: '#3a2600'
    }
  },

  // ── Modern Gamer ────────────────────────────────────────────────────────────
  'Neon Grid': {
    dark: true,
    fonts: { heading: 'Orbitron', body: 'Rajdhani', ui: 'Inter' },
    measure: '50rem', scale: 1.1,
    tokens: {
      bg: '#06080f', surface: '#0d1220', text: '#dbe6ff', muted: '#7d8bad',
      accent: '#00e5ff', selection: 'rgba(0,229,255,0.24)', caret: '#00e5ff', rule: '#16203a'
    }
  },
  'Cyber Violet': {
    dark: true,
    fonts: { heading: 'Orbitron', body: 'Chakra Petch', ui: 'Inter' },
    measure: '50rem', scale: 1.1,
    tokens: {
      bg: '#0b0616', surface: '#150a26', text: '#ecdfff', muted: '#9a7fc4',
      accent: '#a855f7', selection: 'rgba(168,85,247,0.28)', caret: '#a855f7', rule: '#241340'
    }
  },
  Toxic: {
    dark: true,
    fonts: { heading: 'Audiowide', body: 'Rajdhani', ui: 'Inter' },
    measure: '50rem', scale: 1.1,
    tokens: {
      bg: '#0a0f08', surface: '#121a0e', text: '#e6f5da', muted: '#8ba579',
      accent: '#a3e635', selection: 'rgba(163,230,53,0.24)', caret: '#a3e635', rule: '#23331a'
    }
  },
  Inferno: {
    dark: true,
    fonts: { heading: 'Chakra Petch', body: 'Rajdhani', ui: 'Inter' },
    measure: '50rem', scale: 1.1,
    tokens: {
      bg: '#100a08', surface: '#1c110c', text: '#ffece0', muted: '#c39383',
      accent: '#ff5722', selection: 'rgba(255,87,34,0.26)', caret: '#ff5722', rule: '#35201a'
    }
  },
  Frostbyte: {
    dark: true,
    fonts: { heading: 'Exo 2', body: 'Chakra Petch', ui: 'Inter' },
    measure: '50rem', scale: 1.1,
    tokens: {
      bg: '#0a0f14', surface: '#111922', text: '#e9f3fb', muted: '#86a0b5',
      accent: '#7dd3fc', selection: 'rgba(125,211,252,0.24)', caret: '#7dd3fc', rule: '#1c2a38'
    }
  },

  // ── Handwritten ─────────────────────────────────────────────────────────────
  // Script/marker headings over the more legible hands for body, tuned a touch
  // larger (they run small) across warm papers and dark boards.
  Notebook: {
    dark: false,
    fonts: { heading: 'Caveat', body: 'Kalam', ui: 'Inter' },
    measure: '48rem', scale: 1.1,
    tokens: {
      bg: '#fbfaf6', surface: '#ffffff', text: '#2a2d34', muted: '#7c808c',
      accent: '#2f5fd0', selection: 'rgba(47,95,208,0.16)', caret: '#2f5fd0', rule: '#e2e4ea'
    }
  },
  Sketchbook: {
    dark: false,
    fonts: { heading: 'Architects Daughter', body: 'Patrick Hand', ui: 'Inter' },
    measure: '48rem', scale: 1.1,
    tokens: {
      bg: '#eceae3', surface: '#f5f3ec', text: '#2c2b28', muted: '#78756c',
      accent: '#b5533b', selection: 'rgba(181,83,59,0.16)', caret: '#b5533b', rule: '#d7d3c8'
    }
  },
  Diary: {
    dark: false,
    fonts: { heading: 'Shadows Into Light Two', body: 'Indie Flower', ui: 'Inter' },
    measure: '48rem', scale: 1.1,
    tokens: {
      bg: '#fdf6e9', surface: '#fffaf0', text: '#33302a', muted: '#8a8272',
      accent: '#1f8a8a', selection: 'rgba(31,138,138,0.16)', caret: '#1f8a8a', rule: '#ece1cd'
    }
  },
  'Love Letter': {
    dark: false,
    fonts: { heading: 'Dancing Script', body: 'Kalam', ui: 'Inter' },
    measure: '48rem', scale: 1.1,
    tokens: {
      bg: '#fbf3ef', surface: '#fef8f5', text: '#3a2b2b', muted: '#9c8483',
      accent: '#b84a62', selection: 'rgba(184,74,98,0.16)', caret: '#b84a62', rule: '#ecd9d2'
    }
  },
  Marker: {
    dark: true,
    fonts: { heading: 'Permanent Marker', body: 'Gochi Hand', ui: 'Inter' },
    measure: '52rem', scale: 1.15,
    tokens: {
      bg: '#16181c', surface: '#1e2127', text: '#f2f3f0', muted: '#9aa0a6',
      accent: '#ffd23f', selection: 'rgba(255,210,63,0.22)', caret: '#ffd23f', rule: '#2c3036'
    }
  },
  Chalk: {
    dark: true,
    fonts: { heading: 'Gochi Hand', body: 'Patrick Hand', ui: 'Inter' },
    measure: '52rem', scale: 1.1,
    tokens: {
      bg: '#182420', surface: '#1f2c27', text: '#f4f1e8', muted: '#aeb8ac',
      accent: '#f6c453', selection: 'rgba(246,196,83,0.20)', caret: '#f6c453', rule: '#2e3d36'
    }
  },

  // ── Systems ─────────────────────────────────────────────────────────────────
  // Each carries a `skin`: theme.applyStyle sets data-skin on <html> and app.css
  // repaints the whole shell (chrome + desktop) to portray that vintage OS.
  'MS-DOS': {
    dark: true, skin: 'dos',
    fonts: { heading: 'PxPlus IBM VGA8', body: 'PxPlus IBM VGA8', ui: 'PxPlus IBM VGA8' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#0a0a0a', surface: '#000000', text: '#d2d2d2', muted: '#7a7a7a',
      accent: '#ffffff', selection: 'rgba(255,255,255,0.20)', caret: '#d2d2d2', rule: '#262626'
    }
  },
  'Commodore 64': {
    dark: true, skin: 'c64',
    fonts: { heading: 'C64 Pro Mono', body: 'C64 Pro Mono', ui: 'C64 Pro Mono' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#0000aa', surface: '#0000aa', text: '#7c78f8', muted: '#5a55d0',
      accent: '#aaaaff', selection: 'rgba(170,170,255,0.30)', caret: '#7878f8', rule: '#3535c7'
    }
  },
  'MacOS 1.0': {
    dark: false, skin: 'mac1',
    fonts: { heading: 'ChicagoFLF', body: 'ChicagoFLF', ui: 'ChicagoFLF' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#555555',
      accent: '#000000', selection: 'rgba(0,0,0,0.16)', caret: '#000000', rule: '#000000'
    }
  },
  'Classic MacOS': {
    dark: false, skin: 'macos',
    fonts: { heading: 'ChicagoFLF', body: 'ChicagoFLF', ui: 'ChicagoFLF' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#cfcfcf', surface: '#e4e4e4', text: '#000000', muted: '#565656',
      accent: '#2b2b9c', selection: 'rgba(43,43,156,0.22)', caret: '#000000', rule: '#7c7c7c'
    }
  },
  'Windows 95': {
    dark: false, skin: 'win95',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#c0c0c0', surface: '#c0c0c0', text: '#000000', muted: '#404040',
      accent: '#000080', selection: 'rgba(0,0,128,0.28)', caret: '#000000', rule: '#808080'
    }
  },
  'Amiga Workbench': {
    dark: false, skin: 'amiga',
    fonts: { heading: 'BigBlue Terminal', body: 'BigBlue Terminal', ui: 'BigBlue Terminal' },
    measure: '52rem', scale: 1,
    tokens: {
      bg: '#a6a6a6', surface: '#b2b2b2', text: '#000000', muted: '#33337a',
      accent: '#2b5db0', selection: 'rgba(43,93,176,0.26)', caret: '#000000', rule: '#000000'
    }
  },
  'Windows XP': {
    dark: false, skin: 'xp',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#ece9d8', surface: '#ffffff', text: '#000000', muted: '#5a5a5a',
      accent: '#2f6fd6', selection: 'rgba(47,111,214,0.24)', caret: '#000000', rule: '#aca899'
    }
  },
  'BeOS': {
    dark: false, skin: 'beos',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#d8d8d0', surface: '#eaeae2', text: '#000000', muted: '#555555',
      accent: '#2855b0', selection: 'rgba(40,85,176,0.22)', caret: '#000000', rule: '#888888'
    }
  },
  'NeXTSTEP': {
    dark: false, skin: 'next',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#dedede', surface: '#ffffff', text: '#000000', muted: '#666666',
      accent: '#26408b', selection: 'rgba(38,64,139,0.22)', caret: '#000000', rule: '#7a7a7a'
    }
  },
  'ZX Spectrum': {
    dark: true, skin: 'zx',
    fonts: { heading: 'BigBlue Terminal', body: 'BigBlue Terminal', ui: 'BigBlue Terminal' },
    measure: '56rem', scale: 1,
    tokens: {
      bg: '#000000', surface: '#000000', text: '#ffffff', muted: '#b0b0b0',
      accent: '#00d8d8', selection: 'rgba(0,216,216,0.28)', caret: '#ffffff', rule: '#303030'
    }
  },
  'Atari ST': {
    dark: false, skin: 'atari',
    fonts: { heading: 'PxPlus IBM VGA8', body: 'PxPlus IBM VGA8', ui: 'PxPlus IBM VGA8' },
    measure: '56rem', scale: 1,
    tokens: {
      bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#4a4a4a',
      accent: '#007000', selection: 'rgba(0,112,0,0.20)', caret: '#000000', rule: '#000000'
    }
  },
  'Amber CRT': {
    dark: true, skin: 'amber',
    fonts: { heading: 'PxPlus IBM VGA8', body: 'PxPlus IBM VGA8', ui: 'PxPlus IBM VGA8' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#140d00', surface: '#140d00', text: '#ffb000', muted: '#9a6a00',
      accent: '#ffcc44', selection: 'rgba(255,176,0,0.25)', caret: '#ffb000', rule: '#3a2600'
    }
  },
  'Green CRT': {
    dark: true, skin: 'green',
    fonts: { heading: 'PxPlus IBM VGA8', body: 'PxPlus IBM VGA8', ui: 'PxPlus IBM VGA8' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#001400', surface: '#001400', text: '#37ff6a', muted: '#1f9f3f',
      accent: '#7dff9e', selection: 'rgba(55,255,106,0.22)', caret: '#37ff6a', rule: '#063a16'
    }
  },
  'Teletext': {
    dark: true, skin: 'teletext',
    fonts: { heading: 'BigBlue Terminal', body: 'BigBlue Terminal', ui: 'BigBlue Terminal' },
    measure: '56rem', scale: 1,
    tokens: {
      bg: '#000000', surface: '#000000', text: '#ffffff', muted: '#a0a0a0',
      accent: '#ffff00', selection: 'rgba(255,255,0,0.25)', caret: '#ffffff', rule: '#222222'
    }
  },
  'Windows 3.1': {
    dark: false, skin: 'win31',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#c0c0c0', surface: '#c0c0c0', text: '#000000', muted: '#404040',
      accent: '#000080', selection: 'rgba(0,0,128,0.28)', caret: '#000000', rule: '#808080'
    }
  },
  'OS/2 Warp': {
    dark: false, skin: 'os2',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#cececa', surface: '#d6d6d0', text: '#000000', muted: '#45454a',
      accent: '#00337f', selection: 'rgba(0,51,127,0.24)', caret: '#000000', rule: '#7a7a7a'
    }
  },
  'IBM 3270': {
    dark: true, skin: 'i3270',
    fonts: { heading: 'BigBlue Terminal', body: 'BigBlue Terminal', ui: 'BigBlue Terminal' },
    measure: '60rem', scale: 1,
    tokens: {
      bg: '#051005', surface: '#051005', text: '#33cc33', muted: '#1f8f1f',
      accent: '#66ff66', selection: 'rgba(51,204,51,0.22)', caret: '#33cc33', rule: '#0d3a0d'
    }
  },
  'Solaris CDE': {
    dark: false, skin: 'cde',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#aeb6c2', surface: '#bcc4d0', text: '#000000', muted: '#3a4656',
      accent: '#33518a', selection: 'rgba(51,81,138,0.24)', caret: '#000000', rule: '#6a7688'
    }
  },
  'RISC OS': {
    dark: false, skin: 'riscos',
    fonts: { heading: 'Inter', body: 'Inter', ui: 'Inter' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#d7d7c8', surface: '#e8e8dc', text: '#000000', muted: '#555548',
      accent: '#005a9c', selection: 'rgba(0,90,156,0.22)', caret: '#000000', rule: '#8a8a7c'
    }
  },
  'GEOS': {
    dark: false, skin: 'geos',
    fonts: { heading: 'ChicagoFLF', body: 'ChicagoFLF', ui: 'ChicagoFLF' },
    measure: '46rem', scale: 1,
    tokens: {
      bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#555555',
      accent: '#000000', selection: 'rgba(0,0,0,0.16)', caret: '#000000', rule: '#000000'
    }
  }
}

// The style a fresh install opens with.
export const DEFAULT_STYLE = 'Poppins'

// Built-in styles grouped for the theme chooser. Every built-in name appears in
// exactly one category; a "Custom" tab is added at runtime for saved styles.
export const STYLE_CATEGORIES = {
  Coffee:     ['Espresso', 'Poppins', 'Unbounded', 'Unbounded Light'],
  BrewBalance:['BrewBalance Dark', 'BrewBalance Light', 'Mocha', 'Flat White', 'Matcha'],
  Modern:     ['Nordic', 'Onyx', 'Cobalt', 'Coral', 'Graphite'],
  Editorial:  ['Ink', 'Paper', 'Manuscript', 'Lora', 'Caslon', 'Magazine', 'Serif Noir', 'Column'],
  Vintage:    ['Sepia', 'Vintage Rose', 'Old Newsprint', 'Forest Vintage', 'Bordeaux'],
  'Art Deco': ['Gatsby', 'Deco Emerald', 'Champagne', 'Manhattan', 'Ruby Deco'],
  Lecture:    ['Lecture', 'Poppins Dark Blue', 'Unbounded Dark Blue', 'Chalkboard', 'Whiteboard', 'Seminar'],
  Typewriter: ['Special Elite', 'Special Elite Dark', 'Courier', 'Draft', 'Noir Type'],
  Retro:      ['Press Start 2P', 'GAMEBOY DMG', 'Terminal Green', 'Terminal Orange', 'Terminal Cyan', 'Synthwave', 'Miami'],
  'Vintage Gamer': ['Arcade Night', 'NES', 'SNES Purple', 'Sega Genesis', 'Amber Arcade'],
  'Modern Gamer':  ['Neon Grid', 'Cyber Violet', 'Toxic', 'Inferno', 'Frostbyte'],
  Handwritten:['Notebook', 'Sketchbook', 'Diary', 'Love Letter', 'Marker', 'Chalk'],
  Playful:    ['Lucy', 'Lucy Light', 'Poppins Candy Light', 'Orange'],
  Systems:    ['MS-DOS', 'Commodore 64', 'MacOS 1.0', 'Classic MacOS', 'Windows 95', 'Amiga Workbench', 'Windows XP', 'BeOS', 'NeXTSTEP',
               'ZX Spectrum', 'Atari ST', 'Amber CRT', 'Green CRT', 'Teletext', 'Windows 3.1', 'OS/2 Warp', 'IBM 3270', 'Solaris CDE', 'RISC OS', 'GEOS']
}

export const STYLE_NAMES = Object.keys(STYLES)

export function isBuiltin(name) {
  return Object.prototype.hasOwnProperty.call(STYLES, name)
}

// Deep clone a style so a custom copy never shares references with a built-in.
export function cloneStyle(style) {
  return {
    dark: style.dark,
    skin: style.skin,
    fonts: { ...style.fonts },
    measure: style.measure,
    scale: style.scale,
    tokens: { ...style.tokens }
  }
}
