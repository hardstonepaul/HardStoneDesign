// Beeper = contact form. One field per "page"; the beeper's own buttons navigate.
// Sending opens the visitor's mail app (mailto:). To switch to a form service later,
// replace sendMessage() only.
import { markerBox, placeByBox, setBoxVars } from './svg.js';
import { sfx } from './sfx.js';
import { CONFIG } from './config.js';

function sendMessage({ name, email, message }) {
  const subject = `Portfolio contact from ${name}`;
  const body = `${message}\n\n— ${name} (${email})`;
  location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return Promise.resolve();
}

export function initBeeper(root) {
  const svg = root.querySelector('.beeper-art svg');
  const form = root.querySelector('form');
  const steps = [...form.querySelectorAll('.lcd-page-step')];
  const pageLabel = form.querySelector('.lcd-page');
  const msg = form.querySelector('.lcd-msg');
  const summary = form.querySelector('.lcd-summary');
  const clock = form.querySelector('.lcd-clock');
  let step = 0;

  const buttons = [...root.querySelectorAll('.device-btn')];

  // The beeper is assembled from separate exports: body + one SVG per button
  setBoxVars(root, 'screen', markerBox(svg, 'screen', root));
  placeByBox(root, svg);

  const field = (i = step) => steps[i].querySelector('input, textarea');

  function go(i, { focus = true } = {}) {
    step = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, n) => { s.hidden = n !== step; });
    pageLabel.textContent = `${step + 1}/${steps.length}`;
    msg.textContent = '';
    if (steps[step].dataset.step === 'send') {
      const data = new FormData(form);
      summary.textContent = `FROM ${data.get('name')}: “${data.get('message')}”`;
    }
    if (focus) (field() ?? steps[step].querySelector('button'))?.focus({ preventScroll: true });
  }

  function validate(i = step) {
    const input = field(i);
    if (!input || input.checkValidity()) return true;
    msg.textContent = input.validity.valueMissing ? 'ERR: EMPTY FIELD' : 'ERR: CHECK EMAIL';
    sfx.error();
    root.classList.remove('is-buzzing');
    void root.offsetWidth;
    root.classList.add('is-buzzing');
    input.focus({ preventScroll: true });
    return false;
  }

  function next() {
    if (steps[step].dataset.step === 'send') { form.requestSubmit(); return; }
    if (validate()) { sfx.click(); go(step + 1); }
  }

  const actions = {
    up: () => { sfx.click(); go(step - 1); },
    down: next,
    ok: next,
    clear: () => {
      const input = field();
      if (input) input.value = '';
      sfx.click();
      go(step);
    },
  };

  for (const btn of buttons) {
    btn.addEventListener('pointerdown', () => btn.classList.add('is-pressed'));
    for (const type of ['pointerup', 'pointerleave', 'blur']) btn.addEventListener(type, () => btn.classList.remove('is-pressed'));
    btn.addEventListener('click', () => actions[btn.dataset.btn]?.());
  }

  form.addEventListener('keydown', (e) => {
    const isTextarea = e.target.localName === 'textarea';
    if (e.key === 'Enter' && (!isTextarea || e.ctrlKey || e.metaKey) && e.target.localName !== 'button') {
      e.preventDefault();
      next();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!validate(i)) { go(i); validate(i); return; }
    }
    msg.textContent = 'SENDING…';
    sfx.beep();
    await sendMessage(Object.fromEntries(new FormData(form)));
    root.classList.add('is-sent', 'is-buzzing');
    msg.textContent = 'MSG SENT ✓';
    sfx.buzz();
    navigator.vibrate?.([120, 60, 120]);
    setTimeout(() => root.classList.remove('is-buzzing'), 700);
    setTimeout(() => {
      root.classList.remove('is-sent');
      form.reset();
      go(0, { focus: false });
    }, 4500);
  });

  root.addEventListener('animationend', (e) => { if (e.animationName === 'buzz') root.classList.remove('is-buzzing'); });

  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  tick();
  setInterval(tick, 20_000);
  go(0, { focus: false });
}
