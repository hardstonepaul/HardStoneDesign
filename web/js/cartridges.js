// The menu: cartridges fly into the console, the console reacts, the TV changes channel.
import { markerBox, setBoxVars } from './svg.js';
import { sfx } from './sfx.js';

const IDS = ['info', 'works', 'links'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const fromHash = () => (IDS.includes(location.hash.slice(1)) ? location.hash.slice(1) : null);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function initCartridges({ stage, face, tv, cables }) {
  const buttons = new Map([...stage.querySelectorAll('.cart')].map((b) => [b.dataset.cart, b]));
  const consoleEl = stage.querySelector('.console');
  const consoleArt = consoleEl.querySelector('.console-art');
  const slotCart = consoleEl.querySelector('.slot-cart');

  // Label area of the cartridge art and the slot position on the console
  // (named groups win; otherwise data-box-label / data-box-slot on the stage / console)
  setBoxVars(stage, 'label', markerBox(stage.querySelector('.cart-art svg'), 'label', stage));
  setBoxVars(consoleEl, 'slot', markerBox(consoleArt.querySelector('svg'), 'slot', consoleEl));

  let current = null; // cartridge in the console
  let wanted;         // last requested cartridge (null = none)
  let busy = false;

  const rel = (el) => {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height / 2 };
  };

  // Cartridge clone flying between two elements (shelf ↔ console)
  async function fly(fromEl, toEl, { back = false } = {}) {
    const from = rel(fromEl);
    const to = rel(toEl);
    const clone = document.createElement('div');
    clone.className = 'flying-cart';
    clone.innerHTML = fromEl.closest('.cart-body')?.outerHTML ?? fromEl.outerHTML;
    clone.style.cssText = `left:${from.x}px; top:${from.y}px; inline-size:${fromEl.offsetWidth}px`;
    stage.append(clone);
    face.watch(clone);

    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const lift = Math.max(40, Math.abs(dy) * 0.6);
    const scale = toEl.offsetWidth / fromEl.offsetWidth;
    const endRotate = back ? 0 : -6;
    const animation = clone.animate([
      { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
      { transform: `translate(${dx * 0.45}px, ${Math.min(0, dy) * 0.45 - lift}px) rotate(${back ? 12 : -16}deg) scale(1.14)`, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${endRotate}deg) scale(${scale})` },
    ], { duration: reducedMotion.matches ? 1 : 620, easing: 'cubic-bezier(.45,.05,.3,1)' });
    await animation.finished;
    clone.remove();
    face.watch(null);
  }

  async function insert(id) {
    const btn = buttons.get(id);
    const art = btn.querySelector('.cart-art');
    btn.setAttribute('aria-pressed', 'true');
    sfx.select();
    face.mood('o');

    // Prepare the console cartridge in its "above the slot" position, invisible, to measure it
    slotCart.querySelector('.cart-label').textContent = btn.querySelector('.cart-label').textContent;
    slotCart.dataset.cart = id;
    slotCart.hidden = false;
    slotCart.style.visibility = 'hidden';
    slotCart.style.transition = 'none';
    slotCart.style.translate = '-50% -58%';

    await fly(art, slotCart.querySelector('.cart-art'));

    slotCart.style.visibility = '';
    await slotCart.animate(
      [{ translate: '-50% -58%' }, { translate: '-50% 26%' }],
      { duration: reducedMotion.matches ? 1 : 200, easing: 'cubic-bezier(.55,0,.8,.2)' },
    ).finished;
    slotCart.style.translate = '';
    slotCart.style.transition = '';

    sfx.insert();
    consoleEl.classList.add('is-on');
    if (!reducedMotion.matches) {
      for (const layer of consoleEl.querySelectorAll('.console-art, .console-face')) {
        layer.animate([
          { scale: '1 1' }, { scale: '1.04 0.9' }, { scale: '0.98 1.04' }, { scale: '1 1' },
        ], { duration: 380, easing: 'ease-out' });
      }
    }
    face.mood('happy', 1400);
    cables?.kick();
    current = id;
    await tv.show(id);
  }

  async function eject() {
    const btn = buttons.get(current);
    sfx.eject();
    face.mood('o', 900);
    consoleEl.classList.remove('is-on');
    const tvOff = tv.off();
    slotCart.style.transition = 'none';
    await slotCart.animate(
      [{ translate: '-50% 26%' }, { translate: '-50% -58%' }],
      { duration: reducedMotion.matches ? 1 : 230, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'forwards' },
    ).finished;

    const flight = fly(slotCart.querySelector('.cart-art'), btn.querySelector('.cart-art'), { back: true });
    slotCart.getAnimations().forEach((a) => a.cancel());
    slotCart.hidden = true;
    slotCart.style.translate = '';
    slotCart.style.transition = '';
    await flight;
    btn.setAttribute('aria-pressed', 'false');
    current = null;
    await tvOff;
  }

  // ───── Invite: while the console is empty, the cartridges hop in turn and the console asks ─────
  const shelf = stage.querySelector('.cart-shelf');
  const bubble = stage.querySelector('.console-bubble');
  const HOP_EVERY = 3200; // = cart-invite animation length in room.css (hop at ~72%)
  let inviteTimer = 0;
  let lookTimer = 0;
  let hovering = false;

  function setInvite(on) {
    clearTimeout(inviteTimer);
    clearTimeout(lookTimer);
    shelf.classList.toggle('is-inviting', on);
    bubble.classList.toggle('is-visible', on);
    if (!on) return;
    // The console glances up at the shelf each time the cartridges hop
    lookTimer = setTimeout(function glance() {
      if (!hovering && !busy) {
        const free = [...buttons.values()].filter((b) => b.getAttribute('aria-pressed') === 'false');
        face.watch(free[Math.floor(free.length / 2)]);
        face.mood('o');
        setTimeout(() => {
          if (hovering || busy) return;
          face.watch(null);
          face.mood('smile');
        }, 1100);
      }
      lookTimer = setTimeout(glance, HOP_EVERY);
    }, HOP_EVERY * 0.7);
  }

  function inviteSoon() {
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => { if (!current && !busy) setInvite(true); }, 2500);
  }

  async function run() {
    busy = true;
    setInvite(false);
    while (wanted !== undefined && wanted !== current) {
      const next = wanted;
      if (current) await eject();
      if (next) await insert(next);
      else await tv.show('boot');
      if (wanted === next) wanted = undefined;
    }
    wanted = undefined;
    busy = false;
    if (!current) inviteSoon();
  }

  function request(id, { push = true } = {}) {
    wanted = id;
    if (push && fromHash() !== id) history.pushState(null, '', id ? `#${id}` : location.pathname + location.search);
    if (!busy) run();
  }

  for (const [id, btn] of buttons) {
    btn.addEventListener('click', () => request(btn.getAttribute('aria-pressed') === 'true' ? null : id));
    const look = () => {
      hovering = true;
      if (busy || btn.getAttribute('aria-pressed') === 'true') return;
      face.watch(btn);
      face.mood('o');
      sfx.hover();
    };
    const unlook = () => {
      hovering = false;
      if (busy) return;
      face.watch(null);
      face.mood('smile');
    };
    btn.addEventListener('pointerenter', look);
    btn.addEventListener('focus', look);
    btn.addEventListener('pointerleave', unlook);
    btn.addEventListener('blur', unlook);
  }

  slotCart.addEventListener('click', () => request(null));
  addEventListener('popstate', () => request(fromHash(), { push: false }));

  // Deep link (#works…) → insert after a short beat; otherwise "insert cartridge"
  tv.show('boot', { instant: true });
  const start = fromHash();
  if (start) wait(500).then(() => request(start, { push: false }));
  else inviteSoon();
}
