# HardStone Portfolio — Build Plan

Concept: **a 90s gaming room**. Clean flat vector devices on a soft illustrated background.
Pixel art lives **only inside screens** (TV and beeper LCD) so the page never gets busy.

Stack: plain HTML + CSS + JavaScript, no frameworks, no build step.

---

## 1. Page structure

```
<header>   HardStone logo (SVG) + the 3 cartridges (the menu)
<main>
  §1 #room   Console (with face) + 2 controllers + CRT TV → TV screen shows the content
  §2 #desk   Beeper (contact form) + Discman
<footer>   tiny credits
```

- The **cartridges are the nav** ("My info", "Works", "Links"). They are real `<button>`s.
- Each section is a "stage" with a fixed `aspect-ratio`. Every device is positioned in % inside it,
  so the scene scales as one piece (container query units `cqi` for sizes and type).
- URL hash routing: `#info`, `#works`, `#links` → deep links and the back button work.

### Folder layout

```
web/
  index.html
  css/
    main.css          @layer order + imports
    tokens.css        palette, fonts, spacing, easing (CSS variables)
    base.css          reset, typography
    room.css          section 1 (stage, console, TV, cartridges)
    screen.css        CRT/pixel styles inside the TV
    desk.css          section 2 (beeper, discman)
  js/
    main.js           boot + hash router
    console-face.js   eyes follow the mouse, blinking, mouth states
    cartridge.js      fly-to-console + insert/eject animation
    tv.js             CRT power-off/on + content swap
    beeper.js         contact form step logic + send
    discman.js        lid / spinning disc / optional audio
  content/
    info.html  works.html  links.html   (HTML fragments injected into the TV, or <template>s)
  assets/
    svg/   (your exports)
    img/   backgrounds (AVIF + WebP)
    fonts/ (self-hosted woff2)
    pixel/ (small pixel sprites for inside the screens, PNG, image-rendering: pixelated)
```

---

## 2. SVG export checklist (please read before you export)

To animate parts (eyes, slot, buttons) I need **named groups** in the SVG.
In Illustrator, name the layers/groups as below, then **File → Export → Export As… → SVG** with:

| Setting | Value |
|---|---|
| Styling | **Presentation Attributes** (easiest to override from CSS) |
| Font | **Convert to Outlines** (logo, "INFO" label) |
| Images | none / Embed (avoid linked images) |
| Object IDs | **Layer Names** ← important |
| Decimal | 2 |
| Minify | off (I will optimize later) |
| Responsive | on |

One device per file, artboard trimmed tight to the object (**Object → Artboards → Fit to Artwork Bounds**).

| File | Groups I need named inside |
|---|---|
| `logo.svg` | — (outlined text) |
| `cartridge.svg` | `shell`, `label`, `shine` (I'll print the label text "INFO / WORKS / LINKS" in HTML/CSS on top, so one file is enough) |
| `console.svg` | `body`, `face`, `eye-left`, `eye-right`, `mouth`, `slot` (top opening), `port-1`, `port-2` |
| `controller-left.svg`, `controller-right.svg` | `body`, `dpad`, `buttons` |
| `cable-left.svg`, `cable-right.svg` | separate, so cables can sway a little |
| `tv.svg` | `frame`, `bezel`, `screen` (keep the grey rect — I read its position and put HTML over it), `label-info`, `knobs`, `power-led` |
| `beeper.svg` | `body`, `bezel`, `screen`, `btn-up`, `btn-ok`, `btn-down`, `btn-menu` |
| `discman.svg` | `body`, `lid`, `disc`, `buttons`, `display` (not designed yet?) |

If a mouth has more than one expression (smile / "o" / happy), export them as sibling groups
`mouth-smile`, `mouth-o`, `mouth-happy` — I'll toggle them.

---

## 3. Fonts

Found in your `.ai`: **Space Grotesk**, **Silkscreen**, Chalet.

| Role | Font | Why |
|---|---|---|
| UI, body text, headings outside screens | **Space Grotesk** (300–700, variable) | Required. Geometric, techy, readable |
| Short pixel labels (TV label, cartridge labels, beeper buttons, screen titles) | **Silkscreen** | Already in your design; very crisp at small sizes. Only for SHORT text |
| Long text *inside* the TV / beeper LCD | **VT323** | Terminal/CRT look but much more readable than Silkscreen in paragraphs |
| Alternative to VT323 | **Pixelify Sans** (variable) | Softer, more modern pixel look if VT323 feels too "terminal" |

All are free on Google Fonts (OFL). I'll **self-host woff2** with `font-display: swap` and
preload Space Grotesk + Silkscreen. Chalet is commercial → keep it out of the web build; the logo will be outlined SVG.
Avoid *Press Start 2P*: it would oversaturate the pixel feel you want to avoid.

---

## 4. Color palette (CSS variables)

Draft values read from your swatch board and screenshots. Only one SNES swatch (`#211A21`) was
readable from the `.ai` metadata, so once the SVGs arrive I'll pull the **exact fills** from them
and replace these.

```css
:root {
  /* Neutrals (col 1) */
  --gray-0:   #ffffff;  --gray-50:  #e8e8e8;  --gray-100: #d1d1d1;
  --gray-200: #bdbdbd;  --gray-300: #a6a6a6;  --gray-400: #8f8f8f;
  --gray-500: #787878;  --gray-600: #616161;  --gray-700: #4a4a4a;
  --gray-800: #383838;  --gray-900: #232323;  --gray-950: #111111;

  /* SNES console grey (warm) */
  --snes-gray-100: #f0eeee; --snes-gray-200: #dcdada; --snes-gray-300: #c4c2c2;
  --snes-gray-400: #a3a1a1; --snes-gray-500: #8a8888; --snes-gray-600: #6e6c6c;

  /* SNES red (A button) */
  --red-50:  #fce9e9; --red-200: #f2a5a5; --red-400: #e55454;
  --red-500: #de2121; --red-700: #a31818; --red-900: #4f0b0b;

  /* SNES purple / lavender (X-Y buttons) */
  --purple-50: #eeedf9; --lavender: #b3b0e3; --purple-300: #a39ddd;
  --purple-500: #5446b0; --purple-700: #352c74; --purple-900: #13102b;

  /* Plum darks (shadows, outlines) */
  --plum-900: #211a21; --plum-800: #2e262d; --plum-700: #4a434a;

  /* Device accents */
  --cart-yellow: #ffd200; --cart-yellow-dark: #e8b600; --cart-label: #73cff5;
  --tv-body: #1e1e1e;     --tv-bezel: #29292e;         --tv-screen-off: #8e8e8e;
  --beeper-body: #384240; --beeper-bezel: #1d2120;     --beeper-btn: #5b6467;
  --lcd-green: #5fa63f;   --lcd-ink: #1f3a14;

  /* Semantic tokens (what components use) */
  --color-bg: var(--plum-900);
  --color-ink: var(--gray-50);
  --color-accent: var(--red-500);
  --color-accent-2: var(--purple-500);
  --screen-glow: oklch(from var(--cart-label) l c h / 0.35);
  --shadow-soft: 0 1.5cqi 3cqi color-mix(in oklch, var(--plum-900) 45%, transparent);
}
```

Hover/pressed variants are generated with `color-mix()` / relative color syntax instead of extra hex values.

---

## 5. Interactions

### 5.1 Console face — eyes follow the mouse
- One `pointermove` listener on `window`, throttled with `requestAnimationFrame`.
- Vector from the face center to the pointer → normalized → pupils move max ~4px (`translate`), clamped inside the face.
- Idle: random **blink** every 3–6 s (`scaleY` keyframes on the eyes).
- Hovering a cartridge → eyes lock on it + mouth switches to "o" (excited). After insert → happy mouth for 1 s.
- Touch devices: eyes look at the last tap, then drift back to center.

### 5.2 Cartridge → console (the key animation)
Done with the **Web Animations API** + FLIP (measure → animate transforms only = smooth 60fps):

1. Click "Works". If another cartridge is in the console, it **ejects**: pops up, flips back and flies to its spot in the header.
2. Measure the clicked cartridge and the console `#slot` with `getBoundingClientRect()`.
3. Flight (~650 ms): arc path (CSS `offset-path` built in JS), slight rotation wobble, scale down to slot width.
4. Insert (~250 ms): cartridge drops **behind** the console body (it sits under the console in z-order) — exactly like your screenshot, leaving the top half visible.
5. Console reacts: small squash-bounce, power LED turns on, "click" sound (optional, off by default).
6. TV changes channel (5.3).

- `prefers-reduced-motion`: skip the flight, cartridge just fades into the slot, TV swaps with a simple crossfade.
- Keyboard: cartridges are focusable buttons with `aria-pressed`/`aria-controls="tv-screen"`; Enter/Space triggers the same animation.
- Clicks during an animation are queued (no broken states).

### 5.3 TV channel change (CRT effect)
- Power-off: content squashes to a horizontal white line → dot → black (`scale` keyframes + brightness).
- Swap content using a **same-document View Transition** (`document.startViewTransition`) with fallback.
- Power-on: static noise flash (tiny canvas or SVG `feTurbulence`, ~200 ms) → content expands.
- Always on: subtle scanlines (`repeating-linear-gradient`), slight vignette/curvature, faint flicker; all disabled under reduced motion.

### 5.4 TV screen content (the only place with pixel art)
| Cartridge | Screen concept |
|---|---|
| **My info** | "Character select / Player 1" card: pixel avatar, name, class "Designer", skills as HP/XP bars, short bio in VT323 |
| **Works** | "Level select" grid: project thumbnails as tiles, ▶ blinking cursor; selecting one opens a detail view (still inside the TV) with images + description + "Back (B)" |
| **Links** | "Options" menu: Behance, Dribbble, Instagram, LinkedIn, GitHub, Email, CV — ▶ cursor on hover |

Default (first load, no cartridge): "INSERT CARTRIDGE" blinking + the console face looking at the cartridges.
TV content scrolls inside the screen if needed (styled scrollbar).

### 5.5 Beeper = contact form
- The LCD shows the form in LCD style (Silkscreen labels, VT323 inputs, green screen with dark pixels).
- Step flow: `NAME → EMAIL → MESSAGE → SEND?`. Beeper buttons work: ▲/▼ move between steps, ● confirms, ▬ clears. Normal keyboard Tab/Enter also work (real `<form>`, real `<label>`s).
- On send: "SENDING…" animation, beeper **vibrates** (`translate` jitter) + "MSG SENT ✓".
- Validation messages appear as LCD text ("ERR: EMAIL?").
- Sending needs a service (no backend): **Web3Forms** or **Formspree** (free tier), or `mailto:` fallback. → *decision needed*.

### 5.6 Discman
- Click → lid opens, disc spins (`rotate` animation using `@property --spin`), small LCD shows track "01 — 00:42".
- Optional: plays a short chill loop (user-initiated only, volume low, pause button). → *decision needed*.

### 5.7 Section 2 entrance
- **Scroll-driven animations** (`animation-timeline: view()`): beeper and discman slide/rotate slightly into place as the desk scrolls in. Progressive enhancement (static in browsers without support).

---

## 6. Modern CSS used

- `@layer reset, tokens, base, components, utilities;`
- Native **CSS nesting**
- **Container queries** + `cqi` units for the scaling stage
- `oklch()`, `color-mix()`, **relative color syntax** for variants
- `@property` (typed custom properties so gradients/rotations animate)
- `:has()` (e.g. `body:has(.cart[aria-pressed="true"])` to style the room per section)
- **View Transitions** (TV swap), **scroll-driven animations** (desk entrance)
- `@starting-style` + `transition-behavior: allow-discrete` (Works detail popup)
- `offset-path` (cartridge flight arc), `text-wrap: balance`, `clamp()`
- `image-rendering: pixelated` for sprites inside screens

Everything degrades gracefully (feature queries `@supports`).

## 7. Responsive

- **Desktop**: logo + cartridges on top (like your artboard), TV big, console on top of the TV.
- **Tablet**: same composition, scaled through container units.
- **Mobile (< 600px)**: cartridges become a horizontal row (smaller), TV full width; flight animation shorter.
  Desk stacks: beeper on top, discman below. Eyes follow taps.

## 8. Performance & accessibility

- Inline SVGs for animated devices (console, cartridges, TV, beeper); static ones as `<img>`.
- Backgrounds in AVIF/WebP with `srcset`, ≤ 250 KB each, lazy-load the desk background.
- Run SVGs through SVGO (`svgomg` in the browser is fine — keep IDs!).
- Contrast-checked text, focus rings visible, `lang`, meta/OG tags, favicon (cartridge icon).

---

## 9. Background prompts

Generate both at **2560 × 1440 (16:9)**, then export AVIF/WebP. Keep them **soft and low-saturation**
so the vector devices stand out. The devices are NOT in the image — the prompts leave empty space for them.

### §1 — 90s gaming room

> Flat vector illustration of a cozy 1990s teenager's gaming bedroom in the evening, front view at eye level, symmetrical composition. In the center, a low wooden TV stand with an empty top, and a large plain empty wall area above it, reserved for a TV and game console added later. Around the edges only: posters of fictional retro video games (no readable text), a wall shelf with game boxes and cassette tapes, a glowing lava lamp, a potted plant, a beanbag chair on a patterned carpet, a window with half-closed blinds letting in warm orange sunset light, string of small lights. Clean flat shapes with soft gradients and subtle paper grain, muted desaturated palette of warm greys, dusty lavender, soft purple and muted red, deep plum shadows (#211A21). Gentle vignette, slightly darker edges, calm nostalgic mood. No TV, no game console, no people, no text, no logos. 16:9, 2560x1440.

### §2 — Desk for beeper and discman

> Flat vector illustration, top-down bird's-eye view of a 1990s wooden desk surface, muted and calm. Objects only around the borders: a spiral notebook with doodles, pencils and an eraser, a cassette tape, a stack of CD jewel cases, foam headphones with a coiled cable, sticky notes, a few retro stickers, a mug of coffee, a small keychain virtual pet. Two large clear empty areas on the desk: one at left-center (for a pager) and one at right-center (for a portable CD player). Soft warm lamp light from top-left with gentle long shadows, subtle wood grain, slightly desaturated palette of warm greys, dusty lavender, soft purple and muted red, deep plum shadows (#211A21). Clean flat shapes with soft gradients and light paper grain. No pager, no CD player, no hands, no people, no text, no logos. 16:9, 2560x1440.

Tips: if the generator adds a TV/pager anyway, add "empty space" to a negative prompt
(`tv, television, monitor, pager, cd player, text, watermark, people`). A darker top edge on the
desk image lets §1 blend into §2 with a gradient.

---

## 10. Build phases

1. **Scaffold** — folders, `index.html`, tokens, fonts, layers. Placeholder boxes for devices.
2. **Room layout** — place your SVGs in the stage, responsive scaling.
3. **Console face** — eye tracking, blink, mouth states.
4. **Cartridge animation** — fly, insert, eject, routing, reduced motion.
5. **TV** — CRT styles, power-off/on, 3 screens' content (with your real text/projects).
6. **Desk** — beeper form + sending, discman.
7. **Polish** — backgrounds, sounds (optional), scroll animations, SVGO, a11y + Lighthouse pass, cross-browser check.

## 11. Decisions

1. **Contact form sending**: `mailto:` for now; swap to a form service later (one function in `js/beeper.js`).
2. **Discman**: plays music. Tracks listed in `js/discman.js` → files in `web/assets/audio/` (royalty-free / your own).
3. **Sounds**: yes, synthesized with the Web Audio API (no audio files), muted by default with a toggle.
4. **Works**: first 9 projects from https://www.behance.net/hardstonepaul, data in `js/works-data.js` so more can be added.
5. **Discman art**: you're drawing it; a simple placeholder SVG is used until then.
