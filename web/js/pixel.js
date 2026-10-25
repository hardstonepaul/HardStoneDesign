// Tiny pixel-art sprites for inside the screens: one character per pixel, "." = empty.
// Swap these maps (or drop in your own PNG sprites) any time.

export function sprite(rows, palette) {
  let rects = '';
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (palette[ch]) rects += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${palette[ch]}"/>`;
    });
  });
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

const AVATAR = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '..PKHHHHHHHHKP..',
  '..PKHSSSSSSHKP..',
  '..PKSKSSSSKSKP..',
  '..PKSKSSSSKSKP..',
  '...KSSSSSSSSK...',
  '...KSSRRRRSSK...',
  '....KSSSSSSK....',
  '.....KKSSKK.....',
  '...KKTTTTTTKK...',
  '..KTTTYTTYTTTK..',
  '..KTTTTTTTTTTK..',
  '..KKKKKKKKKKKK..',
];

const CARTRIDGE = [
  '.KKKKKKKKKKKK.',
  'KYYYYYYYYYYYYK',
  'KYBBBBBBBBBBYK',
  'KYBWWBBBBBBBYK',
  'KYBWBBBBBBBBYK',
  'KYBBBBBBBBBBYK',
  'KYBBBBBBBBBBYK',
  'KYYYYYYYYYYYYK',
  '.KDDDDDDDDDDK.',
  '..KKKKKKKKKK..',
];

export const SPRITES = {
  avatar: () => sprite(AVATAR, {
    K: '#211a21', H: '#4a434a', S: '#e7b48f', R: '#a31818', P: '#de2121', T: '#5446b0', Y: '#ffd200',
  }),
  cartridge: () => sprite(CARTRIDGE, {
    K: '#211a21', Y: '#ffd200', D: '#e8b600', B: '#73cff5', W: '#ffffff',
  }),
};

export function fillSprites(root) {
  for (const el of root.querySelectorAll('[data-sprite]')) el.innerHTML = SPRITES[el.dataset.sprite]?.() ?? '';
}
