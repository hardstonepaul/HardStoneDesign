// Inlines the SVG files referenced by [data-svg] so their groups can be animated.
// Every id is prefixed (several copies of one file can live on the page) and the
// original layer name is kept as data-part="..." — CSS and JS target data-part.

const cache = new Map();
let uid = 0;

function load(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.text();
    }));
  }
  return cache.get(url);
}

// Illustrator layer names → part names: "eye left", "eye_left", "eye-left_2_" → "eye-left"
const partName = (id) => id
  .replace(/_x5F_/g, '_')
  .replace(/_\d+_$/, '')
  .replace(/[_\s]+/g, '-')
  .toLowerCase();

function scope(svg, prefix) {
  const ids = new Map();
  for (const el of svg.querySelectorAll('[id]')) {
    el.dataset.part ??= partName(el.id);
    ids.set(el.id, prefix + el.id);
    el.id = prefix + el.id;
  }

  const fixUrls = (value) => value.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m));
  for (const el of svg.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (attr.value.includes('url(#')) attr.value = fixUrls(attr.value);
      if (attr.localName === 'href' && attr.value.startsWith('#') && ids.has(attr.value.slice(1))) {
        attr.value = `#${ids.get(attr.value.slice(1))}`;
      }
    }
  }

  // "Internal CSS" exports use classes like .st0 in every file: rename them per file
  for (const style of svg.querySelectorAll('style')) {
    const classes = new Set([...style.textContent.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
    style.textContent = fixUrls(style.textContent).replace(/\.([A-Za-z_][\w-]*)/g, (m, c) => (classes.has(c) ? `.${prefix}${c}` : m));
    for (const el of svg.querySelectorAll('[class]')) {
      el.setAttribute('class', el.getAttribute('class').split(/\s+/).map((c) => (classes.has(c) ? prefix + c : c)).join(' '));
    }
  }
}

export async function inlineSvgs(root = document) {
  const hosts = [...root.querySelectorAll('[data-svg]')];
  await Promise.all(hosts.map(async (host) => {
    const doc = new DOMParser().parseFromString(await load(host.dataset.svg), 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.localName !== 'svg') throw new Error(`${host.dataset.svg} is not an SVG`);

    scope(svg, `s${++uid}-`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const node = document.importNode(svg, true);
    host.replaceChildren(node);
    const { width, height } = node.viewBox.baseVal;
    if (width && height) host.style.setProperty('--ar', `${width} / ${height}`);
  }));
}

export const part = (svg, name) => svg?.querySelector(`[data-part="${name}"]`);

// Bounding box of a part in % of the SVG's viewBox. Uses the SVG's own coordinate
// system, so it's correct even when the device is rotated with CSS.
export function partBox(svg, name) {
  const el = part(svg, name);
  if (!el) return null;
  const vb = svg.viewBox.baseVal;
  const b = el.getBBox();
  const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
  const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
    .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x: ((x - vb.x) / vb.width) * 100,
    y: ((y - vb.y) / vb.height) * 100,
    w: ((Math.max(...xs) - x) / vb.width) * 100,
    h: ((Math.max(...ys) - y) / vb.height) * 100,
  };
}

// Same as partBox, but falls back to a data-box-{name}="x y w h" attribute on the host,
// in the SVG's viewBox units — for exports without a named group for that area.
export function markerBox(svg, name, host) {
  const box = partBox(svg, name);
  const attr = host?.getAttribute(`data-box-${name}`);
  if (box || !attr) return box;
  return viewBoxPercent(svg, attr.trim().split(/[\s,]+/).map(Number));
}

export function viewBoxPercent(svg, [x, y, w, h]) {
  const vb = svg.viewBox.baseVal;
  return {
    x: ((x - vb.x) / vb.width) * 100,
    y: ((y - vb.y) / vb.height) * 100,
    w: (w / vb.width) * 100,
    h: (h / vb.height) * 100,
  };
}

// Devices assembled from separate exports: every [data-box="x y w h"] inside root is
// positioned over the base SVG (x/y/w in its viewBox units → --x/--y/--w in %).
export function placeByBox(root, baseSvg) {
  for (const el of root.querySelectorAll('[data-box]')) {
    const box = viewBoxPercent(baseSvg, el.dataset.box.trim().split(/[\s,]+/).map(Number));
    for (const k of ['x', 'y', 'w', 'h']) el.style.setProperty(`--${k}`, `${box[k]}%`);
  }
}

// Writes a part box as CSS variables: --{prefix}-x / -y / -w / -h
export function setBoxVars(el, prefix, box) {
  if (!box) return;
  for (const k of ['x', 'y', 'w', 'h']) el.style.setProperty(`--${prefix}-${k}`, `${box[k].toFixed(3)}%`);
}
