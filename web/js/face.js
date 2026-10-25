// The console's face: eyes follow the pointer (or a target element), blink, change mood.
// Eyes and mouth are separate exports (eye-left/right.svg, mouth.svg) placed over
// console.svg by their data-box; CSS reads --look-x / --look-y from the face layer.
import { placeByBox } from './svg.js';

export function createFace(consoleEl) {
  const svg = consoleEl.querySelector('.console-face');
  placeByBox(svg, consoleEl.querySelector('.console-art svg'));
  const eyes = [...svg.querySelectorAll('.face-eye')];
  let pointer = null;
  let target = null;
  let raf = 0;
  let moodTimer = 0;

  // Eye centre as a fraction of the SVG box, measured once before the eyes move
  const eyeAnchor = (() => {
    const box = svg.getBoundingClientRect();
    if (!eyes.length || !box.width) return { x: 0.5, y: 0.5 };
    const rects = eyes.map((e) => e.getBoundingClientRect());
    const cx = rects.reduce((s, r) => s + r.left + r.width / 2, 0) / rects.length;
    const cy = rects.reduce((s, r) => s + r.top + r.height / 2, 0) / rects.length;
    return { x: (cx - box.left) / box.width, y: (cy - box.top) / box.height };
  })();

  function update() {
    raf = 0;
    let p = pointer;
    if (target) {
      const r = target.getBoundingClientRect();
      p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      schedule(); // keep tracking moving targets (the flying cartridge)
    }
    if (!p) return;
    const box = svg.getBoundingClientRect();
    const dx = p.x - (box.left + eyeAnchor.x * box.width);
    const dy = p.y - (box.top + eyeAnchor.y * box.height);
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dist / 240);
    svg.style.setProperty('--look-x', ((dx / dist) * k).toFixed(3));
    svg.style.setProperty('--look-y', ((dy / dist) * k).toFixed(3));
  }

  function schedule() {
    raf ||= requestAnimationFrame(update);
  }

  const onPointer = (e) => { pointer = { x: e.clientX, y: e.clientY }; schedule(); };
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });
  addEventListener('scroll', schedule, { passive: true });

  function blink() {
    svg.classList.add('is-blinking');
    setTimeout(() => svg.classList.remove('is-blinking'), 140);
  }

  (function blinkLoop() {
    setTimeout(() => {
      if (!document.hidden) {
        blink();
        if (Math.random() < 0.2) setTimeout(blink, 260); // the occasional double blink
      }
      blinkLoop();
    }, 2400 + Math.random() * 3600);
  })();

  return {
    // Look at an element until watch(null)
    watch(el) {
      target = el;
      schedule();
    },
    // 'smile' | 'o' | 'happy'; optional duration returns to smile afterwards
    mood(name, ms) {
      clearTimeout(moodTimer);
      consoleEl.dataset.mood = name;
      if (ms) moodTimer = setTimeout(() => { consoleEl.dataset.mood = 'smile'; }, ms);
    },
    blink,
  };
}
