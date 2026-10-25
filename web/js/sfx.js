// Sound effects synthesized with the Web Audio API (no audio files). Off by default.

const KEY = 'hs-sfx';
let ctx = null;
let enabled = false;
let noiseBuffer = null;

try { enabled = localStorage.getItem(KEY) === 'on'; } catch { /* storage blocked */ }

export function audioContext() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', f = 440, f2, dur = 0.08, vol = 0.08, t = 0 }) {
  if (!enabled) return;
  const c = audioContext();
  const t0 = c.currentTime + t;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function noise({ dur = 0.1, vol = 0.1, t = 0, freq = 2000, filter = 'bandpass', force = false }) {
  if (!enabled && !force) return;
  const c = audioContext();
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + t;
  const src = c.createBufferSource();
  const biquad = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noiseBuffer;
  biquad.type = filter;
  biquad.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(biquad).connect(gain).connect(c.destination);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  hover: () => tone({ f: 880, dur: 0.04, vol: 0.025 }),
  insert: () => {
    noise({ dur: 0.05, vol: 0.25, freq: 900 });
    tone({ type: 'sine', f: 150, f2: 55, dur: 0.14, vol: 0.3, t: 0.02 });
    tone({ f: 1320, dur: 0.03, vol: 0.03, t: 0.08 });
  },
  eject: () => {
    tone({ type: 'triangle', f: 220, f2: 700, dur: 0.12, vol: 0.12 });
    noise({ dur: 0.04, vol: 0.15, freq: 1600 });
  },
  crtOff: () => tone({ type: 'sine', f: 1000, f2: 40, dur: 0.32, vol: 0.07 }),
  crtOn: () => {
    noise({ dur: 0.25, vol: 0.06, freq: 3000, filter: 'highpass' });
    tone({ type: 'sine', f: 60, f2: 130, dur: 0.3, vol: 0.05 });
  },
  select: () => { tone({ f: 660, dur: 0.05, vol: 0.04 }); tone({ f: 990, dur: 0.07, vol: 0.04, t: 0.05 }); },
  back: () => { tone({ f: 990, dur: 0.05, vol: 0.04 }); tone({ f: 660, dur: 0.07, vol: 0.04, t: 0.05 }); },
  beep: () => { tone({ f: 2093, dur: 0.07, vol: 0.04 }); tone({ f: 2093, dur: 0.07, vol: 0.04, t: 0.11 }); },
  error: () => tone({ f: 220, f2: 150, dur: 0.18, vol: 0.05 }),
  buzz: () => { for (let i = 0; i < 4; i++) tone({ type: 'sawtooth', f: 105, dur: 0.1, vol: 0.05, t: i * 0.15 }); },
  click: () => noise({ dur: 0.025, vol: 0.18, freq: 2600 }),
};

export function initSfx(button) {
  const label = button.querySelector('.sound-toggle-label');
  const render = () => {
    button.setAttribute('aria-pressed', String(enabled));
    label.textContent = enabled ? 'SFX ON' : 'SFX OFF';
  };
  button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* storage blocked */ }
    render();
    sfx.beep();
  });
  render();
}
