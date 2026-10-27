import type { Subject } from '../questions';

/**
 * The rocket, part by part (like a real model rocket kit), as flat vector shapes. One drawing is
 * used everywhere: the workshop and paint shop draw it with SVG, the launch, the flight and the
 * landing draw it with three.js.
 *
 * Coordinates: the rocket stands upright, its centre line at x = 0, y up from the bottom of the
 * engine nozzle (y = 0) to the tip of the nose cone (y = 940). Fins reach out to x = ±150.
 */
export type PartId =
  | 'boosterTube' | 'engineMount' | 'engineHook' | 'fins' | 'launchLug' | 'coupler'
  | 'upperTube' | 'landingLegs' | 'transition' | 'payload' | 'noseBlock' | 'parachute' | 'noseCone'
  // the Lunar Shuttle, built on the Moon from the parts found on the Moon walks
  | 'landingStruts' | 'ascentEngine' | 'mainHull' | 'fuelTanks' | 'rcsPods' | 'solarWings' | 'crewCabin' | 'dockingProbe';

/** The two craft: the rocket built on Earth, and the Lunar Shuttle built on the Moon. */
export type Vehicle = 'rocket' | 'shuttle';

/** Paint roles: `body` and `trim` come from the player's paint job; the rest are fixed. */
export type Fill = 'body' | 'bodyShade' | 'trim' | 'trimShade' | 'metal' | 'metalLight' | 'dark' | 'window' | 'gold' | 'white' | 'chute' | 'chuteStripe';
export type Shape =
  | { kind: 'poly'; pts: number[]; fill: Fill; outline?: boolean }
  | { kind: 'line'; pts: number[]; color: Fill; width: number };

export type PartDef = {
  id: PartId;
  name: string;
  /** Which stage it belongs to: the booster falls away after launch, the upper stage flies on (the shuttle is one craft). */
  stage: 'booster' | 'upper' | 'shuttle';
  subject: Subject;
  /** Right answers needed to earn it on the first mission (major parts need one more later). */
  answers: number;
  major: boolean;
  /** What it does, shown when it's earned. */
  what: string;
  shapes: Shape[];
  /** Bolt holes (rocket coordinates) the player taps to fasten it. */
  bolts: Array<[number, number]>;
  /** Drawing order (higher on top). */
  z: number;
};

// --- shape helpers ---------------------------------------------------------------------------

const rect = (x0: number, y0: number, x1: number, y1: number): number[] => [x0, y0, x1, y0, x1, y1, x0, y1];
const circle = (cx: number, cy: number, r: number, n = 20): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return out;
};
/** A nose cone: an ogive from a base of half-width r at y0 up to a point at y1. */
const ogive = (y0: number, y1: number, r: number, n = 16): number[] => {
  const right: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // a soft curve: full width at the base, rounding in to the tip
    const w = r * Math.sqrt(1 - t * t * 0.98) * (1 - t * 0.15);
    right.push(w, y0 + (y1 - y0) * t);
  }
  const left: number[] = [];
  for (let i = n; i >= 0; i--) left.push(-right[i * 2], right[i * 2 + 1]);
  return [...right, ...left];
};
const mirror = (pts: number[]) => {
  const out: number[] = [];
  for (let i = pts.length - 2; i >= 0; i -= 2) out.push(-pts[i], pts[i + 1]);
  return out;
};
const poly = (pts: number[], fill: Fill, outline = true): Shape => ({ kind: 'poly', pts, fill, outline });
const line = (pts: number[], color: Fill, width: number): Shape => ({ kind: 'line', pts, color, width });

/** A tube with paint, a darker side for roundness, and panel lines. */
function tube(x: number, y0: number, y1: number): Shape[] {
  return [
    poly(rect(-x, y0, x, y1), 'body'),
    poly(rect(x * 0.45, y0 + 3, x - 3, y1 - 3), 'bodyShade', false),
    line([-x * 0.62, y0 + 8, -x * 0.62, y1 - 8], 'white', 5),
  ];
}

// --- the parts -------------------------------------------------------------------------------

const FIN_L = [-56, 196, -56, 52, -150, 18, -150, 74];
const LEG_L = [-48, 396, -60, 392, -62, 518, -50, 524];
/** Landing legs: the hinge each leg swings out from (rocket coordinates). */
export const LEG_HINGE = { x: 55, y: 520 };

const ROCKET_PARTS: Partial<Record<PartId, PartDef>> = {
  boosterTube: {
    id: 'boosterTube', name: 'BOOSTER BODY TUBE', stage: 'booster', subject: 'chemistry', answers: 1, major: false, z: 2,
    what: 'The strong, light tube that holds the booster together',
    shapes: [...tube(56, 50, 340), line([-56, 200, 56, 200], 'dark', 2.5)],
    bolts: [],
  },
  engineMount: {
    id: 'engineMount', name: 'ENGINE MOUNT', stage: 'booster', subject: 'physics', answers: 1, major: true, z: 4,
    what: 'Holds the engine; its centering rings keep it straight',
    shapes: [
      poly([-26, 44, 26, 44, 38, 0, -38, 0], 'metal'),
      line([-30, 22, 30, 22], 'metalLight', 4),
      poly(rect(-58, 42, 58, 56), 'metalLight'),
      poly(rect(-40, 44, 40, 54), 'metal', false),
    ],
    bolts: [[-44, 49], [44, 49]],
  },
  engineHook: {
    id: 'engineHook', name: 'ENGINE HOOK', stage: 'booster', subject: 'physics', answers: 1, major: false, z: 5,
    what: 'Clips the engine in so it can only push, never slip out',
    shapes: [poly([-66, 44, -56, 44, -56, 120, -66, 120], 'metalLight'), poly([-70, 30, -56, 30, -56, 44, -70, 44], 'metal')],
    bolts: [[-61, 104]],
  },
  fins: {
    id: 'fins', name: 'FIN SET', stage: 'booster', subject: 'physics', answers: 1, major: true, z: 1,
    what: 'Keep the rocket flying straight, like the feathers on an arrow',
    shapes: [
      poly(FIN_L, 'trim'),
      poly(mirror(FIN_L), 'trim'),
      poly(rect(-7, 34, 7, 182), 'trimShade'),
    ],
    bolts: [[-66, 120], [66, 120], [0, 150]],
  },
  launchLug: {
    id: 'launchLug', name: 'LAUNCH LUG', stage: 'booster', subject: 'space', answers: 1, major: false, z: 5,
    what: 'Slides on the launch rail so the rocket leaves the pad straight',
    shapes: [poly(rect(56, 226, 70, 296), 'metalLight'), line([63, 232, 63, 290], 'metal', 3)],
    bolts: [[63, 240], [63, 282]],
  },
  coupler: {
    id: 'coupler', name: 'TUBE COUPLER', stage: 'booster', subject: 'chemistry', answers: 1, major: false, z: 6,
    what: 'Joins the two stages; small charges split it apart in flight',
    shapes: [
      poly(rect(-58, 338, 58, 374), 'metal'),
      line([-58, 356, 58, 356], 'gold', 4),
      poly(rect(-58, 338, -40, 374), 'metalLight', false),
    ],
    bolts: [[-30, 356], [30, 356]],
  },
  upperTube: {
    id: 'upperTube', name: 'UPPER BODY TUBE', stage: 'upper', subject: 'chemistry', answers: 1, major: false, z: 2,
    what: 'The second stage: it flies on after the booster drops away',
    shapes: [...tube(48, 372, 600)],
    bolts: [],
  },
  landingLegs: {
    id: 'landingLegs', name: 'LANDING LEGS', stage: 'upper', subject: 'physics', answers: 1, major: true, z: 7,
    what: 'Fold out to stand the lander up; a small engine slows it down',
    shapes: [
      // the descent engine, hidden inside the coupler until the stages split
      poly([-16, 374, 16, 374, 24, 340, -24, 340], 'metal'),
      // folded against the tube: hinged at the top, feet at the bottom (they swing out to land)
      poly(LEG_L, 'dark'),
      poly(mirror(LEG_L), 'dark'),
      poly(rect(-66, 384, -46, 398), 'metalLight'),
      poly(rect(46, 384, 66, 398), 'metalLight'),
    ],
    bolts: [[-55, 508], [55, 508]],
  },
  transition: {
    id: 'transition', name: 'TRANSITION', stage: 'upper', subject: 'space', answers: 1, major: false, z: 3,
    what: 'Narrows the tube smoothly so air slips past',
    shapes: [poly([-48, 598, 48, 598, 40, 642, -40, 642], 'trim'), poly([22, 600, 46, 600, 38, 640, 20, 640], 'trimShade', false)],
    bolts: [[-36, 620], [36, 620]],
  },
  payload: {
    id: 'payload', name: 'PAYLOAD SECTION', stage: 'upper', subject: 'body', answers: 1, major: true, z: 3,
    what: 'The crew cabin: air, water and food for the astronaut',
    shapes: [
      poly(rect(-40, 640, 40, 772), 'white'),
      poly(rect(18, 643, 37, 769), 'metalLight', false),
      poly(circle(-4, 706, 21), 'dark'),
      poly(circle(-4, 706, 15), 'window', false),
      poly(circle(-9, 712, 4.5, 10), 'white', false),
      poly(rect(-30, 650, -14, 676), 'metalLight'),
    ],
    bolts: [[-30, 742], [30, 742]],
  },
  noseBlock: {
    id: 'noseBlock', name: 'NOSE BLOCK', stage: 'upper', subject: 'chemistry', answers: 1, major: false, z: 4,
    what: 'Plugs the nose on; the shock cord inside keeps the parts together',
    shapes: [poly(rect(-40, 770, 40, 786), 'metalLight'), line([-28, 778, 28, 778], 'gold', 3)],
    bolts: [[0, 778]],
  },
  parachute: {
    id: 'parachute', name: 'PARACHUTE', stage: 'upper', subject: 'physics', answers: 1, major: false, z: 5,
    what: 'Opens in air to slow the fall (useless where there is no air!)',
    shapes: [poly(rect(-32, 786, 32, 802), 'chute'), poly(rect(-12, 786, 12, 802), 'chuteStripe', false)],
    bolts: [[-22, 794], [22, 794]],
  },
  noseCone: {
    id: 'noseCone', name: 'NOSE CONE', stage: 'upper', subject: 'space', answers: 1, major: true, z: 6,
    what: 'Cuts through the air and shields the cabin from heat',
    shapes: [poly(ogive(800, 940, 40), 'trim'), poly([10, 806, 34, 806, 22, 880, 8, 880], 'trimShade', false)],
    bolts: [[-24, 816], [24, 816]],
  },
};

// --- the Lunar Shuttle --------------------------------------------------------------------------
// Upright like the rocket (y up from the ground at 0), but squat and wide: a gold-foil landing
// platform on four struts (it stays behind on the Moon at liftoff, like Apollo's), the ascent
// engine, an octagonal hull with fuel spheres and thruster pods, solar wings, the faceted crew
// cabin (it comes home on its own as the re-entry capsule) and a docking probe on top.

const STRUT_L = [-140, 128, -126, 140, -232, 16, -246, 8];
const WING_L = rect(-345, 222, -250, 292);
const POD_L = rect(-178, 330, -148, 372);
const WINDOW_L = [-74, 428, -22, 428, -22, 470, -56, 470];

const SHUTTLE_PARTS: Partial<Record<PartId, PartDef>> = {
  landingStruts: {
    id: 'landingStruts', name: 'LANDING STRUTS', stage: 'shuttle', subject: 'physics', answers: 1, major: false, z: 1,
    what: 'Four legs and a platform to stand on; they stay on the Moon as a launch pad',
    shapes: [
      poly(STRUT_L, 'metal'), poly(mirror(STRUT_L), 'metal'),
      line([-150, 152, -206, 40], 'metalLight', 5), line([150, 152, 206, 40], 'metalLight', 5),
      poly(rect(-262, 0, -214, 10), 'metalLight'), poly(rect(214, 0, 262, 10), 'metalLight'),
      poly([-150, 120, 150, 120, 166, 142, 150, 166, -150, 166, -166, 142], 'gold'),
      line([-120, 132, 120, 132], 'trimShade', 3), line([-120, 154, 120, 154], 'trimShade', 3),
    ],
    bolts: [[-120, 142], [120, 142]],
  },
  ascentEngine: {
    id: 'ascentEngine', name: 'ASCENT ENGINE', stage: 'shuttle', subject: 'physics', answers: 1, major: true, z: 2,
    what: 'One strong engine to lift the shuttle off the Moon',
    shapes: [poly([-30, 168, 30, 168, 50, 126, -50, 126], 'metal'), poly(rect(-52, 166, 52, 182), 'metalLight'), line([-36, 146, 36, 146], 'metalLight', 4)],
    bolts: [[-40, 174], [40, 174]],
  },
  mainHull: {
    id: 'mainHull', name: 'MAIN HULL', stage: 'shuttle', subject: 'chemistry', answers: 1, major: true, z: 3,
    what: 'The strong, light body that holds everything together',
    shapes: [
      poly([-130, 178, 130, 178, 162, 215, 162, 320, 130, 358, -130, 358, -162, 320, -162, 215], 'body'),
      poly([62, 181, 128, 181, 158, 216, 158, 319, 128, 355, 62, 355], 'bodyShade', false),
      poly(rect(-161, 290, 161, 306), 'trim', false),
      line([-150, 250, 150, 250], 'trimShade', 3),
    ],
    bolts: [[-110, 200], [110, 200], [0, 336]],
  },
  fuelTanks: {
    id: 'fuelTanks', name: 'FUEL SPHERES', stage: 'shuttle', subject: 'chemistry', answers: 1, major: false, z: 4,
    what: 'Two round tanks: round tanks hold pressure best',
    shapes: [
      poly(circle(-202, 262, 44, 24), 'metalLight'), poly(circle(202, 262, 44, 24), 'metalLight'),
      line([-246, 262, -158, 262], 'gold', 5), line([158, 262, 246, 262], 'gold', 5),
      poly(circle(-214, 278, 10, 12), 'white', false), poly(circle(190, 278, 10, 12), 'white', false),
    ],
    bolts: [[-202, 236], [202, 236]],
  },
  rcsPods: {
    id: 'rcsPods', name: 'THRUSTER PODS', stage: 'shuttle', subject: 'space', answers: 1, major: false, z: 5,
    what: 'Little jets in four directions to turn and to dock gently',
    shapes: [
      poly(POD_L, 'metal'), poly(mirror(POD_L), 'metal'),
      poly([-178, 344, -198, 336, -198, 366, -178, 358], 'dark'), poly([178, 344, 198, 336, 198, 366, 178, 358], 'dark'),
      poly([-170, 372, -156, 372, -152, 388, -174, 388], 'dark'), poly([156, 372, 170, 372, 174, 388, 152, 388], 'dark'),
    ],
    bolts: [[-163, 351], [163, 351]],
  },
  solarWings: {
    id: 'solarWings', name: 'SOLAR WINGS', stage: 'shuttle', subject: 'physics', answers: 1, major: false, z: 0.5,
    what: 'Turn sunlight into electricity for the whole trip',
    shapes: [
      poly(rect(-252, 252, -160, 262), 'metalLight'), poly(rect(160, 252, 252, 262), 'metalLight'),
      poly(WING_L, 'window'), poly(mirror(WING_L), 'window'),
      line([-313, 224, -313, 290], 'metalLight', 2), line([-282, 224, -282, 290], 'metalLight', 2), line([-344, 257, -251, 257], 'metalLight', 2),
      line([313, 224, 313, 290], 'metalLight', 2), line([282, 224, 282, 290], 'metalLight', 2), line([251, 257, 344, 257], 'metalLight', 2),
    ],
    bolts: [[-206, 257], [206, 257]],
  },
  crewCabin: {
    id: 'crewCabin', name: 'CREW CABIN', stage: 'shuttle', subject: 'body', answers: 1, major: true, z: 6,
    what: 'Air, water and seats for the crew; it comes home as the re-entry capsule',
    shapes: [
      poly(rect(-118, 352, 118, 366), 'dark'),
      poly([-112, 364, 112, 364, 122, 438, 84, 492, -84, 492, -122, 438], 'white'),
      poly([40, 366, 110, 366, 120, 438, 84, 489, 40, 489], 'metalLight', false),
      poly(rect(-121, 396, 121, 408), 'trim', false),
      poly(WINDOW_L, 'window'), poly(mirror(WINDOW_L), 'window'),
    ],
    bolts: [[-96, 382], [96, 382]],
  },
  dockingProbe: {
    id: 'dockingProbe', name: 'DOCKING PROBE', stage: 'shuttle', subject: 'space', answers: 1, major: true, z: 7,
    what: 'Slides into the space station\'s port and locks on',
    shapes: [poly(rect(-34, 490, 34, 520), 'metal'), poly(rect(-20, 520, 20, 540), 'metalLight'), poly([-10, 540, 10, 540, 0, 572], 'gold')],
    bolts: [[0, 505]],
  },
};

/** Every part of both craft. */
export const PARTS = { ...ROCKET_PARTS, ...SHUTTLE_PARTS } as Record<PartId, PartDef>;

/** The order the rocket is built in, bottom up: each part fixes onto the ones before. */
export const BUILD_ORDER: PartId[] = [
  'boosterTube', 'engineMount', 'engineHook', 'fins', 'launchLug', 'coupler',
  'upperTube', 'landingLegs', 'transition', 'payload', 'noseBlock', 'parachute', 'noseCone',
];
/** The shuttle, bottom up. */
export const SHUTTLE_ORDER: PartId[] = ['landingStruts', 'ascentEngine', 'mainHull', 'fuelTanks', 'rcsPods', 'solarWings', 'crewCabin', 'dockingProbe'];
export const ORDER: Record<Vehicle, PartId[]> = { rocket: BUILD_ORDER, shuttle: SHUTTLE_ORDER };
/** What flies after the shuttle lifts off (the struts stay on the Moon), and what comes home (the cabin). */
export const SHUTTLE_ASCENT = SHUTTLE_ORDER.filter((p) => p !== 'landingStruts');
export const CAPSULE: PartId[] = ['crewCabin'];
export const BOOSTER_PARTS = BUILD_ORDER.filter((p) => PARTS[p].stage === 'booster');
export const UPPER_PARTS = BUILD_ORDER.filter((p) => PARTS[p].stage === 'upper');
/** Drawn back to front (both craft). */
export const DRAW_ORDER = [...BUILD_ORDER, ...SHUTTLE_ORDER].sort((a, b) => PARTS[a].z - PARTS[b].z);

/**
 * How each craft is shown in the workshop: the rocket lies on its side (nose to the right), the
 * shuttle stands upright. `toView` maps craft coordinates to the view; `matrix` is the same as an
 * SVG transform.
 */
export const VIEW: Record<Vehicle, { w: number; h: number; matrix: string; toView: (x: number, y: number) => [number, number] }> = {
  rocket: { w: 980, h: 320, matrix: 'matrix(0 1 1 0 20 160)', toView: (x, y) => [y + 20, x + 160] },
  shuttle: { w: 720, h: 640, matrix: 'matrix(1 0 0 -1 360 610)', toView: (x, y) => [x + 360, 610 - y] },
};
export const vehicleOf = (id: PartId): Vehicle => (PARTS[id].stage === 'shuttle' ? 'shuttle' : 'rocket');
/** A part's box in its craft's workshop view. */
export function viewBox(id: PartId) {
  const b = partBox(id);
  const v = VIEW[vehicleOf(id)];
  const [ax, ay] = v.toView(b.x0, b.y0), [bx, by] = v.toView(b.x1, b.y1);
  return { X: Math.min(ax, bx), Y: Math.min(ay, by), W: Math.abs(bx - ax), H: Math.abs(by - ay) };
}
/** Where the stages split (top of the coupler). */
export const SPLIT_Y = 374;
export const ROCKET_HEIGHT = 940;
export const ROCKET_HALF_WIDTH = 150;

/** A part's box, in rocket coordinates. */
export function partBox(id: PartId) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of PARTS[id].shapes) {
    for (let i = 0; i < s.pts.length; i += 2) {
      x0 = Math.min(x0, s.pts[i]); x1 = Math.max(x1, s.pts[i]);
      y0 = Math.min(y0, s.pts[i + 1]); y1 = Math.max(y1, s.pts[i + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

// --- paint -------------------------------------------------------------------------------------

export type Pattern = 'plain' | 'bands' | 'checker' | 'flames';
export type RocketDesign = { name: string; body: string; trim: string; pattern: Pattern };

export const PAINTS = ['#f2ece0', '#c4493b', '#2f6fd6', '#f2c13d', '#4fa35a', '#a7adb7', '#2b2b33', '#8a55c9', '#f08a3c', '#3ec7c2'];
export const PAINT_NAMES: Record<string, string> = {
  '#f2ece0': 'WHITE', '#c4493b': 'RED', '#2f6fd6': 'BLUE', '#f2c13d': 'GOLD', '#4fa35a': 'GREEN',
  '#a7adb7': 'SILVER', '#2b2b33': 'BLACK', '#8a55c9': 'PURPLE', '#f08a3c': 'ORANGE', '#3ec7c2': 'TEAL',
};
export const PATTERNS: Pattern[] = ['plain', 'bands', 'checker', 'flames'];
export const NAME_IDEAS = ['BOLT ONE', 'STARHOPPER', 'COMET KID', 'LUNA', 'APOLLO KID', 'NOVA', 'ROCKY', 'ZOOM'];
export const DEFAULT_DESIGN: RocketDesign = { name: 'BOLT ONE', body: '#f2ece0', trim: '#c4493b', pattern: 'bands' };
export const MAX_NAME = 12;
/** Only letters, digits, spaces and a few marks: they're all in the painted font. */
export const cleanName = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 \-!.]/g, '').slice(0, MAX_NAME);

/** Darker version of a colour, for the shaded side of a tube. */
export function shade(hex: string, k = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

/** The colour of each fill role for a paint job. */
export function palette(d: RocketDesign): Record<Fill, string> {
  return {
    body: d.body, bodyShade: shade(d.body), trim: d.trim, trimShade: shade(d.trim),
    metal: '#4a4f57', metalLight: '#8a909b', dark: '#2a2d33', window: '#0f2445', gold: '#f2c13d', white: '#f7f4ee',
    chute: '#f08a3c', chuteStripe: '#f7f4ee',
  };
}

/** The paint job's pattern, as extra shapes over the tubes (in the trim colour). */
export function decals(d: RocketDesign, part: PartId): Shape[] {
  const tubes: Partial<Record<PartId, [number, number, number]>> = { boosterTube: [56, 50, 340], upperTube: [48, 372, 600] };
  const t = tubes[part];
  if (!t) return [];
  const [x, y0, y1] = t;
  switch (d.pattern) {
    case 'bands':
      return [poly(rect(-x, y1 - 30, x, y1 - 14), 'trim', false), poly(rect(-x, y0 + 14, x, y0 + 30), 'trim', false)];
    case 'checker': {
      const out: Shape[] = [];
      const size = x / 2;
      for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
        if ((row + col) % 2) continue;
        const yy = y1 - 16 - size * (row + 1);
        out.push(poly(rect(-x + col * size, yy, -x + (col + 1) * size, yy + size), 'trim', false));
      }
      return out;
    }
    case 'flames': {
      // flames licking up from the bottom of the tube
      const pts = [-x, y0 + 4];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const xa = -x + ((i + 0.5) / n) * 2 * x, xb = -x + ((i + 1) / n) * 2 * x;
        pts.push(xa, y0 + 70 + (i % 2) * 30, xb, y0 + 26);
      }
      pts.push(x, y0 + 4);
      return [poly(pts, 'trim', false)];
    }
    default:
      return [];
  }
}

/** Where the name is painted: along the upper body tube, reading from the bottom up. */
export const NAME_AREA = { y0: 404, y1: 560, height: 46 };
