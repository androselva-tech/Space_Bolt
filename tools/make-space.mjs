/**
 * The deep-space art for the flights, drawn as SVG (noise and lighting filters for rock relief)
 * and rendered with sharp:
 *
 *   assets/game/rock_1..6.png        round, cratered asteroids lit from the upper left, warm rim light
 *   assets/game/junk_satellite.png   a broken satellite (gold foil, one bent solar wing)
 *   assets/game/junk_panel.png       a torn-off solar panel
 *   assets/game/fuel_canister.png    a fuel canister to collect after a fuel leak
 *   assets/game/nav_ring.png         a navigation beacon ring (seen side-on) to fly through
 *   assets/game/sun_flare.png        the Sun in a solar flare
 *   assets/game/space_nebula.jpg     the deep sky: a purple and blue nebula band with a glowing core
 *   assets/game/limb_earth.png, limb_moon.png   a planet's curved edge with its glow, for the bottom of the view
 *   assets/game/moon_ground.jpg      a tileable patch of Moon ground for the 3D Moon walk
 *
 *   cd tools && npm install && node make-space.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = join(HERE, '..', 'assets', 'game');

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const png = (buf, file) => sharp(buf).png({ compressionLevel: 9 }).toFile(join(GAME, file));
const jpg = (buf, file) => sharp(buf).jpeg({ quality: 86 }).toFile(join(GAME, file));

/** Small seeded random numbers. */
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A closed smooth path through points (Catmull-Rom as cubic Béziers). */
function smoothPath(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// --- asteroids -------------------------------------------------------------------------------

/** A lumpy round rock, `stretch` wide, with craters, relief, shadow and a warm rim light. */
function rock(seed, stretch, tint) {
  const S = 512, c = S / 2, R = 205 / Math.max(1, stretch);
  const r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  const pts = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const k = 1 + Math.sin(a * 2 + ph[0]) * 0.07 + Math.sin(a * 3 + ph[1]) * 0.06 + Math.sin(a * 5 + ph[2]) * 0.035 + (r() - 0.5) * 0.05;
    return [c + Math.cos(a) * R * k * stretch, c + Math.sin(a) * R * k / Math.sqrt(stretch)];
  });
  const outline = smoothPath(pts);
  const craters = Array.from({ length: 5 + Math.floor(r() * 4) }, () => {
    const a = r() * Math.PI * 2, d = r() * R * 0.68;
    return { x: c + Math.cos(a) * d * stretch, y: c + Math.sin(a) * d * 0.8, rx: 12 + r() * 34, k: 0.55 + r() * 0.3 };
  });
  const [hi, mid, lo] = tint;
  return svg(S, S, `
  <defs>
    <clipPath id="clip"><path d="${outline}"/></clipPath>
    <radialGradient id="body" cx="0.36" cy="0.32" r="0.78">
      <stop offset="0" stop-color="${hi}"/><stop offset="0.45" stop-color="${mid}"/><stop offset="0.85" stop-color="${lo}"/><stop offset="1" stop-color="#0c0908"/>
    </radialGradient>
    <radialGradient id="shadow" cx="0.3" cy="0.27" r="0.9">
      <stop offset="0.25" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0.92"/>
    </radialGradient>
    <radialGradient id="shine" cx="0.32" cy="0.28" r="0.4">
      <stop offset="0" stop-color="#fff2e0" stop-opacity="0.28"/><stop offset="1" stop-color="#fff2e0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pit"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.8" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="lip"><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="0.85" stop-color="#ffe9d0" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffb070" stop-opacity="1"/><stop offset="0.3" stop-color="#ff8a3a" stop-opacity="0.6"/><stop offset="0.45" stop-color="#ff8a3a" stop-opacity="0"/>
    </linearGradient>
    <filter id="relief" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="5" seed="${seed}" result="noise"/>
      <feDiffuseLighting in="noise" lighting-color="#ffffff" surfaceScale="7" result="light"><feDistantLight azimuth="225" elevation="38"/></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1.25" k2="0.05" k3="0" k4="0" result="lit"/>
      <feComposite in="lit" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="${S}" height="${S}" fill="url(#body)" filter="url(#relief)"/>
    ${craters.map((q) => `
    <ellipse cx="${q.x + q.rx * 0.18}" cy="${q.y + q.rx * 0.14}" rx="${q.rx}" ry="${q.rx * q.k}" fill="url(#lip)"/>
    <ellipse cx="${q.x}" cy="${q.y}" rx="${q.rx * 0.86}" ry="${q.rx * q.k * 0.86}" fill="url(#pit)" filter="url(#soft)"/>`).join('')}
    <rect width="${S}" height="${S}" fill="url(#shine)"/>
    <rect width="${S}" height="${S}" fill="url(#shadow)"/>
  </g>
  <path d="${outline}" fill="none" stroke="#0a0706" stroke-width="4"/>
  <path d="${outline}" fill="none" stroke="url(#rim)" stroke-width="8"/>`);
}

const ROCKS = [
  [11, 1.0, ['#a08f80', '#5f5249', '#2b231f']],
  [23, 1.25, ['#9a8676', '#594a40', '#271f1b']],
  [37, 0.9, ['#8f8a86', '#55504c', '#24211f']],
  [41, 1.15, ['#a5927c', '#64543f', '#2c2219']],
  [59, 1.05, ['#8c8178', '#4f4640', '#211c19']],
  [73, 1.35, ['#9d8b7f', '#5b4b43', '#29201c']],
];

// --- space junk, pickups, the flare ------------------------------------------------------------

const SOLAR = (x, y, w, h, cols, rows, extra = '') => `
  <g ${extra}>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1d3f8f" stroke="#c7ccd4" stroke-width="6"/>
    ${Array.from({ length: cols - 1 }, (_, i) => `<path d="M${x + ((i + 1) * w) / cols} ${y} V${y + h}" stroke="#7fa6ff" stroke-width="2.5"/>`).join('')}
    ${Array.from({ length: rows - 1 }, (_, i) => `<path d="M${x} ${y + ((i + 1) * h) / rows} H${x + w}" stroke="#7fa6ff" stroke-width="2.5"/>`).join('')}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sheen)"/>
  </g>`;
const SHEEN = `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>`;

const satellite = () => svg(512, 512, `
  <defs>${SHEEN}
    <filter id="foil" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="5" result="n"/>
      <feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="3" result="l"><feDistantLight azimuth="225" elevation="45"/></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1.3" k2="0" k3="0" k4="0" result="lit"/>
      <feComposite in="lit" in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>
  <g transform="rotate(-18 256 256)">
    ${SOLAR(40, 205, 150, 100, 4, 3)}
    ${SOLAR(330, 200, 140, 100, 4, 3, 'transform="rotate(24 330 250)"')}
    <path d="M330 300 l40 30 l-25 6 z" fill="#1d3f8f" stroke="#c7ccd4" stroke-width="4"/>
    <rect x="190" y="245" width="140" height="22" fill="#8a9099"/>
    <rect x="200" y="175" width="120" height="160" rx="8" fill="#d9a531" stroke="#3a2a10" stroke-width="5" filter="url(#foil)"/>
    <path d="M260 175 L260 120" stroke="#c7ccd4" stroke-width="6"/>
    <ellipse cx="260" cy="110" rx="48" ry="20" fill="#e9edf2" stroke="#5c6370" stroke-width="5"/>
    <circle cx="260" cy="104" r="6" fill="#5c6370"/>
    <path d="M215 335 l-20 40 M245 335 l-6 55 M300 335 l22 30" stroke="#9aa0a8" stroke-width="5" stroke-linecap="round"/>
  </g>`);

const panel = () => svg(512, 160, `
  <defs>${SHEEN}</defs>
  ${SOLAR(20, 30, 440, 100, 9, 2)}
  <path d="M460 30 L500 46 L478 74 L494 102 L460 130 Z" fill="#1d3f8f" stroke="#c7ccd4" stroke-width="6" stroke-linejoin="round"/>
  <path d="M20 80 H-10" stroke="#9aa0a8" stroke-width="10"/>`);

const canister = () => svg(256, 256, `
  <defs>
    <linearGradient id="can" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b85d10"/><stop offset="0.35" stop-color="#ffb347"/><stop offset="0.6" stop-color="#f08a24"/><stop offset="1" stop-color="#7a3a08"/></linearGradient>
    <radialGradient id="halo"><stop offset="0.5" stop-color="#7fe6ff" stop-opacity="0.55"/><stop offset="1" stop-color="#7fe6ff" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="128" cy="128" r="124" fill="url(#halo)"/>
  <rect x="78" y="58" width="100" height="150" rx="22" fill="url(#can)" stroke="#2a1606" stroke-width="6"/>
  <rect x="100" y="38" width="56" height="26" rx="6" fill="#c7ccd4" stroke="#2a1606" stroke-width="5"/>
  <rect x="78" y="98" width="100" height="20" fill="#2a1606" opacity="0.75"/>
  <rect x="78" y="150" width="100" height="20" fill="#2a1606" opacity="0.75"/>
  <path d="M128 120 q-16 18 0 28 q16 -10 0 -28 z" fill="#7fe6ff" stroke="#2a1606" stroke-width="3"/>`);

const navRing = () => svg(200, 512, `
  <defs>
    <filter id="glow" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <ellipse cx="100" cy="256" rx="54" ry="232" fill="none" stroke="#33d6ff" stroke-width="28" opacity="0.55" filter="url(#glow)"/>
  <ellipse cx="100" cy="256" rx="54" ry="232" fill="none" stroke="#a8f0ff" stroke-width="10"/>
  <ellipse cx="100" cy="256" rx="54" ry="232" fill="none" stroke="#ffffff" stroke-width="3"/>
  ${[30, 256, 482].map((y) => `<circle cx="${y === 256 ? 154 : 100}" cy="${y}" r="13" fill="#ffd45c" stroke="#5a3d00" stroke-width="3"/>`).join('')}`);

const flare = () => {
  const r = rng(91);
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + r() * 0.2, l = 300 + r() * 200, w = 0.05 + r() * 0.05;
    const p = (ang, d) => `${512 + Math.cos(ang) * d},${512 + Math.sin(ang) * d}`;
    return `<path d="M${p(a - w, 120)} L${p(a, l)} L${p(a + w, 120)} Z" fill="#ffd27a" opacity="${0.35 + r() * 0.3}"/>`;
  }).join('');
  return svg(1024, 1024, `
  <defs>
    <radialGradient id="sun"><stop offset="0" stop-color="#ffffff"/><stop offset="0.18" stop-color="#fff6c8"/><stop offset="0.32" stop-color="#ffc24a"/><stop offset="0.55" stop-color="#ff7a1a" stop-opacity="0.55"/><stop offset="1" stop-color="#ff4a00" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <g filter="url(#blur)">${rays}</g>
  <circle cx="512" cy="512" r="500" fill="url(#sun)"/>`);
};

// --- the deep sky and planet edges --------------------------------------------------------------

const nebula = () => {
  const W = 2400, H = 1200, r = rng(7);
  const stars = Array.from({ length: 1700 }, () => {
    const s = r() < 0.92 ? 0.5 + r() * 1.1 : 1.6 + r() * 1.6;
    const tint = ['#ffffff', '#cfe0ff', '#ffe6c9', '#e6d9ff'][Math.floor(r() * 4)];
    return `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H).toFixed(1)}" r="${s.toFixed(2)}" fill="${tint}" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`;
  }).join('');
  const bright = Array.from({ length: 26 }, () => {
    const x = r() * W, y = r() * H, s = 6 + r() * 10;
    return `<g opacity="0.85"><circle cx="${x}" cy="${y}" r="${s}" fill="url(#twinkle)"/><path d="M${x - s * 2.4} ${y} H${x + s * 2.4} M${x} ${y - s * 2.4} V${y + s * 2.4}" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/></g>`;
  }).join('');
  return svg(W, H, `
  <defs>
    <radialGradient id="twinkle"><stop offset="0" stop-color="#fff"/><stop offset="0.25" stop-color="#e8f0ff" stop-opacity="0.9"/><stop offset="1" stop-color="#9fbfff" stop-opacity="0"/></radialGradient>
    <linearGradient id="bandMask" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.12" stop-color="#000"/><stop offset="0.42" stop-color="#fff"/><stop offset="0.58" stop-color="#fff"/><stop offset="0.9" stop-color="#000"/>
    </linearGradient>
    <mask id="band"><g transform="rotate(-17 ${W / 2} ${H / 2})"><rect x="-400" y="0" width="${W + 800}" height="${H}" fill="url(#bandMask)"/></g></mask>
    <filter id="clouds" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0032" numOctaves="6" seed="17"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.32  0 0 0 0 0.9  0 0 0 2.4 -0.85"/>
    </filter>
    <filter id="clouds2" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.003 0.006" numOctaves="5" seed="29"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.45  0 0 0 0 1  0 0 0 2.2 -0.9"/>
    </filter>
    <filter id="dust" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="5" seed="41"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0 0.04  0 0 0 3 -1.55"/>
    </filter>
    <filter id="big"><feGaussianBlur stdDeviation="90"/></filter>
    <filter id="mid"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#020309"/>
  <g transform="rotate(-17 ${W / 2} ${H / 2})">
    <ellipse cx="${W * 0.5}" cy="${H * 0.5}" rx="${W * 0.62}" ry="${H * 0.16}" fill="#2a1b5e" filter="url(#big)" opacity="0.9"/>
    <ellipse cx="${W * 0.42}" cy="${H * 0.5}" rx="${W * 0.3}" ry="${H * 0.1}" fill="#5a2d91" filter="url(#big)" opacity="0.8"/>
    <ellipse cx="${W * 0.7}" cy="${H * 0.48}" rx="${W * 0.26}" ry="${H * 0.08}" fill="#1f4fae" filter="url(#big)" opacity="0.7"/>
    <ellipse cx="${W * 0.58}" cy="${H * 0.5}" rx="${W * 0.12}" ry="${H * 0.06}" fill="#c0457e" filter="url(#mid)" opacity="0.55"/>
    <ellipse cx="${W * 0.6}" cy="${H * 0.49}" rx="${W * 0.06}" ry="${H * 0.04}" fill="#ff8a3a" filter="url(#mid)" opacity="0.9"/>
    <ellipse cx="${W * 0.6}" cy="${H * 0.49}" rx="${W * 0.02}" ry="${H * 0.014}" fill="#fff4d8" filter="url(#mid)"/>
  </g>
  <g mask="url(#band)">
    <rect width="${W}" height="${H}" filter="url(#clouds)" opacity="0.85"/>
    <rect width="${W}" height="${H}" filter="url(#clouds2)" opacity="0.6"/>
    <rect width="${W}" height="${H}" filter="url(#dust)"/>
  </g>
  ${stars}${bright}`);
};

/** A planet's edge: a huge curved surface along the bottom with its glowing rim. */
const limb = (kind) => {
  const W = 2400, H = 700, R = 3200, cx = W / 2, cy = 330 + R;
  const earth = kind === 'earth';
  return svg(W, H, `
  <defs>
    <radialGradient id="surf" cx="${cx}" cy="${cy}" r="${R}" gradientUnits="userSpaceOnUse">
      <stop offset="0.9" stop-color="${earth ? '#0b2a5c' : '#3a3a40'}"/><stop offset="0.985" stop-color="${earth ? '#2f78c8' : '#8d8d94'}"/><stop offset="1" stop-color="${earth ? '#8fd6ff' : '#c9c9cf'}"/>
    </radialGradient>
    <filter id="glow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${earth ? 26 : 12}"/></filter>
    <filter id="tex" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${earth ? '0.004 0.012' : '0.012'}" numOctaves="5" seed="${earth ? 3 : 9}"/>
      <feColorMatrix type="matrix" values="${earth ? '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.6 -1.2' : '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.8 -0.7'}"/>
    </filter>
    <clipPath id="ball"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <linearGradient id="night" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.7"/><stop offset="0.35" stop-color="#000" stop-opacity="0"/><stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${R + (earth ? 34 : 14)}" fill="none" stroke="${earth ? '#4fb6ff' : '#b8b8c0'}" stroke-width="${earth ? 60 : 24}" opacity="${earth ? 0.8 : 0.35}" filter="url(#glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#surf)"/>
  <g clip-path="url(#ball)">
    <rect width="${W}" height="${H}" filter="url(#tex)" opacity="${earth ? 0.55 : 0.6}"/>
    ${earth ? '' : Array.from({ length: 30 }, (_, i) => { const r = rng(100 + i); const x = r() * W, y = 360 + r() * 300, s = 10 + r() * 40; return `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.3}" fill="#2a2a30" opacity="0.55"/><ellipse cx="${x + s * 0.15}" cy="${y + s * 0.08}" rx="${s}" ry="${s * 0.3}" fill="none" stroke="#b0b0b8" stroke-width="2" opacity="0.4"/>`; }).join('')}
    <rect width="${W}" height="${H}" fill="url(#night)"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${earth ? '#bfe9ff' : '#e0e0e6'}" stroke-width="3" opacity="0.85"/>`);
};

/** A tileable patch of Moon ground: fine dust with relief, pebbles and small craters, for the 3D Moon walk. */
const moonGround = () => {
  const S = 1024, r = rng(77);
  const craters = Array.from({ length: 26 }, () => {
    const rad = 8 + r() * 46, x = 70 + r() * (S - 140), y = 70 + r() * (S - 140);
    return `<ellipse cx="${x + rad * 0.12}" cy="${y + rad * 0.1}" rx="${rad}" ry="${rad * 0.92}" fill="url(#lip)"/>
      <ellipse cx="${x}" cy="${y}" rx="${rad * 0.85}" ry="${rad * 0.8}" fill="url(#pit)"/>`;
  }).join('');
  const pebbles = Array.from({ length: 260 }, () => {
    const x = 20 + r() * (S - 40), y = 20 + r() * (S - 40), q = 1 + r() * 3.5;
    return `<circle cx="${x}" cy="${y}" r="${q}" fill="#3a3a3e" opacity="0.55"/><circle cx="${x - q * 0.3}" cy="${y - q * 0.3}" r="${q * 0.6}" fill="#d8d8dc" opacity="0.5"/>`;
  }).join('');
  return svg(S, S, `
  <defs>
    <filter id="relief" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="6" seed="5" stitchTiles="stitch" result="n"/>
      <feDiffuseLighting in="n" lighting-color="#ffffff" surfaceScale="4"><feDistantLight azimuth="210" elevation="42"/></feDiffuseLighting>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="8" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <radialGradient id="pit"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.75" stop-color="#000" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="lip"><stop offset="0.65" stop-color="#fff" stop-opacity="0"/><stop offset="0.88" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="#888" filter="url(#relief)"/>
  <rect width="${S}" height="${S}" filter="url(#grain)" opacity="0.2"/>
  ${craters}${pebbles}`);
};

await jpg(moonGround(), 'moon_ground.jpg');
await Promise.all(ROCKS.map(([seed, stretch, tint], i) => png(rock(seed, stretch, tint), `rock_${i + 1}.png`)));
await png(satellite(), 'junk_satellite.png');
await png(panel(), 'junk_panel.png');
await png(canister(), 'fuel_canister.png');
await png(navRing(), 'nav_ring.png');
await png(flare(), 'sun_flare.png');
await jpg(nebula(), 'space_nebula.jpg');
await png(limb('earth'), 'limb_earth.png');
await png(limb('moon'), 'limb_moon.png');
console.log('space art done');
