# HardStone · Portfolio

Portfolio of **Paul Suarez (HardStone)**, Design Engineer, Front-End Artist and eCommerce Specialist from Bogotá, Colombia.

It's a **90s gaming room** built with plain HTML, CSS and JavaScript: no frameworks and no build step.

**Live:** https://jowui.com/hardstone/

## What's inside

**The room (menu + content)**
- The menu is three cartridges. Click one and it flies into the console, the console bounces, and the CRT TV switches channel (power-off line, static, power-on).
- The console has a face: the eyes follow the cursor (and the flying cartridge), blink, and the mouth reacts.
- The controllers hang from cables drawn live in JS. They swing away from a nearby cursor, bounce when clicked and hop when a cartridge goes in.
- While the console is empty, the cartridges hop in turn and the console says "Pick a game!".
- The TV screens are the only pixel art:
  - **My info** is a player card (stats, skills, achievements, quest log).
  - **Works** is a level-select grid of Behance projects, with a view transition into each project.
  - **Links** is an options menu.
- Deep links work: `#info`, `#works`, `#links`. Back and forward too.

**The desk**
- **Beeper:** the contact form, one field per page on the green LCD, driven by the beeper's own buttons. It posts to `contact.php` (PHP `mail()`, with a spam trap and a rate limit). Without PHP, it falls back to `mailto:`.
- **Discman:** a music player. The CD spins under the clear lid and the LCD lights up. With no tracks configured, it plays a synthesized lo-fi demo loop.

**Sound:** all effects are synthesized with the Web Audio API (no audio files). They're on by default, with a toggle.

**Accessibility**
- Real buttons and form fields.
- Keyboard navigation (arrow keys in the Works grid, Esc to go back).
- Screen-reader announcements on channel change.
- Respects `prefers-reduced-motion`.

## Modern CSS used

`@layer` · native nesting · container queries and `cqi` units · `oklch()`, `color-mix()` and relative colour syntax · `@property` · `subgrid` · `:has()` · `:user-invalid` · View Transitions · scroll-driven animations · `linear()` easing · `field-sizing` · `caret-shape` · `text-wrap: balance / pretty`

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:5173.

Opening `index.html` directly (`file://`) does **not** work. Browsers block JS modules and `fetch()` on local files, so the page needs a server. `tools/serve.mjs` is a tiny zero-dependency static server.

## Deploy

Upload the **contents of `web/`** to any static host (Apache, Nginx, Netlify, …). That folder is the whole site.

`web/.htaccess` adds compression and caching on Apache. It's a hidden file, so make sure your FTP client or File Manager uploads it.

The contact form needs PHP with `mail()` enabled. The recipient and sender addresses are constants at the top of `web/contact.php`.

## Project structure

```
web/
  index.html          page + TV screen templates (edit texts here)
  .htaccess           Apache compression + caching
  contact.php         contact form endpoint (PHP mail)
  css/
    main.css          @layer order + imports
    tokens.css        palette, fonts, backgrounds
    base.css          reset, base styles
    room.css          §1 room: stage, cartridges, console, controllers, TV, table
    screen.css        everything inside the CRT
    desk.css          §2 desk: beeper, discman
  js/
    main.js           boot
    svg.js            inlines SVG files, positions parts
    cartridges.js     menu, flight animation, routing, invite
    face.js           console eyes and mouth
    cables.js         live cables + controller physics
    tv.js             CRT effects and screens
    beeper.js         contact form
    discman.js        music player + demo synth
    sfx.js            synthesized sound effects
    pixel.js          tiny pixel sprites for the screens
    config.js         contact email + links
    works-data.js     projects on the Works cartridge
  assets/
    svg/              device artwork (Illustrator exports)
    img/              room and desk backgrounds
tools/serve.mjs       local dev server
PLAN.md               design plan, SVG export guide, background prompts
design elements.ai    source artwork (Adobe Illustrator)
```

## Customise

| What | Where |
|---|---|
| My info / Links texts | `<template>`s at the bottom of `web/index.html` |
| Projects (add more objects to extend the grid) | `web/js/works-data.js` |
| Contact email, social links | `web/contact.php` (recipient) and `web/js/config.js` (links, mailto fallback) |
| Music tracks | `TRACKS` in `web/js/discman.js` (files in `web/assets/audio/`) |
| Colours, fonts, backgrounds | `web/css/tokens.css` |
| Artwork | `web/assets/svg/`: same file names; positions use `data-box` attributes in `index.html` (see `PLAN.md` §2) |

## Credits

- Design and artwork: Paul Suarez (HardStone).
- Fonts: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), [Silkscreen](https://fonts.google.com/specimen/Silkscreen), [VT323](https://fonts.google.com/specimen/VT323) (SIL Open Font License, via Google Fonts).
- Project covers: from [Behance](https://www.behance.net/hardstonepaul).

## License

- **Code** (HTML, CSS, JavaScript, PHP, tooling): [MIT](LICENSE). Keep the copyright notice.
- **Artwork and content** (SVGs, images, `.ai` file, texts): [CC BY 4.0](LICENSE-ASSETS.md). Reuse freely with credit to **Paul Suarez (HardStone)**.
