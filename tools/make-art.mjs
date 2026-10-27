/**
 * SpaceBolt's own artwork, drawn as SVG and rendered with sharp (the rest of the space art, the
 * planets, meteors, UFOs and the starry backdrops, comes from LearnBolt's generator):
 *
 *   (the rocket itself is vector art in src/rocket/model.ts, drawn live, so it can be painted)
 *   src/rocket/glyphs.json     letter outlines for the rocket's painted name
 *   assets/game/smoke.png, glow.png, cloud.png, astronaut*.png   props for the launch and landing movies
 *   assets/game/shield.png     the shield bubble
 *   assets/game/gate.png       the checkpoint ring at the end of each flight
 *   assets/game/part_*.png     part icons (engine, tank, shield, life) for the build panel and hangar
 *   assets/app_icon1.png       the app icon source (gold coin, navy bolt, little rocket)
 *   assets/splash_icon.png     the logo source: coin, SPACEBOLT, "answer it · fly it"
 *
 * Then `node make-icons.mjs` cuts the icon and splash files from the last two.
 *
 *   cd tools && npm install && node make-art.mjs
 */
import sharp from 'sharp';
import opentype from 'opentype.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');
const GAME = join(ASSETS, 'game');
const require = createRequire(import.meta.url);

const INK = '#1d1818';
const CREAM = '#ebe4d6';
const SHADE = '#c9c0b0';
const RED = '#c4493b';
const GOLD = '#f2c13d';
const GOLD_DARK = '#d69e24';
const NAVY = '#0f2445';
const STEEL = '#4a4f57';
const STEEL_LIGHT = '#757b85';
const GREEN = '#6fcf6a';
const BLUE = '#7fd6ff';
const SW = 6; // outline width

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const save = (buf, file) => sharp(buf).png().toFile(file);

// --- the rocket, in layers (canvas 560 x 280, nose to the right, centre line y = 140) ---------

const R = { w: 560, h: 280 };

/**
 * The rocket's pieces, each drawn in place on the 560 x 280 canvas. The body pieces are fitted in
 * the workshop at the start of a stage; the others are won with right answers. `bolts` are the
 * bolt holes (canvas points) the player taps to fasten the piece.
 */
const nozzle = (cy, h) => `
  <path d="M112 ${cy - h * 0.36} L70 ${cy - h / 2} L70 ${cy + h / 2} L112 ${cy + h * 0.36} Z" fill="${STEEL}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
  <path d="M100 ${cy - h * 0.38} L100 ${cy + h * 0.38}" stroke="${STEEL_LIGHT}" stroke-width="5"/>
  <path d="M84 ${cy - h * 0.44} L84 ${cy + h * 0.44}" stroke="${STEEL_LIGHT}" stroke-width="4"/>`;
const tank = (y) => `
  <rect x="216" y="${y}" width="170" height="34" rx="17" fill="${GOLD}" stroke="${INK}" stroke-width="${SW}"/>
  <path d="M248 ${y + 3} L248 ${y + 31} M352 ${y + 3} L352 ${y + 31}" stroke="${INK}" stroke-width="5"/>
  <path d="M232 ${y + 10} L372 ${y + 10}" stroke="#fff3c2" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
  <path d="M288 ${y + 17} l10 -9 l10 9 l-10 9 z" fill="${GOLD_DARK}" stroke="${INK}" stroke-width="3"/>`;
/** A shield emitter: a glowing orb on a short mast at a fin tip. */
const emitter = (up) => {
  const tip = up ? 34 : 246, top = up ? 10 : 270, dir = up ? 1 : -1;
  return `
  <path d="M128 ${tip} L128 ${top + dir * 14}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
  <path d="M128 ${tip} L128 ${top + dir * 14}" stroke="${STEEL_LIGHT}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="128" cy="${top + dir * 12}" r="13" fill="${BLUE}" stroke="${INK}" stroke-width="5"/>
  <circle cx="124" cy="${top + dir * 12 - 4}" r="4" fill="#fff" opacity="0.9"/>`;
};
const PIECES = {
  finTop: { body: true, bolts: [[132, 100], [190, 100]],
    svg: `<path d="M120 96 L205 96 L150 34 Q128 30 112 38 Z" fill="${RED}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>` },
  finBottom: { body: true, bolts: [[132, 180], [190, 180]],
    svg: `<path d="M120 184 L205 184 L150 246 Q128 250 112 242 Z" fill="${RED}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>` },
  fuselage: { body: true, bolts: [],
    svg: `
  <path d="M112 92 L446 92 L446 188 L112 188 Q104 140 112 92 Z" fill="${CREAM}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
  <path d="M118 166 L442 166 L442 184 L116 184 Z" fill="${SHADE}" opacity="0.8"/>
  <path d="M140 106 L420 106" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.65"/>
  <rect x="300" y="92" width="16" height="96" fill="${RED}" stroke="${INK}" stroke-width="4"/>` },
  nose: { body: true, bolts: [[456, 116], [456, 164]],
    svg: `<path d="M440 92 Q520 98 548 140 Q520 182 440 188 Z" fill="${RED}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>` },
  window: { body: true, bolts: [[343, 138], [401, 138]],
    svg: `<circle cx="372" cy="138" r="27" fill="${NAVY}" stroke="${INK}" stroke-width="${SW}"/>
  <circle cx="364" cy="130" r="8" fill="#9cc7ff" opacity="0.8"/>` },
  mainEngine: { body: true, bolts: [[104, 124], [104, 156]], svg: nozzle(140, 54) },
  engine2: { bolts: [[104, 104]], svg: nozzle(104, 30) },
  engine3: { bolts: [[104, 176]], svg: nozzle(176, 30) },
  tank1: { bolts: [[248, 201], [352, 201]], svg: tank(184) },
  tank2: { bolts: [[248, 79], [352, 79]], svg: tank(62) },
  life: { bolts: [[410, 88], [466, 88]],
    svg: `<path d="M398 94 Q398 50 438 50 Q478 50 478 94 Z" fill="#dff7da" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
  <path d="M438 60 L438 86 M425 73 L451 73" stroke="${GREEN}" stroke-width="9" stroke-linecap="round"/>
  <path d="M410 82 Q412 64 426 58" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>` },
  shield1: { bolts: [[128, 34]], svg: emitter(true) },
  shield2: { bolts: [[128, 246]], svg: emitter(false) },
};
// the app icon's little rocket (an older drawing, kept for the icon)
const ORDER = ['finTop', 'finBottom', 'shield1', 'shield2', 'tank2', 'fuselage', 'nose', 'window', 'mainEngine', 'engine2', 'engine3', 'tank1', 'life'];
const BODY_SVG = ORDER.filter((k) => PIECES[k].body && k !== 'mainEngine').map((k) => PIECES[k].svg).join('');
// the app icon's little rocket
const body = BODY_SVG;
const engines = [PIECES.mainEngine.svg];

/** The shield bubble: a pale blue glow with a bright rim and a few hexagon sparkles. */
async function shield() {
  const w = 700, h = 420;
  const hex = (x, y, r) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i;
      return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="#e8fbff" stroke-width="4" opacity="0.7"/>`;
  };
  await save(svg(w, h, `
    <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0.55" stop-color="${BLUE}" stop-opacity="0.04"/>
      <stop offset="0.9" stop-color="${BLUE}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0.5"/>
    </radialGradient></defs>
    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 10}" ry="${h / 2 - 10}" fill="url(#g)" stroke="#bff0ff" stroke-width="8"/>
    <path d="M150 90 Q260 30 420 40" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.7"/>
    ${hex(560, 110, 22)}${hex(600, 170, 14)}${hex(130, 310, 18)}`), join(GAME, 'shield.png'));
}

/** The checkpoint at the end of each flight: a ring with lights, seen side-on. */
async function gate() {
  const w = 220, h = 560;
  const lights = Array.from({ length: 7 }, (_, i) => {
    const t = (i + 0.5) / 7;
    const a = Math.PI * (0.5 + t);
    return `<circle cx="${(110 + Math.cos(a) * 70).toFixed(1)}" cy="${(280 + Math.sin(a) * 250).toFixed(1)}" r="9" fill="${GREEN}" stroke="${INK}" stroke-width="3"/>`;
  }).join('');
  await save(svg(w, h, `
    <ellipse cx="110" cy="280" rx="80" ry="262" fill="none" stroke="${INK}" stroke-width="34"/>
    <ellipse cx="110" cy="280" rx="80" ry="262" fill="none" stroke="${STEEL_LIGHT}" stroke-width="22"/>
    <ellipse cx="110" cy="280" rx="80" ry="262" fill="none" stroke="#9aa1ab" stroke-width="6" stroke-dasharray="30 26"/>
    ${lights}
    <rect x="86" y="0" width="48" height="26" rx="6" fill="${GOLD}" stroke="${INK}" stroke-width="5"/>
    <rect x="86" y="534" width="48" height="26" rx="6" fill="${GOLD}" stroke="${INK}" stroke-width="5"/>`), join(GAME, 'gate.png'));
}

// --- part icons (128 x 128) ------------------------------------------------------------------

const ICON = 128;
const icons = {
  engine: `
    <path d="M34 30 L94 30 L106 84 L22 84 Z" fill="${STEEL}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M40 46 L88 46 M36 64 L92 64" stroke="${STEEL_LIGHT}" stroke-width="6"/>
    <path d="M30 88 Q64 140 98 88 Z" fill="#ff8a4a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M46 90 Q64 120 82 90 Z" fill="#ffe08a"/>
    <rect x="28" y="16" width="72" height="16" rx="6" fill="${CREAM}" stroke="${INK}" stroke-width="5"/>`,
  tank: `
    <rect x="30" y="18" width="68" height="96" rx="30" fill="${GOLD}" stroke="${INK}" stroke-width="${SW}"/>
    <path d="M30 46 L98 46 M30 86 L98 86" stroke="${INK}" stroke-width="5"/>
    <path d="M44 30 Q44 22 54 22" stroke="#fff3c2" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M64 54 Q50 70 56 76 Q64 84 72 76 Q78 70 64 54 Z" fill="${NAVY}" stroke="${INK}" stroke-width="3"/>`,
  shield: `
    <path d="M64 12 L106 28 Q108 82 64 116 Q20 82 22 28 Z" fill="${BLUE}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M64 24 L94 36 Q94 76 64 100 Z" fill="#c8f1ff"/>
    <circle cx="64" cy="62" r="7" fill="${NAVY}"/>
    <ellipse cx="64" cy="62" rx="26" ry="10" fill="none" stroke="${NAVY}" stroke-width="4"/>
    <ellipse cx="64" cy="62" rx="26" ry="10" fill="none" stroke="${NAVY}" stroke-width="4" transform="rotate(60 64 62)"/>
    <ellipse cx="64" cy="62" rx="26" ry="10" fill="none" stroke="${NAVY}" stroke-width="4" transform="rotate(-60 64 62)"/>`,
  life: `
    <path d="M64 112 L20 66 Q4 46 20 28 Q40 10 64 34 Q88 10 108 28 Q124 46 108 66 Z" fill="#ff7a8a" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
    <rect x="54" y="40" width="20" height="50" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <rect x="39" y="55" width="50" height="20" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M54 55 L74 55 L74 75 L54 75 Z" fill="#fff"/>`,
};

async function partIcons() {
  for (const [id, art] of Object.entries(icons)) await save(svg(ICON, ICON, art), join(GAME, `part_${id}.png`));
}

// --- app icon and logo -----------------------------------------------------------------------

/** The coin: gold, a darker rim, a navy lightning bolt, and a small rocket on a cream tile. */
const coin = (cx, cy, r) => {
  const s = r / 300;
  const t = (x, y) => `${(cx + x * s).toFixed(1)},${(cy + y * s).toFixed(1)}`;
  return `
    <circle cx="${cx}" cy="${cy + 26 * s}" r="${r}" fill="#b8861c"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="${GOLD_DARK}" stroke-width="${18 * s}"/>
    <g transform="translate(${cx - 232 * s} ${cy - 112 * s}) rotate(-8) scale(${s})">
      <rect x="0" y="0" width="200" height="214" rx="34" fill="#f2ead8"/>
      <g transform="translate(100 110) rotate(-45) scale(0.34) translate(-330 -140)">${body}${engines[0]}</g>
    </g>
    <path d="M${t(96, -236)} L${t(-72, 32)} L${t(68, 32)} L${t(12, 236)} L${t(192, -48)} L${t(54, -48)} L${t(124, -236)} Z"
      fill="${NAVY}" stroke="${NAVY}" stroke-width="${18 * s}" stroke-linejoin="round"/>`;
};

async function appIcon() {
  await save(svg(720, 720, coin(360, 340, 310)), join(ASSETS, 'app_icon1.png'));
}

/** Text as SVG outlines, so the logo doesn't depend on fonts installed on this computer. */
function textPath(font, str, x, y, size, fill, tracking = 0) {
  let d = '';
  let cx = x;
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth / font.unitsPerEm) * size + tracking;
  }
  return { svg: `<path d="${d}" fill="${fill}"/>`, width: cx - x - tracking };
}

async function logo() {
  const toAB = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const heavy = opentype.parse(toAB(readFileSync(require.resolve('@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff'))));
  const hand = opentype.parse(toAB(readFileSync(join(HERE, '..', 'node_modules/@expo-google-fonts/patrick-hand/400Regular/PatrickHand_400Regular.ttf'))));
  const W = 900, H = 1012;
  const size = 150;
  const space = textPath(heavy, 'SPACE', 0, 0, size, CREAM, 4);
  const bolt = textPath(heavy, 'BOLT', 0, 0, size, GOLD, 4);
  const total = space.width + bolt.width + 10;
  const x0 = (W - total) / 2;
  const word1 = textPath(heavy, 'SPACE', x0, 860, size, CREAM, 4);
  const word2 = textPath(heavy, 'BOLT', x0 + space.width + 10, 860, size, GOLD, 4);
  const tagSize = 64;
  const tagW = textPath(hand, 'answer it · fly it', 0, 0, tagSize, GREEN).width;
  const tag = textPath(hand, 'answer it · fly it', (W - tagW) / 2, 980, tagSize, '#8ee07c');
  await save(svg(W, H, `${coin(450, 330, 300)}${word1.svg}${word2.svg}${tag.svg}`), join(ASSETS, 'splash_icon.png'));
}


// --- the painted name: letter outlines, so the name can be painted on the rocket anywhere ------

async function glyphs() {
  const toAB = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const font = opentype.parse(toAB(readFileSync(require.resolve('@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff'))));
  const out = { unitsPerEm: font.unitsPerEm, capHeight: 0, glyphs: {} };
  const H = font.charToGlyph('H').getBoundingBox();
  out.capHeight = H.y2;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -!.') {
    const g = font.charToGlyph(ch);
    const cmds = (g.path?.commands ?? []).map((c) => {
      const r = (v) => Math.round(v);
      if (c.type === 'M' || c.type === 'L') return [c.type, r(c.x), r(c.y)];
      if (c.type === 'Q') return ['Q', r(c.x1), r(c.y1), r(c.x), r(c.y)];
      if (c.type === 'C') return ['C', r(c.x1), r(c.y1), r(c.x2), r(c.y2), r(c.x), r(c.y)];
      return ['Z'];
    });
    out.glyphs[ch] = { adv: g.advanceWidth, cmds };
  }
  writeFileSync(join(HERE, '..', 'src', 'rocket', 'glyphs.json'), JSON.stringify(out) + '\n');
}

/** Movie props: a smoke puff, a fluffy cloud, and the astronaut (standing and walking). */
async function movieProps() {
  await save(svg(256, 256, `
    <defs><radialGradient id="s" cx="45%" cy="40%" r="55%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="0.6" stop-color="#e9e4dc" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#c9c2b6" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="128" cy="128" r="124" fill="url(#s)"/>`), join(GAME, 'smoke.png'));
  await save(svg(256, 256, `
    <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff6d0" stop-opacity="1"/>
      <stop offset="0.3" stop-color="#ffc35a" stop-opacity="0.8"/>
      <stop offset="0.65" stop-color="#ff7a2e" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#ff5a1e" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="128" cy="128" r="128" fill="url(#g)"/>`), join(GAME, 'glow.png'));
  await save(svg(512, 220, `
    <g fill="#ffffff" opacity="0.92">
      <circle cx="120" cy="140" r="70"/><circle cx="210" cy="100" r="90"/><circle cx="320" cy="115" r="80"/>
      <circle cx="400" cy="150" r="60"/><rect x="110" y="140" width="300" height="70" rx="35"/>
    </g>
    <g fill="#dfe8f3" opacity="0.9"><rect x="120" y="170" width="290" height="40" rx="20"/></g>`), join(GAME, 'cloud.png'));
  // the astronaut: white suit, gold visor, a small backpack; legs apart for the walking frame
  const astro = (walk) => `
    <rect x="70" y="58" width="34" height="62" rx="10" fill="#cfd5dd" stroke="${INK}" stroke-width="5"/>
    <rect x="58" y="70" width="58" height="66" rx="18" fill="#f4f1ea" stroke="${INK}" stroke-width="5"/>
    <rect x="72" y="88" width="30" height="16" rx="4" fill="${RED}" stroke="${INK}" stroke-width="3"/>
    <path d="M${walk ? 66 : 70} 130 L${walk ? 52 : 66} 182 L${walk ? 70 : 84} 182 L82 132 Z" fill="#f4f1ea" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${walk ? 110 : 104} 130 L${walk ? 124 : 108} 182 L${walk ? 106 : 90} 182 L92 132 Z" fill="#f4f1ea" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 80 L${walk ? 40 : 46} 122" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M60 80 L${walk ? 40 : 46} 122" stroke="#f4f1ea" stroke-width="8" stroke-linecap="round"/>
    <path d="M114 80 L${walk ? 132 : 128} 120" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M114 80 L${walk ? 132 : 128} 120" stroke="#f4f1ea" stroke-width="8" stroke-linecap="round"/>
    <circle cx="87" cy="46" r="32" fill="#f4f1ea" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="92" cy="48" rx="22" ry="17" fill="${GOLD}" stroke="${INK}" stroke-width="4"/>
    <path d="M80 40 Q86 34 96 36" stroke="#fff6cf" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  await save(svg(170, 190, astro(false)), join(GAME, 'astronaut.png'));
  await save(svg(170, 190, astro(true)), join(GAME, 'astronaut_walk.png'));
}

await shield();
await gate();
await partIcons();
await appIcon();
await logo();
await glyphs();
await movieProps();
console.log('SpaceBolt art drawn. Now: node make-icons.mjs');
