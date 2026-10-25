// Cables between the console and the controllers, drawn live so they can move.
// The controllers hang from their cables: they swing away from a nearby cursor,
// bounce when clicked and hop when a cartridge goes in. The cables follow with a lag.
import { sfx } from './sfx.js';

const VIEW_W = 521; // width of the .cables viewBox = stage units
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const nums = (s) => s.trim().split(/[\s,]+/).map(Number);
const r1 = (n) => Math.round(n * 10) / 10;

// Damped spring step: underdamped on purpose, so things wobble a little
function step(o, key, target, stiffness, damping, dt) {
  const v = `v${key}`;
  o[v] += ((target - o[key]) * stiffness - o[v] * damping) * dt;
  o[key] += o[v] * dt;
}

// Port → dip (lying on the TV) → peak (arching up) → controller plug, entering from above
function cablePath(a, b, lag, sway) {
  const dx = b.x - a.x;
  const dir = Math.sign(dx) || 1;
  const dip = { x: a.x + dx * 0.25 + lag.x * 0.3, y: a.y + 55 + lag.y * 0.3 };
  const peak = { x: a.x + dx * 0.86 + lag.x * 0.8, y: a.y - 18 + lag.y * 0.8 + sway };
  return [
    `M${r1(a.x)} ${r1(a.y)}`,
    `C${r1(a.x)} ${r1(a.y + 32)} ${r1(dip.x - dir * 32)} ${r1(dip.y + 3)} ${r1(dip.x)} ${r1(dip.y)}`,
    `C${r1(dip.x + dir * 40)} ${r1(dip.y - 5)} ${r1(peak.x - dir * 36)} ${r1(peak.y - 17)} ${r1(peak.x)} ${r1(peak.y)}`,
    `C${r1(peak.x + dir * 24)} ${r1(peak.y + 12)} ${r1(b.x)} ${r1(b.y - 38)} ${r1(b.x)} ${r1(b.y)}`,
  ].join(' ');
}

export function initCables(stage) {
  const consoleSvg = stage.querySelector('.console-art svg');
  const ports = nums(stage.querySelector('.console').dataset.ports); // in console.svg units
  const paths = [...stage.querySelectorAll('.cables path')];
  const sides = [...stage.querySelectorAll('.controller')].map((el, i) => ({
    el,
    svg: el.querySelector('svg'),
    plug: nums(el.dataset.plug), // in the controller's viewBox units
    port: [ports[i * 2], ports[i * 2 + 1]],
    path: paths[i],
    dir: i === 0 ? -1 : 1,
    body: { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 }, // px, px, deg
    lag: { x: 0, y: 0, vx: 0, vy: 0 },               // stage units
    phase: i * 2.1,
  }));
  let pointer = null;
  let running = false;
  let last = 0;

  const toStage = (svg, x, y) => {
    const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
    const s = stage.getBoundingClientRect();
    const k = VIEW_W / s.width;
    return { x: (p.x - s.left) * k, y: (p.y - s.top) * k };
  };

  function draw(t = 0) {
    const k = VIEW_W / stage.getBoundingClientRect().width;
    for (const s of sides) {
      const a = toStage(consoleSvg, ...s.port);
      const b = toStage(s.svg, ...s.plug);
      const sway = reducedMotion.matches ? 0 : Math.sin(t * 1.2 + s.phase) * 1.6;
      s.path.setAttribute('d', cablePath(a, b, { x: s.lag.x, y: s.lag.y }, sway));
      s.k = k;
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
    last = now;

    for (const s of sides) {
      const rect = s.el.getBoundingClientRect();
      let tx = 0;
      let ty = 0;
      let tr = 0;
      if (pointer) {
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        const reach = rect.width * 1.2;
        if (dist < reach) {
          const f = (1 - dist / reach) ** 2;
          const push = f * rect.width * 0.3;
          tx = (dx / dist) * push;
          ty = (dy / dist) * push * 0.5;
          // Hanging from the plug: pushed left → bottom swings left (clockwise)
          tr = -(dx / dist) * f * 18;
        }
      }
      const b = s.body;
      step(b, 'x', tx, 120, 9, dt);
      step(b, 'y', ty, 120, 9, dt);
      step(b, 'r', tr, 90, 6, dt);
      s.el.style.setProperty('--dx', `${b.x.toFixed(2)}px`);
      s.el.style.setProperty('--dy', `${b.y.toFixed(2)}px`);
      s.el.style.setProperty('--dr', `${b.r.toFixed(2)}deg`);

      // The middle of the cable trails behind the controller
      const k = s.k ?? 1;
      step(s.lag, 'x', b.x * k, 40, 5, dt);
      step(s.lag, 'y', b.y * k, 40, 5, dt);
    }
    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (reducedMotion.matches) on = false;
    if (on === running) return;
    running = on;
    last = 0;
    if (on) requestAnimationFrame(frame);
  }

  addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener('pointerdown', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer = null; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });

  // Boop: clicking a controller makes it jump
  for (const s of sides) {
    s.el.addEventListener('pointerdown', () => {
      s.body.vy -= 320;
      s.body.vr += s.dir * -140;
      sfx.click();
      navigator.vibrate?.(25);
    });
  }

  // Animate only while the room is on screen; redraw statically on resize
  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting)).observe(stage);
  new ResizeObserver(() => { if (!running) draw(); }).observe(stage);
  draw();

  return {
    // Both controllers hop (cartridge inserted)
    kick(strength = 1) {
      for (const s of sides) {
        s.body.vy -= 240 * strength;
        s.body.vr += s.dir * -80 * strength;
      }
    },
  };
}
