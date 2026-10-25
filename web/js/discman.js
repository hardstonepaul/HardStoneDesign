// Discman music player. Put your tracks in assets/audio/ and list them here.
// With no tracks it plays a small synthesized lo-fi demo loop.
import { placeByBox } from './svg.js';
import { audioContext, noise } from './sfx.js';

const TRACKS = [
  // { title: 'Track name', src: 'assets/audio/track-01.mp3' },
];

const pad = (n) => String(Math.floor(n)).padStart(2, '0');
const formatTime = (s) => `${pad(s / 60)}:${pad(s % 60)}`;

// Four-chord lo-fi loop (Fmaj7 · Em7 · Dm7 · Cmaj7) scheduled ahead on the Web Audio clock
function createDemo() {
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const arp = [0, 2, 1, 3, 2, 1, 3, 2];
  const eighth = 60 / 76 / 2;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  let ctx, out, timer, nextTime, stepIndex, startedAt;

  function note(freq, t, dur, { type = 'triangle', vol = 0.06 } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function kick(t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  function playStep(s, t) {
    const pos = s % 8;
    const chord = chords[Math.floor(s / 8) % 4];
    if (pos === 0) chord.forEach((n) => note(hz(n), t, eighth * 8, { type: 'sine', vol: 0.035 }));
    note(hz(chord[arp[pos]] + 12), t, eighth * 1.6, { vol: 0.045 });
    if (pos === 0 || pos === 5) kick(t);
    if (pos === 2 || pos === 6) noise({ t: t - ctx.currentTime, dur: 0.12, vol: 0.05, freq: 1800, force: true });
  }

  return {
    start() {
      ctx = audioContext();
      out = ctx.createGain();
      out.gain.value = 0.9;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2200;
      out.connect(lowpass).connect(ctx.destination);
      nextTime = ctx.currentTime + 0.05;
      startedAt = nextTime;
      stepIndex = 0;
      timer = setInterval(() => {
        while (nextTime < ctx.currentTime + 0.15) {
          playStep(stepIndex++, nextTime);
          nextTime += eighth;
        }
      }, 25);
    },
    stop() {
      clearInterval(timer);
      if (!out) return;
      const node = out;
      node.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      setTimeout(() => node.disconnect(), 400);
      out = null;
    },
    get time() { return ctx && out ? ctx.currentTime - startedAt : 0; },
  };
}

export function initDiscman(root) {
  const svg = root.querySelector('.discman-art svg');
  const trackText = root.querySelector('.dm-track-text');
  const timeText = root.querySelector('.dm-time');
  const playBtn = root.querySelector('[data-btn="play"]');
  const audio = new Audio();
  const demo = TRACKS.length ? null : createDemo();
  const playlist = TRACKS.length ? TRACKS : [{ title: 'DEMO · HARDSTONE LO-FI' }];
  let index = 0;
  let playing = false;
  let timer = 0;

  const buttons = [...root.querySelectorAll('.device-btn')];

  // Assembled from separate exports: body, CD, lid, screen and one SVG per button
  placeByBox(root, svg);
  for (const btn of buttons) {
    btn.addEventListener('pointerdown', () => btn.classList.add('is-pressed'));
    for (const type of ['pointerup', 'pointerleave', 'blur']) btn.addEventListener(type, () => btn.classList.remove('is-pressed'));
  }

  const elapsed = () => (demo ? demo.time : audio.currentTime);

  function render() {
    root.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    trackText.textContent = `${pad(index + 1)} ${playlist[index].title}`;
    timeText.textContent = formatTime(elapsed());
  }

  async function play() {
    if (demo) demo.start();
    else {
      if (!audio.src.endsWith(playlist[index].src)) audio.src = playlist[index].src;
      try { await audio.play(); } catch { trackText.textContent = 'DISC ERROR'; return; }
    }
    playing = true;
    clearInterval(timer);
    timer = setInterval(render, 500);
    render();
  }

  function pause({ reset = false } = {}) {
    if (demo) demo.stop();
    else { audio.pause(); if (reset) audio.currentTime = 0; }
    playing = false;
    clearInterval(timer);
    render();
    if (reset) timeText.textContent = '00:00';
  }

  function skip(dir) {
    index = (index + dir + playlist.length) % playlist.length;
    const wasPlaying = playing;
    pause({ reset: true });
    if (!demo) audio.src = playlist[index].src;
    if (wasPlaying) play();
    else render();
  }

  const actions = {
    play: () => (playing ? pause() : play()),
    stop: () => pause({ reset: true }),
    next: () => skip(1),
    prev: () => skip(-1),
  };
  for (const btn of buttons) btn.addEventListener('click', () => actions[btn.dataset.btn]());
  audio.addEventListener('ended', () => skip(1));

  // Clicking the CD or lid also plays/pauses (keyboard users have the play button)
  for (const el of root.querySelectorAll('.dm-cd, .dm-cap')) el.addEventListener('click', actions.play);

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => skip(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => skip(-1));
  }

  trackText.textContent = 'PRESS ▶';
}
