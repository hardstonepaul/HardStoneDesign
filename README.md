# HardStoneDesign
HardStone web Portfolio — a 90s gaming room in plain HTML, CSS and JavaScript (no frameworks).

## Run locally

```bash
node tools/serve.mjs
```

Then open http://localhost:5173. A server is needed because the SVGs are inlined with `fetch()`.

## Where things live

- `web/assets/svg/` — device artwork. Drop your Illustrator exports here with the same file names and group ids (see `PLAN.md` §2).
- `web/index.html` — TV screen texts (`<template>`s at the bottom).
- `web/js/works-data.js` — projects on the Works cartridge.
- `web/js/config.js` — contact email and social links.
- `web/js/discman.js` — music tracks (`TRACKS`).
- `web/css/tokens.css` — color palette, fonts, backgrounds.
