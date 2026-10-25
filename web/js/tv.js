// CRT TV: power off/on effect, static noise, and the screens for each cartridge.
import { partBox, setBoxVars } from './svg.js';
import { fillSprites } from './pixel.js';
import { sfx } from './sfx.js';
import { WORKS } from './works-data.js';
import { CONFIG } from './config.js';

const CHANNELS = { boot: 'AV', info: 'CH 01 · INFO', works: 'CH 02 · WORKS', links: 'CH 03 · LINKS' };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const html = (strings, ...values) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = String.raw(strings, ...values.map((v) => String(v).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)));
  return tpl.content;
};

export function createTV(tvEl) {
  const screen = tvEl.querySelector('.tv-screen');
  const inner = screen.querySelector('.tv-inner');
  const body = screen.querySelector('.screen-body');
  const osd = screen.querySelector('.screen-osd');
  const canvas = screen.querySelector('.tv-static');
  const status = document.getElementById('sr-status');
  let offAnimation = null;

  setBoxVars(tvEl, 'screen', partBox(tvEl.querySelector('.tv-art svg'), 'screen'));

  // ───── Screens ─────
  const screens = {
    boot: () => document.getElementById('tpl-boot').content.cloneNode(true),
    info: () => document.getElementById('tpl-info').content.cloneNode(true),
    links: linksScreen,
    works: worksScreen,
  };

  function linksScreen() {
    const frag = document.getElementById('tpl-links').content.cloneNode(true);
    const list = frag.querySelector('.link-list');
    for (const { label, url } of CONFIG.links.filter((l) => l.url)) {
      list.append(html`<li><a href="${url}" target="_blank" rel="noopener">${label}<small>${new URL(url).hostname.replace('www.', '')}</small></a></li>`);
    }
    list.append(html`<li><a href="#contact" data-contact>Page me<small>contact form</small></a></li>`);
    list.querySelector('[data-contact]').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('contact').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => document.getElementById('f-name').focus({ preventScroll: true }), 500);
    });
    list.addEventListener('pointerover', (e) => { if (e.target.closest('a')) sfx.hover(); });
    return frag;
  }

  function worksScreen() {
    const frag = html`
      <section class="works" aria-label="Works">
        <div class="works-head">
          <div><p class="screen-kicker">Level select</p><h2 class="screen-title">Works</h2></div>
          <p class="screen-kicker" style="color: var(--screen-dim)">${WORKS.length} levels</p>
        </div>
        <ul class="work-grid" role="list"></ul>
        <div class="works-foot">
          <p class="work-now" aria-hidden="true">${WORKS[0]?.title ?? ''}</p>
          <a class="screen-link" href="${CONFIG.behance}" target="_blank" rel="noopener">More on Behance ▶</a>
        </div>
      </section>`;
    const grid = frag.querySelector('.work-grid');
    const now = frag.querySelector('.work-now');

    WORKS.forEach((work, i) => {
      const level = `${Math.floor(i / 3) + 1}-${(i % 3) + 1}`;
      grid.append(html`
        <li><button class="work-tile" type="button" data-index="${i}" aria-label="${work.title}">
          <img src="${work.cover}" alt="" loading="lazy" decoding="async" width="404" height="316">
          <span class="work-num" aria-hidden="true">${level}</span>
        </button></li>`);
    });

    const tiles = () => [...grid.querySelectorAll('.work-tile')];
    const preview = (tile) => { now.textContent = WORKS[tile.dataset.index].title; };

    grid.addEventListener('pointerover', (e) => {
      const tile = e.target.closest('.work-tile');
      if (tile && now.textContent !== WORKS[tile.dataset.index].title) { preview(tile); sfx.hover(); }
    });
    grid.addEventListener('focusin', (e) => { const tile = e.target.closest('.work-tile'); if (tile) preview(tile); });
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.work-tile');
      if (tile) openWork(Number(tile.dataset.index), tile.querySelector('img'));
    });

    // Arrow keys move the cursor like a game menu
    grid.addEventListener('keydown', (e) => {
      const all = tiles();
      const i = all.indexOf(document.activeElement);
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key];
      if (i < 0 || !step) return;
      e.preventDefault();
      const next = all[i + step];
      if (next) { next.focus(); sfx.hover(); }
    });

    return frag;
  }

  function workDetail(i) {
    const work = WORKS[i];
    const frag = html`
      <article class="work-detail">
        <div class="actions"><button class="screen-btn" type="button" data-back>◀ Back</button></div>
        <img class="work-cover" src="${work.cover}" alt="${work.title} cover">
        <div>
          <p class="screen-kicker">Level ${Math.floor(i / 3) + 1}-${(i % 3) + 1}</p>
          <h2 class="screen-title">${work.title}</h2>
          <p class="tags">${work.tags.map((t) => `#${t}`).join(' ')}</p>
        </div>
        <div class="actions"><a class="screen-link" href="${work.url}" target="_blank" rel="noopener">View on Behance ▶</a></div>
      </article>`;
    frag.querySelector('[data-back]').addEventListener('click', () => closeWork(i));
    return frag;
  }

  // Grid ↔ detail with a view transition: the thumbnail morphs into the cover
  function swap(update, morphFrom) {
    if (!document.startViewTransition || reducedMotion.matches) { update(); return; }
    if (morphFrom) morphFrom.style.viewTransitionName = 'work-cover';
    document.startViewTransition(() => {
      if (morphFrom) morphFrom.style.viewTransitionName = '';
      update();
    });
  }

  function openWork(i, img) {
    sfx.select();
    swap(() => {
      body.replaceChildren(workDetail(i));
      body.scrollTop = 0;
      body.querySelector('[data-back]').focus({ preventScroll: true });
    }, img);
  }

  function closeWork(i) {
    sfx.back();
    const cover = body.querySelector('.work-cover');
    if (cover) cover.style.viewTransitionName = '';
    const update = () => {
      body.replaceChildren(worksScreen());
      const tile = body.querySelector(`.work-tile[data-index="${i}"]`);
      tile?.querySelector('img').style.setProperty('view-transition-name', 'work-cover');
      tile?.focus({ preventScroll: true });
      tile?.scrollIntoView({ block: 'nearest' });
      requestAnimationFrame(() => requestAnimationFrame(() => tile?.querySelector('img').style.removeProperty('view-transition-name')));
    };
    if (!document.startViewTransition || reducedMotion.matches) { update(); return; }
    if (cover) cover.style.viewTransitionName = 'work-cover';
    document.startViewTransition(update);
  }

  screen.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape' || e.key === 'Backspace') && body.querySelector('[data-back]') && e.target.localName !== 'input') {
      e.preventDefault();
      body.querySelector('[data-back]').click();
    }
  });

  // ───── CRT effects ─────
  function render(name) {
    body.replaceChildren(screens[name]());
    body.scrollTop = 0;
    fillSprites(body);
    osd.textContent = CHANNELS[name];
    osd.classList.remove('is-visible');
    void osd.offsetWidth; // restart the OSD animation
    osd.classList.add('is-visible');
    status.textContent = name === 'boot' ? 'Insert a cartridge' : `Now showing: ${name}`;
  }

  function staticNoise(ms) {
    if (reducedMotion.matches) return Promise.resolve();
    const c2d = canvas.getContext('2d');
    const img = c2d.createImageData(canvas.width, canvas.height);
    const end = performance.now() + ms;
    screen.classList.add('is-static');
    return new Promise((resolve) => {
      (function frame(now) {
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v * 1.05; img.data[i + 3] = 255;
        }
        c2d.putImageData(img, 0, 0);
        if (now < end) requestAnimationFrame(frame);
        else { screen.classList.remove('is-static'); resolve(); }
      })(performance.now());
    });
  }

  async function off() {
    if (offAnimation) return;
    sfx.crtOff();
    tvEl.classList.remove('is-on');
    offAnimation = inner.animate([
      { transform: 'scale(1, 1)', filter: 'brightness(1)' },
      { transform: 'scale(1, 0.006)', filter: 'brightness(4)', offset: 0.6 },
      { transform: 'scale(0, 0.006)', filter: 'brightness(8)' },
    ], { duration: reducedMotion.matches ? 1 : 320, easing: 'ease-in', fill: 'forwards' });
    await offAnimation.finished;
  }

  async function on(name) {
    render(name);
    tvEl.classList.add('is-on');
    await staticNoise(200);
    sfx.crtOn();
    const anim = inner.animate([
      { transform: 'scale(0, 0.006)', filter: 'brightness(8)' },
      { transform: 'scale(1, 0.006)', filter: 'brightness(4)', offset: 0.35 },
      { transform: 'scale(1, 1)', filter: 'brightness(1)' },
    ], { duration: reducedMotion.matches ? 1 : 380, easing: 'ease-out' });
    offAnimation?.cancel();
    offAnimation = null;
    await anim.finished;
  }

  return {
    off,
    async show(name, { instant = false } = {}) {
      if (instant) { render(name); tvEl.classList.add('is-on'); return; }
      await off();
      await on(name);
    },
  };
}
