import type { Subject } from '../questions';
import { SHUTTLE_ORDER, type PartId as RocketPartId, type Vehicle } from '../rocket/model';

// --- the campaign: two worlds, one round trip ------------------------------------------------

export type WorldId = 'outbound' | 'homebound';

export const WORLDS: Array<{ id: WorldId; name: string; stages: [number, number]; tagline: string }> = [
  { id: 'outbound', name: 'EARTH TO MOON', stages: [1, 20], tagline: 'Launch from Earth, cross 384,000 km of space and land on the Moon' },
  { id: 'homebound', name: 'MOON TO EARTH', stages: [21, 27], tagline: 'Find the shuttle parts on the Moon, fly to the space station, dock, repair, and ride the capsule home' },
];
export const STAGE_COUNT = 27;
export const MOON_DISTANCE_KM = 384_400;

/**
 * What a stage is: one leg of the trip.
 *  earthLaunch – build, paint and fuel the rocket, launch it and fly into Earth orbit
 *  cruise      – a systems check, then a long flight with a fault to fix on the way
 *  fault       – a flight with two faults to fix (logic questions)
 *  storm       – a flight with a meteor storm: answer to charge shields, then fly through the rocks
 *  moonLanding – the last stretch to the Moon, then the slow landing, the hatch, the flag
 *  moonwalk    – walk the Moon in any direction to find the scattered rocket parts
 *  moonLaunch  – rebuild the rocket from the found parts, fuel it and launch from the Moon
 *  moonLaunch  – build the Lunar Shuttle from the parts found on the Moon, fuel it and lift off
 *  transfer    – the quick hop to the space station: five course burns, a question each
 *  dock        – dock with the spinning station by hand: match the spin, centre up, come in slowly
 *  repair      – fix the ship's systems at the station
 *  reentry     – the crew capsule comes home: re-entry, the parachutes (you fire them), the sea
 */
export type Leg = 'earthLaunch' | 'cruise' | 'fault' | 'storm' | 'moonLanding' | 'moonwalk' | 'moonLaunch' | 'transfer' | 'dock' | 'repair' | 'reentry';

const LEGS: Record<WorldId, Leg[]> = {
  outbound: [
    'earthLaunch', 'cruise', 'cruise', 'fault', 'cruise', 'storm', 'cruise', 'fault', 'cruise', 'storm',
    'cruise', 'fault', 'storm', 'cruise', 'cruise', 'fault', 'storm', 'cruise', 'fault', 'moonLanding',
  ],
  homebound: ['moonwalk', 'moonwalk', 'moonLaunch', 'transfer', 'dock', 'repair', 'reentry'],
};

export const LEG_INFO: Record<Leg, { name: string; icon: string; blurb: string }> = {
  earthLaunch: { name: 'LIFTOFF', icon: '🚀', blurb: 'Build your rocket part by part, fuel it and launch into Earth orbit' },
  cruise: { name: 'DEEP SPACE', icon: '✨', blurb: 'Check the systems, then fly on through space' },
  fault: { name: 'SYSTEM FAULTS', icon: '🔧', blurb: 'Things break out here: solve the problems to fix them' },
  storm: { name: 'METEOR STORM', icon: '☄️', blurb: 'A storm of rocks ahead: answer to charge your shields, then find the gaps' },
  moonLanding: { name: 'MOON LANDING', icon: '🌙', blurb: 'The last stretch, then a slow landing and the first steps on the Moon' },
  moonwalk: { name: 'MOON WALK', icon: '👣', blurb: 'The Lunar Shuttle\'s parts are scattered across the Moon: walk out and collect them' },
  moonLaunch: { name: 'LUNAR SHUTTLE', icon: '🌕', blurb: 'Build the new shuttle from the parts you found, fuel it and lift off from the Moon' },
  transfer: { name: 'TO THE STATION', icon: '🛰️', blurb: 'A quick hop to the space station: five course burns, five questions' },
  dock: { name: 'DOCKING', icon: '🎯', blurb: 'Dock by hand with the spinning station: match the spin, centre up, come in slowly' },
  repair: { name: 'REPAIRS', icon: '🔧', blurb: 'Fix every system on board before the ride home' },
  reentry: { name: 'HOME', icon: '🪂', blurb: 'The capsule\'s fiery ride home: you fire the parachutes, then splashdown' },
};

/** Legs with a flight through space. */
export const hasFlight = (leg: Leg) => leg !== 'moonwalk' && leg !== 'dock' && leg !== 'repair' && leg !== 'reentry';
/** Legs that start with a systems check (the rocket is already built). */
export const hasPrep = (leg: Leg) => hasFlight(leg) && leg !== 'earthLaunch' && leg !== 'moonLaunch' && leg !== 'transfer';
/** Which craft flies a stage: the rocket out to the Moon, the Lunar Shuttle from the Moon on. */
export const vehicleFor = (s: { world: WorldId }): Vehicle => (s.world === 'outbound' ? 'rocket' : 'shuttle');

// --- rocket parts --------------------------------------------------------------------------

/**
 * Every question builds one part of the rocket; the subject decides which:
 * physics → engine, space → fuel tank, chemistry → shield, the human body → life support.
 * A right answer installs the part; a wrong one leaves its slot empty (a weaker rocket).
 */
export type PartId = 'engine' | 'tank' | 'shield' | 'life';

export const PARTS: Record<PartId, { name: string; subject: Subject; subjectName: string; what: string; color: string }> = {
  engine: { name: 'ENGINE', subject: 'physics', subjectName: 'PHYSICS', what: 'faster steering', color: '#ff8a4a' },
  tank: { name: 'FUEL TANK', subject: 'space', subjectName: 'SPACE', what: 'flies farther', color: '#ffd45c' },
  shield: { name: 'SHIELD', subject: 'chemistry', subjectName: 'CHEMISTRY', what: 'blocks one hit', color: '#7fd6ff' },
  life: { name: 'LIFE SUPPORT', subject: 'body', subjectName: 'HUMAN BODY', what: '+1 heart', color: '#ff7a8a' },
};
export const PART_ORDER: PartId[] = ['engine', 'tank', 'shield', 'life'];

/** Hearts: every stage starts with START_LIVES (+ the med bay upgrade); life support adds up to MAX_LIVES. */
export const START_LIVES = 3;
export const MAX_LIVES = 5;
/** Shields charged in a meteor storm are capped. */
export const MAX_SHIELD = 6;

// --- hangar (permanent upgrades bought with coins) -------------------------------------------

export type UpgradeId = 'engine' | 'tank' | 'shield' | 'life';
export const UPGRADES: Record<UpgradeId, { name: string; blurb: string; costs: number[] }> = {
  engine: { name: 'ION BOOSTER', blurb: '+1 engine power on every flight', costs: [150, 450, 1000] },
  tank: { name: 'RESERVE TANK', blurb: '+half a tank of fuel on every flight', costs: [120, 400, 900] },
  shield: { name: 'SHIELD GENERATOR', blurb: '+1 shield on every flight', costs: [200, 600, 1300] },
  life: { name: 'MED BAY', blurb: '+1 heart at the start of every stage', costs: [250, 700, 1500] },
};
export const UPGRADE_MAX = 3;
export const upgradeCost = (id: UpgradeId, level: number) => UPGRADES[id].costs[level] ?? Infinity;

// --- stages ----------------------------------------------------------------------------------

export type StageKind = 'normal' | 'bonus' | 'boss';

export type StageInfo = {
  n: number;
  world: WorldId;
  /** 0-based index of the world. */
  wi: number;
  /** 1..20 within the world. */
  local: number;
  leg: Leg;
  kind: StageKind;
  /** Question difficulty tier (1..6), rising through each world. */
  tier: number;
  /** Flights in the stage. */
  rounds: number;
  /** Forward speed of the rocket (world units per second). */
  speed: number;
  /** Boss stages: coins shared across all the boss questions. */
  bossReward: number;
};

const TIER_BY_LOCAL: Record<WorldId, number[]> = {
  outbound: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4],
  homebound: [3, 3, 4, 4, 5, 5, 6],
};

export function stageInfo(n: number): StageInfo {
  const wi = Math.max(0, WORLDS.findIndex((w) => n >= w.stages[0] && n <= w.stages[1]));
  const world = WORLDS[wi].id;
  const local = n - WORLDS[wi].stages[0] + 1;
  const leg = LEGS[world][local - 1];
  const kind: StageKind = world === 'outbound'
    ? (local === 10 || local === 20 ? 'boss' : local === 5 || local === 15 ? 'bonus' : 'normal')
    : leg === 'dock' || leg === 'reentry' ? 'boss' : 'normal';
  const tier = TIER_BY_LOCAL[world][local - 1];
  const speed = 250 + local * 4 + wi * 30;
  const bossReward = [200, 400][wi];
  return { n, world, wi, local, leg, kind, tier, rounds: 1, speed, bossReward };
}

/** One boss question pays a share of the stage's boss reward (about 20 questions a stage). */
export const bossQuestionReward = (s: StageInfo) => Math.round(s.bossReward / 20);

/** Right answers needed to make (or, on the Moon, to recover) a rocket part: two for the major parts on the way home. */
export function partAnswers(s: StageInfo, major: boolean) {
  if (!major) return 1;
  return 1 + (s.wi >= 1 ? 1 : 0);
}

/** Fuelling on the pad: notches of fuel and of liquid oxygen (one per right answer), and crew checks. */
export function fuelNeed(s: StageInfo) {
  const tanks = 2 + s.wi;
  return { fuel: tanks, oxidizer: tanks, crew: 1 + s.wi };
}

/** A wrong answer while fuelling spills half a notch. */
export const LEAK = 0.5;

/** The systems check before a flight: a question for each gauge, in order (a right answer charges it). */
export type Gauge = 'engine' | 'shield' | 'life';
export const GAUGE_INFO: Record<Gauge, { name: string; subject: Subject; what: string }> = {
  engine: { name: 'ENGINE TUNE-UP', subject: 'physics', what: 'faster steering' },
  shield: { name: 'SHIELD CHARGE', subject: 'chemistry', what: '+1 shield' },
  life: { name: 'LIFE SUPPORT', subject: 'body', what: '+1 heart' },
};
export function prepPlan(s: StageInfo): Gauge[] {
  const engine = 1 + (s.local >= 12 ? 1 : 0);
  const shield = 1 + Math.floor(s.local / 8) + s.wi;
  return [...Array(engine).fill('engine'), ...Array(shield).fill('shield'), 'life'];
}

/** World units from the start of the flight to its end. */
export function journeyLength(s: StageInfo) {
  switch (s.leg) {
    case 'moonwalk': case 'dock': case 'repair': case 'reentry': return 0;
    case 'earthLaunch': case 'moonLaunch': return 5000;
    case 'transfer': return 8500;
    case 'moonLanding': return 9000;
    default: return 12000 + s.local * 350 + s.wi * 1500 + (s.leg === 'storm' ? stormLength(s) : 0);
  }
}
/** The meteor storm's length (world units). */
export const stormLength = (s: StageInfo) => 3500 + s.local * 100;

/**
 * How far along the trip a flight goes, as fractions of the Earth–Moon distance (null for the
 * orbit flights): out to the Moon over stages 2–20; home, the hop to the space station (which
 * waits in high Earth orbit) covers almost all of it.
 */
export const STATION_AT = 0.95;
export function journeySpan(s: StageInfo): { from: number; to: number; target: 'MOON' | 'EARTH' } | null {
  if (s.world === 'outbound') return s.local < 2 ? null : { from: (s.local - 2) / 19, to: (s.local - 1) / 19, target: 'MOON' };
  return s.leg === 'transfer' ? { from: 0, to: STATION_AT, target: 'EARTH' } : null;
}
/** Kilometres still to go to the Moon (or home), at this point of the flight. */
export function kmToGo(s: StageInfo, progress: number): number | null {
  const span = journeySpan(s);
  if (!span) return null;
  const done = span.from + (span.to - span.from) * Math.max(0, Math.min(1, progress));
  return Math.round((MOON_DISTANCE_KM * (1 - done)) / 100) * 100;
}

// --- faults, repairs, the Moon walk and docking ------------------------------------------------

export type FaultId = 'oxygen' | 'engine' | 'nav' | 'power' | 'radio' | 'solar' | 'computer' | 'radar' | 'dockingComputer' | 'heatShield';
export const FAULTS: Record<FaultId, { name: string; sub: string }> = {
  oxygen: { name: 'OXYGEN LEAK', sub: 'Find the leak before the air runs low' },
  engine: { name: 'ENGINE OVERHEATING', sub: 'Work out the cooling settings' },
  nav: { name: 'NAVIGATION ERROR', sub: 'We are drifting off course: recalculate' },
  power: { name: 'POWER FAILURE', sub: 'Reroute the power, one circuit at a time' },
  radio: { name: 'RADIO SILENCE', sub: 'Mission Control can\'t hear us: fix the radio' },
  solar: { name: 'SOLAR PANEL JAMMED', sub: 'Unjam the panel to charge the batteries' },
  computer: { name: 'COMPUTER CRASH', sub: 'Restart the flight computer step by step' },
  radar: { name: 'LANDING RADAR GLITCH', sub: 'Fix it before the descent' },
  dockingComputer: { name: 'DOCKING COMPUTER OFFLINE', sub: 'We\'ll have to dock by hand: check the numbers' },
  heatShield: { name: 'HEAT SHIELD CHECK', sub: 'Make sure it can survive re-entry' },
};
const ROAD_FAULTS: FaultId[] = ['oxygen', 'engine', 'nav', 'power', 'radio', 'solar', 'computer'];

/**
 * The show stoppers: what happens on the way. Most stop the flight for questions; some (space junk,
 * a mayday call) just warn and let the flying do the work. Each plays differently:
 *  fault      – equipment failure: logic problems until it's fixed (a wrong answer burns out a shield cell)
 *  storm      – asteroid storm ahead: a set number of questions, a shield for each right one, then rock walls
 *  collision  – a huge asteroid on a collision course: one question against the clock, or crash
 *  flare      – a solar flare: answer as many as you can before the radiation arrives
 *  navigation – navigation error: re-plot the course, then fly through a line of beacon rings
 *  fuelLeak   – fuel leak: patch it, then catch the fuel canisters before the tank runs dry
 *  debris     – space junk: dead satellites and torn solar panels tumbling across the path
 *  rescue     – mayday: fly into the stranded astronaut, then a check-up question brings them aboard
 *  comms      – a coded message from Mission Control: decode it for a reward
 */
export type EventKind = 'fault' | 'storm' | 'collision' | 'flare' | 'navigation' | 'fuelLeak' | 'debris' | 'rescue' | 'comms' | 'burn';
export const EVENT_INFO: Record<EventKind, { name: string; icon: string; how: string; blocking: boolean }> = {
  fault: { name: 'EQUIPMENT FAILURE', icon: '🔧', how: 'solve logic problems to fix it', blocking: true },
  storm: { name: 'ASTEROID STORM', icon: '☄️', how: 'each right answer charges a shield, then find the gaps', blocking: true },
  collision: { name: 'COLLISION COURSE', icon: '💥', how: 'answer before the clock runs out to fire the thrusters', blocking: true },
  flare: { name: 'SOLAR FLARE', icon: '☀️', how: 'beat the clock to shield the crew from radiation', blocking: true },
  navigation: { name: 'NAVIGATION ERROR', icon: '🧭', how: 're-plot the course, then fly through the beacon rings', blocking: true },
  fuelLeak: { name: 'FUEL LEAK', icon: '⛽', how: 'patch the leak, then catch the fuel canisters', blocking: true },
  debris: { name: 'SPACE JUNK', icon: '🛰️', how: 'dead satellites tumbling across the path: weave through', blocking: false },
  rescue: { name: 'MAYDAY', icon: '🆘', how: 'fly into the stranded astronaut to bring them aboard', blocking: false },
  comms: { name: 'SECRET MESSAGE', icon: '📡', how: 'decode Mission Control\'s message for a reward', blocking: true },
  burn: { name: 'COURSE BURN', icon: '🔥', how: 'answer right to fire the engine exactly on time', blocking: true },
};
/** The hop to the space station: this many course burns, a question each. */
export const TRANSFER_BURNS = 5;
/** Something on the way. `need`: right answers (faults, fuel leak) or questions asked (the rest); `timed`: seconds on the clock. */
export type CourseEvent = { id: number; x: number; kind: EventKind; fault?: FaultId; need: number; timed?: number };

/** Faults need right answers to fix; a storm asks a set number of questions, a shield for each right one. */
export const faultNeed = (s: StageInfo) => 1 + (s.tier >= 4 ? 1 : 0);
export const stormQuestions = (s: StageInfo) => 2 + Math.floor(s.local / 8) + s.wi;
/** Seconds to answer before a collision, and for the whole solar flare (and its questions). */
export const COLLISION_SECONDS = 15;
export const FLARE_SECONDS = 35;
export const FLARE_QUESTIONS = 3;
/** Beacon rings after a navigation error; fuel canisters after a fuel leak, and what the leak costs. */
export const RINGS = 5;
export const RING_HALF = 72;
export const CANISTERS = 6;
export const CANISTER_FUEL = 0.4;
export const LEAK_LOSS = 1.0;
/** Coins for decoding a message, rescuing an astronaut, flying through a ring, catching a canister. */
export const REWARD = { comms: 40, rescue: 25, ring: 5, canister: 3 };

/** The stage each show stopper first turns up in (faults and storms come with their own legs). */
export const EVENT_FIRST: Partial<Record<EventKind, number>> = { collision: 2, debris: 3, navigation: 4, rescue: 5, fuelLeak: 7, flare: 8, comms: 9 };
const DECK = Object.keys(EVENT_FIRST) as EventKind[];

/**
 * The show stoppers a stage picks from the deck (on top of its leg's own): any new one first, then
 * a seeded mix that avoids repeating the previous stage's picks where it can.
 */
const picked = new Map<number, EventKind[]>();
export function stagePicks(stage: StageInfo): EventKind[] {
  const cached = picked.get(stage.n);
  if (cached) return cached;
  const count = stage.leg === 'cruise' ? 3 : stage.leg === 'fault' || stage.leg === 'storm' ? 1 : 0;
  const available = DECK.filter((k) => (EVENT_FIRST[k] ?? 99) <= stage.n);
  const fresh = available.filter((k) => EVENT_FIRST[k] === stage.n);
  const before = stage.n > 1 ? stagePicks(stageInfo(stage.n - 1)) : [];
  const r = rng(stage.n * 389 + 5);
  const shuffled = [...available].sort(() => r() - 0.5);
  const rest = [...shuffled.filter((k) => !before.includes(k)), ...shuffled.filter((k) => before.includes(k))].filter((k) => !fresh.includes(k));
  const out = [...fresh, ...rest].slice(0, count);
  // early on the deck is thin: equipment failures fill the gaps
  while (out.length < count) out.push('fault');
  picked.set(stage.n, out);
  return out;
}

/** Every show stopper on a stage, in the order they come (each leg brings its own as well). */
export function stageEvents(stage: StageInfo): Array<{ kind: EventKind; fault?: FaultId }> {
  const p = stagePicks(stage).map((kind) => ({ kind }));
  switch (stage.leg) {
    case 'cruise': return p;
    case 'fault': return [{ kind: 'fault' }, ...p, { kind: 'fault' }];
    case 'storm': return [...p, { kind: 'storm' }];
    case 'moonLanding': return [{ kind: 'collision' }, { kind: 'fault', fault: 'radar' }];
    case 'transfer': return Array.from({ length: TRANSFER_BURNS }, () => ({ kind: 'burn' as EventKind }));
    default: return [];
  }
}

/** The ship's systems repaired at the space station. */
export type SystemId = 'heatShield' | 'oxygen' | 'solar' | 'nav' | 'computer' | 'chutes';
export const SYSTEMS: Record<SystemId, { name: string; icon: string; subject: Subject; what: string }> = {
  heatShield: { name: 'HEAT SHIELD', icon: '🛡️', subject: 'chemistry', what: 'cracked by a meteor' },
  oxygen: { name: 'OXYGEN SCRUBBER', icon: '🫧', subject: 'body', what: 'the air is getting stale' },
  solar: { name: 'SOLAR PANELS', icon: '☀️', subject: 'physics', what: 'only half the power' },
  nav: { name: 'NAVIGATION', icon: '🧭', subject: 'space', what: 'needs a star fix' },
  computer: { name: 'FLIGHT COMPUTER', icon: '💻', subject: 'logic', what: 'full of errors' },
  chutes: { name: 'PARACHUTES', icon: '🪂', subject: 'physics', what: 'tangled lines' },
};
export const SYSTEM_ORDER: SystemId[] = ['heatShield', 'oxygen', 'solar', 'nav', 'computer', 'chutes'];
export const repairNeed = (id: SystemId) => (id === 'heatShield' || id === 'computer' ? 2 : 1);

/**
 * The Moon walk: the shuttle's parts lie scattered around the landing site, across rolling ground
 * full of craters, with boulders in the way. Units are about a centimetre: the walk area is about
 * 50 m across, and the ground runs on to the horizon.
 */
export type MoonField = {
  radius: number;
  parts: Array<{ part: RocketPartId; x: number; y: number }>;
  boulders: Array<{ x: number; y: number; r: number }>;
  craters: Array<{ x: number; y: number; r: number }>;
};
/** The first walk finds the lower half of the shuttle, the second the upper half. */
export const walkParts = (s: StageInfo): RocketPartId[] => (s.local === 1 ? SHUTTLE_ORDER.slice(0, 4) : SHUTTLE_ORDER.slice(4));
/** How close (world units) the astronaut has to get to pick a part up. */
export const PICKUP_R = 90;
export const WALK_SPEED = 300;

export function moonField(s: StageInfo): MoonField {
  const r = rng(s.n * 613 + 11);
  const radius = 2600;
  const list = walkParts(s);
  const parts: MoonField['parts'] = [];
  list.forEach((part, i) => {
    for (let tries = 0; tries < 40; tries++) {
      const a = (i / list.length) * Math.PI * 2 + r() * 0.8;
      const d = 650 + r() * 1300;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (parts.every((p) => Math.hypot(p.x - x, p.y - y) > 360)) { parts.push({ part, x, y }); return; }
    }
    parts.push({ part, x: Math.cos(i) * 900, y: Math.sin(i) * 900 });
  });
  const boulders: MoonField['boulders'] = [];
  for (let tries = 0; boulders.length < 40 && tries < 600; tries++) {
    const br = 30 + r() * 70;
    const x = (r() * 2 - 1) * radius, y = (r() * 2 - 1) * radius;
    if (Math.hypot(x, y) < 320 || Math.hypot(x, y) > radius - br) continue;
    if (parts.some((p) => Math.hypot(p.x - x, p.y - y) < br + 140)) continue;
    if (boulders.some((b) => Math.hypot(b.x - x, b.y - y) < br + b.r + 120)) continue;
    boulders.push({ x, y, r: br });
  }
  // craters of every size, out past the walk area to the horizon (none right at the landing site)
  const craters: MoonField['craters'] = [];
  for (let tries = 0; craters.length < 90 && tries < 600; tries++) {
    const big = r() < 0.25;
    const cr = big ? 220 + r() * 380 : 40 + r() * 140;
    const x = (r() * 2 - 1) * radius * 2.2, y = (r() * 2 - 1) * radius * 2.2;
    if (Math.hypot(x, y) < 350 + cr) continue;
    craters.push({ x, y, r: cr });
  }
  return { radius, parts, boulders, craters };
}

/**
 * Docking with the spinning space station (as in Interstellar): match its spin, line the docking
 * collar up with the port, and close in slowly.
 */
export const DOCK = {
  /** Starting range (metres) and the fastest the shuttle may close (m/s). */
  start: 300,
  maxSpeed: 12,
  /** At contact: slot alignment (degrees, either way), spin difference (deg/s), closing speed (m/s), off-centre (m). */
  alignTol: 8,
  spinTol: 2.5,
  speedTol: 1.5,
  offsetTol: 2.5,
};
/** The station's spin, degrees per second. */
export const stationSpin = (s: StageInfo) => 6 + s.tier;

// --- rewards -------------------------------------------------------------------------------

export function streakMultiplier(streak: number) {
  if (streak >= 20) return 3;
  if (streak >= 10) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
}

export function answerReward(o: { base: number; noHint: boolean; fast: boolean; streak: number; bonus: boolean }) {
  const mods = 1 + (o.noHint ? 0.1 : 0) + (o.fast ? 0.1 : 0);
  return Math.round(o.base * mods * streakMultiplier(o.streak) * (o.bonus ? 2 : 1));
}

/** Hints: 50/50 removes two wrong answers (not on true/false questions). */
export const FIFTY_COST = 10;

/** Stars: right answers, few hints, few hits in flight. */
export function starsFor(r: { right: number; wrong: number; hints: number; hits: number }): number {
  const acc = r.right / Math.max(1, r.right + r.wrong);
  if (acc >= 0.85 && r.hints <= 1 && r.hits === 0) return 3;
  if (acc >= 0.65 && r.hits <= 2) return 2;
  return 1;
}

// --- the rocket for one flight -------------------------------------------------------------

/** World units one full tank flies. */
export const TANK_RANGE = 3000;

export type Rocket = {
  /** Steering power: parts installed this round plus the ion booster. */
  engine: number;
  /** Fuel left, and what the flight started with, in tanks. */
  fuel: number;
  fuelMax: number;
  /** Shield charges: each blocks one hit. */
  shield: number;
};

/** Vertical speed limit (world units / s): a rocket with no engine parts still steers, slowly. */
export const steerSpeed = (engine: number) => 210 + 85 * Math.min(engine, 6);

// --- the flight course ---------------------------------------------------------------------

/** Flight space: the rocket flies between these heights (world units; the view is VIEW_H tall). */
export const VIEW_H = 600;
export const CEIL = 240;
export const FLOOR = -240;

export type HazardType = 'meteor' | 'asteroid' | 'boulder' | 'comet' | 'debris' | 'panel';

/** Collision size of each hazard: a circle radius, or (a solar panel) a half-width and half-height box. */
export const HAZARD_SIZE: Record<HazardType, { r: number; hw?: number; hh?: number }> = {
  meteor: { r: 34 },
  asteroid: { r: 58 },
  boulder: { r: 80 },
  comet: { r: 30 },
  debris: { r: 44 },
  panel: { r: 0, hw: 100, hh: 16 },
};
/** The rocket's own collision radius. */
export const ROCKET_R = 26;

export const HAZARD_INFO: Record<HazardType, { name: string; how: string }> = {
  meteor: { name: 'SPACE ROCK', how: 'small and quick to pass: fly around it' },
  asteroid: { name: 'ASTEROID', how: 'big and slow: go above or below' },
  boulder: { name: 'GIANT ASTEROID', how: 'huge: look for the gap' },
  comet: { name: 'COMET', how: 'falls fast from above: watch the warning' },
  debris: { name: 'DEAD SATELLITE', how: 'tumbles and drifts: keep moving' },
  panel: { name: 'SOLAR PANEL', how: 'a flat, drifting sheet: fly over or under it' },
};

/** Hazards met in each world (new ones first appear in that order). */
const WORLD_HAZARDS: Record<WorldId, HazardType[]> = {
  outbound: ['meteor', 'asteroid', 'boulder', 'debris', 'comet', 'panel'],
  homebound: ['meteor', 'asteroid', 'debris', 'boulder', 'comet', 'panel'],
};
/** The rocks of an asteroid storm, and the junk of a junk field. */
const STORM_ROCKS: HazardType[] = ['boulder', 'asteroid', 'meteor'];
const JUNK: HazardType[] = ['debris', 'panel', 'debris', 'meteor'];

const poolOf = (s: StageInfo): HazardType[] => {
  if (!hasFlight(s.leg)) return [];
  const all = WORLD_HAZARDS[s.world];
  return all.slice(0, Math.min(all.length, 2 + Math.ceil(s.local / 4) + s.wi));
};

/** This stage's hazards: early stages of a world use fewer kinds. */
export function stageHazards(stage: StageInfo): { pool: HazardType[]; fresh: HazardType[] } {
  const pool = poolOf(stage);
  const seenBefore = new Set<HazardType>();
  for (let n = 1; n < stage.n; n++) poolOf(stageInfo(n)).forEach((h) => seenBefore.add(h));
  return { pool, fresh: pool.filter((h) => !seenBefore.has(h)) };
}

export type CourseHazard = { type: HazardType; x: number; y: number; id: number };
export type CourseCoin = { x: number; y: number; id: number };
/** A stretch of the course after a show stopper. */
export type ZoneKind = 'storm' | 'debris' | 'rings' | 'canisters' | 'rescue';
export type Zone = { kind: ZoneKind; x0: number; x1: number };
export type Course = {
  round: number;
  length: number;
  hazards: CourseHazard[];
  coins: CourseCoin[];
  /** Tanks of fuel the course needs. */
  fuelNeeded: number;
  /** The show stoppers along the way, in order. */
  events: CourseEvent[];
  zones: Zone[];
  /** Beacon rings to fly through (navigation), fuel canisters to catch (fuel leak), the astronaut to rescue. */
  rings: Array<{ id: number; x: number; y: number }>;
  canisters: Array<{ id: number; x: number; y: number }>;
  rescue: { x: number; y: number } | null;
  /** The asteroid storm's stretch, if there is one (the sky glows red there). */
  storm: { x0: number; x1: number } | null;
};

/** Small, seeded random numbers, so a stage's courses are the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seconds of flight between two hazards, at least: time to steer around the next one. */
export const minGapSec = (stage: StageInfo) => Math.max(0.95, 1.55 - stage.local * 0.025 - stage.wi * 0.1);
/** No hazards this close (world units) to a stop for questions, so the flight resumes calmly. */
export const EVENT_CALM = 450;
/** The opening in a wall of storm rocks. */
export const STORM_GAP = ROCKET_R * 4 + 66;
/** No hazards this close to the stranded astronaut. */
export const RESCUE_CLEAR = 360;
/** How far after a mayday call the astronaut drifts. */
const RESCUE_AHEAD = 900;

/** How long a show stopper's stretch of the course is (0: none). */
function zoneLength(kind: EventKind, stage: StageInfo, gap: number) {
  switch (kind) {
    case 'storm': return stormLength(stage);
    case 'debris': return 3200 + stage.local * 60;
    case 'navigation': return 300 + RINGS * gap * 1.7;
    case 'fuelLeak': return 3000;
    case 'rescue': return RESCUE_AHEAD + 500;
    default: return 0;
  }
}
const ZONE_OF: Partial<Record<EventKind, ZoneKind>> = { storm: 'storm', debris: 'debris', navigation: 'rings', fuelLeak: 'canisters', rescue: 'rescue' };

/**
 * One flight's course: hazards along the flight path with coins between them, the show stoppers
 * spread along the way, and each one's stretch after it (rock walls, a junk field, beacon rings,
 * fuel canisters, the astronaut adrift). Fair by construction: hazards are at least minGapSec
 * apart, every hazard leaves room to pass, stacked hazards leave a gap the rocket fits through,
 * nothing waits right after a stop, and rings, canisters and the astronaut are kept clear.
 */
export function buildCourse(stage: StageInfo, round: number): Course {
  const r = rng(stage.n * 977 + round * 131 + 7);
  const length = journeyLength(stage) + round * 600;
  const fuelNeeded = length / TANK_RANGE;
  const gap = minGapSec(stage) * stage.speed;

  // --- the show stoppers, spread out, each followed by its stretch ------------------------------
  const plan = stageEvents(stage);
  const needs = plan.map((p) => EVENT_CALM * 2 + 300 + zoneLength(p.kind, stage, gap));
  const start = 1600, end = length - 900;
  const total = needs.reduce((a, b) => a + b, 0);
  const squeeze = total > end - start ? (end - start) / total : 1;
  const spare = Math.max(0, (end - start - total) / Math.max(1, plan.length));
  const events: CourseEvent[] = [];
  const zones: Zone[] = [];
  let cursor = start + spare / 2;
  plan.forEach((p, i) => {
    const x = Math.round(cursor + EVENT_CALM);
    const ev: CourseEvent = { id: i, x, kind: p.kind, need: 1 };
    if (p.kind === 'fault') { ev.fault = p.fault ?? ROAD_FAULTS[Math.floor(r() * ROAD_FAULTS.length)]; ev.need = faultNeed(stage); }
    if (p.kind === 'storm') ev.need = stormQuestions(stage);
    if (p.kind === 'collision') ev.timed = COLLISION_SECONDS;
    if (p.kind === 'flare') { ev.need = FLARE_QUESTIONS; ev.timed = FLARE_SECONDS; }
    if (p.kind === 'debris') ev.need = 0;
    events.push(ev);
    const z = ZONE_OF[p.kind];
    const zl = zoneLength(p.kind, stage, gap) * squeeze;
    if (z && zl > 0) {
      const x0 = Math.round(EVENT_INFO[p.kind].blocking ? x + EVENT_CALM + 150 : x + 300);
      zones.push({ kind: z, x0, x1: Math.round(x0 + zl) });
    }
    cursor += needs[i] * squeeze + spare;
  });
  const zoneAt = (x: number) => zones.find((z) => x >= z.x0 && x < z.x1);

  // --- rings, canisters and the astronaut ---------------------------------------------------------
  const rings: Course['rings'] = [];
  const canisters: Course['canisters'] = [];
  let rescue: Course['rescue'] = null;
  let id = 0;
  for (const z of zones) {
    if (z.kind === 'rings') {
      let y = 0;
      for (let k = 0; k < RINGS; k++) {
        y = Math.max(FLOOR + RING_HALF + 20, Math.min(CEIL - RING_HALF - 20, y + (r() - 0.5) * 240));
        const x = z.x0 + 300 + k * gap * 1.7;
        if (x < z.x1) rings.push({ id: id++, x: Math.round(x), y: Math.round(y) });
      }
    }
    if (z.kind === 'rescue') rescue = { x: z.x0 - 300 + RESCUE_AHEAD, y: Math.round(FLOOR + 80 + r() * (CEIL - FLOOR - 160)) };
  }

  // --- hazards and coins ----------------------------------------------------------------------
  const pool = poolOf(stage);
  const hazards: CourseHazard[] = [];
  const coins: CourseCoin[] = [];
  let x = 700; // a calm start
  const lane = () => FLOOR + 40 + r() * (CEIL - FLOOR - 80);
  const density = stage.kind === 'bonus' ? 0.6 : stage.kind === 'boss' ? 1.15 : 1;
  let gapY = 0;
  while (pool.length && x < length - 400) {
    const stop = events.find((e) => EVENT_INFO[e.kind].blocking && Math.abs(x - e.x) < EVENT_CALM);
    if (stop) { x = stop.x + EVENT_CALM; continue; }
    if (rescue && Math.abs(x - rescue.x) < RESCUE_CLEAR) { x = rescue.x + RESCUE_CLEAR; continue; }
    const zone = zoneAt(x);
    if (zone?.kind === 'rings') { x = zone.x1 + gap * 0.5; continue; }
    if (zone?.kind === 'storm') {
      // a wall of rocks with one opening; the opening wanders, never too far for the rocket to follow
      gapY = Math.max(FLOOR + STORM_GAP / 2 + 20, Math.min(CEIL - STORM_GAP / 2 - 20, gapY + (r() - 0.5) * 260));
      for (const dir of [1, -1]) {
        let edge = gapY + (dir * STORM_GAP) / 2;
        for (;;) {
          const type = STORM_ROCKS[Math.floor(r() * STORM_ROCKS.length)];
          const rad = HAZARD_SIZE[type].r;
          const y = edge + dir * rad;
          if (dir > 0 ? y > CEIL : y < FLOOR) break;
          hazards.push({ type, x, y, id: id++ });
          edge = y + dir * (rad + 8);
        }
      }
      coins.push({ x: x + gap * 0.6, y: gapY, id: id++ });
      x += gap * 1.2;
      continue;
    }
    const junk = zone?.kind === 'debris';
    const type = junk ? JUNK[Math.floor(r() * JUNK.length)] : pool[Math.floor(r() * pool.length)];
    const pairs = !junk && stage.n >= 4 && r() < 0.18 + stage.wi * 0.08 && type !== 'panel' && type !== 'boulder';
    if (pairs) {
      // two hazards stacked with a gap to fly through
      const s = HAZARD_SIZE[type].r;
      const gapH = ROCKET_R * 4 + 40;
      const top = CEIL - s - r() * (CEIL - FLOOR - gapH - s * 4);
      const bottom = top - 2 * s - gapH;
      hazards.push({ type, x, y: top, id: id++ });
      if (bottom > FLOOR + s - 10) hazards.push({ type, x, y: bottom, id: id++ });
      x += gap * 1.25;
    } else {
      const y = type === 'comet' ? CEIL + 60 : type === 'panel' ? FLOOR + 70 + r() * (CEIL - FLOOR - 140) : lane();
      hazards.push({ type, x, y, id: id++ });
    }
    const step = gap * (junk ? 1.05 : zone?.kind === 'canisters' ? 1.5 : 1 + (r() * 0.8) / density);
    if (zone?.kind !== 'canisters') {
      // coins: a short line, or an arc, between this hazard and the next
      const cy = lane();
      const n = stage.kind === 'bonus' ? 6 : r() < 0.6 ? 3 : 0;
      for (let k = 0; k < n; k++) {
        const cx = x + step * (0.35 + (k / Math.max(1, n)) * 0.4);
        coins.push({ x: cx, y: cy + Math.sin((k / Math.max(1, n - 1)) * Math.PI) * 40, id: id++ });
      }
    }
    x += step;
  }
  // fuel canisters spread evenly through their stretch, each at the height farthest from the rocks around it
  for (const z of zones.filter((zz) => zz.kind === 'canisters')) {
    const step = (z.x1 - z.x0) / CANISTERS;
    for (let k = 0; k < CANISTERS; k++) {
      const cx = Math.round(z.x0 + step * (k + 0.5));
      const near = hazards.filter((h) => h.type !== 'comet' && Math.abs(h.x - cx) < 260);
      let best = 0, bestD = -1;
      for (const cy of [-180, -120, -60, 0, 60, 120, 180]) {
        const d = near.length ? Math.min(...near.map((h) => Math.hypot(h.x - cx, h.y - cy) - HAZARD_SIZE[h.type].r)) : 999 - Math.abs(cy - (k % 2 ? 90 : -90));
        if (d > bestD) { bestD = d; best = cy; }
      }
      canisters.push({ id: id++, x: cx, y: best });
    }
  }
  // keep coins and canisters clear of hazards, and everything in front of the end
  const clearOf = (p: { x: number; y: number }, d: number) => hazards.every((h) => Math.hypot(h.x - p.x, (h.type === 'comet' ? 0 : h.y) - p.y) > d);
  const stormZone = zones.find((z) => z.kind === 'storm');
  return {
    round, length,
    hazards: hazards.filter((h) => h.x < length - 300),
    coins: coins.filter((c) => clearOf(c, 110) && c.x < length - 200),
    fuelNeeded, events, zones, rings,
    canisters: canisters.filter((c) => clearOf(c, 120) && c.x < length - 200),
    rescue,
    storm: stormZone ? { x0: stormZone.x0, x1: stormZone.x1 } : null,
  };
}

/** Where a moving hazard is at time `t` (seconds since it came into view). */
export function hazardPos(h: CourseHazard, t: number, rocketY: number): { x: number; y: number } {
  switch (h.type) {
    case 'comet': return { x: h.x - t * 60, y: h.y - t * 260 };
    case 'debris': return { x: h.x - t * 12, y: clampY(h.y + Math.sin(t * 0.9 + h.id) * 30, 40) };
    case 'panel': return { x: h.x, y: clampY(h.y + Math.sin(t * 1.2 + h.id) * 36, 30) };
    case 'asteroid': case 'boulder': return { x: h.x, y: h.y + Math.sin(t * 0.8 + h.id) * 6 };
    default: return { x: h.x, y: h.y };
  }
}
const clampY = (y: number, pad: number) => Math.max(FLOOR + pad, Math.min(CEIL - pad, y));

/** Does a hazard at (hx, hy) touch the rocket at (rx, ry)? */
export function touches(type: HazardType, hx: number, hy: number, rx: number, ry: number): boolean {
  const s = HAZARD_SIZE[type];
  if (s.hw) return Math.abs(rx - hx) < s.hw + ROCKET_R * 0.6 && Math.abs(ry - hy) < (s.hh ?? 0) + ROCKET_R * 0.6;
  return Math.hypot(rx - hx, ry - hy) < s.r + ROCKET_R * 0.8;
}
