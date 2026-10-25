import { inlineSvgs } from './svg.js';
import { initSfx } from './sfx.js';
import { createFace } from './face.js';
import { createTV } from './tv.js';
import { initCartridges } from './cartridges.js';
import { initBeeper } from './beeper.js';
import { initDiscman } from './discman.js';

await inlineSvgs();
await document.fonts.ready;

initSfx(document.querySelector('.sound-toggle'));

const stage = document.querySelector('.room-stage');
const face = createFace(stage.querySelector('.console'));
const tv = createTV(stage.querySelector('.tv'));
initCartridges({ stage, face, tv });

initBeeper(document.querySelector('.beeper'));
initDiscman(document.querySelector('.discman'));

document.documentElement.classList.add('is-ready');
