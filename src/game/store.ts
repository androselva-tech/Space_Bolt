import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playExplosion, playJump, playStageComplete, playUnlock } from '../audio/sfx';
import {
  buildQuiz, emptyHistory, pickBossQuestion, pickQuestion, recordResult,
  type Quiz, type QuizHistory, type Subject,
} from '../questions';
import {
  CANISTER_FUEL, EVENT_INFO, FAULTS, FIFTY_COST, GAUGE_INFO, LEAK, LEAK_LOSS, LEG_INFO, MAX_LIVES, MAX_SHIELD, REWARD, RINGS, STAGE_COUNT, START_LIVES,
  SYSTEMS, SYSTEM_ORDER, TANK_RANGE, UPGRADE_MAX,
  answerReward, bossQuestionReward, buildCourse, fuelNeed, hasPrep, moonField, partAnswers, prepPlan, repairNeed, stageEvents, stageHazards, stageInfo, starsFor, upgradeCost, vehicleFor,
  type Course, type CourseEvent, type EventKind, type Gauge, type HazardType, type MoonField, type Rocket, type StageInfo, type SystemId, type UpgradeId,
} from './rules';
import { DEFAULT_DESIGN, ORDER, PARTS as ROCKET_PARTS, cleanName, type PartId, type RocketDesign, type Vehicle } from '../rocket/model';

const SAVE_KEY = 'space-bolt/save/v3';
/** The save before the round-trip campaign: coins, upgrades and stats carry over; stage progress starts again. */
const OLD_SAVE_KEY = 'space-bolt/save/v2';
/** Saves made for this campaign (Earth to Moon and back); older ones restart the stage progress. */
export const CAMPAIGN = 2;

/** From the neutral age gate: a child (13 or under: child-safe ads) or not, or not asked yet. */
export type AgeGroup = 'child' | 'general';

export type Profile = {
  campaign: number;
  ageGroup: AgeGroup | null;
  wallet: number;
  /** Best stars per stage number. */
  stars: Record<number, number>;
  /** Highest stage the player may play. */
  unlocked: number;
  /** Hangar upgrades, level 0..3 each. */
  upgrades: Record<UpgradeId, number>;
  /** The last paint job and name (the paint shop starts from it). */
  design: RocketDesign;
  stats: {
    answered: number;
    right: number;
    bestStreak: number;
    coinsEarned: number;
    hintsUsed: number;
    stagesCompleted: number;
    partsBuilt: number;
    hits: number;
    landings: number;
  };
  history: QuizHistory;
};

const freshProfile = (): Profile => ({
  campaign: CAMPAIGN,
  ageGroup: null,
  wallet: 0,
  stars: {},
  unlocked: 1,
  upgrades: { engine: 0, tank: 0, shield: 0, life: 0 },
  design: { ...DEFAULT_DESIGN },
  stats: { answered: 0, right: 0, bestStreak: 0, coinsEarned: 0, hintsUsed: 0, stagesCompleted: 0, partsBuilt: 0, hits: 0, landings: 0 },
  history: emptyHistory(),
});

export type Feedback = { id: number; kind: 'correct' | 'wrong' | 'info'; text: string; sub?: string };
export type Screen = 'map' | 'play';

/**
 * The phases of a stage (which ones depend on its leg, rules.ts):
 *  build      – answer questions to make each rocket part, then drag it into place and bolt it on
 *               (Moon liftoff: the parts were found on the Moon walks, so just fit them)
 *  paint      – choose the colours and paint the rocket's name
 *  fuel       – on the launch pad: fill the fuel and liquid-oxygen tanks and pass the crew check, a question at a time
 *  launch     – the movie: countdown, IGNITION, liftoff, booster separation, into orbit
 *  prep       – the systems check before a flight: a question per gauge (engine, shields, life support)
 *  fly        – the journey: steer through space; it stops for meteor storms and faults (questions)
 *  landing    – the movie: the slow descent to the Moon, the hatch, the astronauts, the flag
 *  moonwalk   – walk the Moon in any direction; each part found is earned with questions
 *  dock       – match the space station's spin and dock with it
 *  repair     – fix the ship's systems at the station, a question at a time
 *  splashdown – the movie: re-entry, parachutes, the sea, the recovery ship
 */
export type Phase = 'build' | 'paint' | 'fuel' | 'launch' | 'prep' | 'fly' | 'landing' | 'moonwalk' | 'dock' | 'repair' | 'splashdown';
/** What a question is for. */
export type Task =
  | { kind: 'part'; part: PartId }
  | { kind: 'fuel' | 'oxidizer' | 'crew' }
  | { kind: 'prep'; gauge: Gauge }
  | { kind: 'event' }
  | { kind: 'collect'; part: PartId }
  | { kind: 'repair'; system: SystemId };

export type QuizState = {
  quiz: Quiz;
  task: Task;
  picked: number | null;
  removed: number[];
  startedAt: number;
  hints: number;
  done: 'right' | 'wrong' | null;
};

export type Intro = { title: string; sub: string; hazards: HazardType[]; fresh: HazardType[]; events: EventKind[]; freshEvents: EventKind[] };

export type Assembly = {
  /** Index in BUILD_ORDER of the part being made. */
  index: number;
  /** Right answers so far for it, and how many it needs. */
  got: number;
  need: number;
  /** Made and waiting in the tray to be fitted. */
  tray: PartId | null;
  /** Parts on the rocket, with their bolts (turns each). */
  fitted: Partial<Record<PartId, { bolts: number[]; locked: boolean }>>;
  /** Wrong answers and wrong drops per part (a part with neither is "perfect"). */
  mistakes: Partial<Record<PartId, number>>;
};

export type Fueling = { fuel: number; oxidizer: number; crew: number; need: { fuel: number; oxidizer: number; crew: number } };

/** The systems check: the gauges in the order asked, how many have been asked, and the charge each got. */
export type Prep = { plan: Gauge[]; asked: number; got: Record<Gauge, number> };

/** A stop in flight: a meteor storm (questions asked, shields charged) or a fault (right answers so far). */
/** `deadline`: when the clock runs out (timed show stoppers), 0 if there's no clock. */
export type FlightEvent = CourseEvent & { asked: number; got: number; deadline: number };

/** What the flight has picked up along the way. */
export type Pickups = { canisters: number[]; rings: Record<number, boolean>; rescued: boolean };

/** The Moon walk: where the parts lie, which have been found, and the one being earned right now. */
export type Walk = { field: MoonField; found: PartId[]; target: PartId | null; got: number; need: number };

/** Repairs at the space station: right answers per system. */
export type Repair = { got: Record<SystemId, number>; index: number };

export type StageStats = {
  right: number; wrong: number; hints: number; coins: number; pickups: number;
  hits: number; blocked: number; misfits: number; leaks: number; bumps: number; startedAt: number; endedAt: number; stars: number;
};
const freshStats = (): StageStats => ({ right: 0, wrong: 0, hints: 0, coins: 0, pickups: 0, hits: 0, blocked: 0, misfits: 0, leaks: 0, bumps: 0, startedAt: Date.now(), endedAt: 0, stars: 0 });

/** How the build went, and what it gives the rocket in flight. */
export type RocketReport = { perfect: number; total: number; quality: number; engine: number; shield: number; lives: number };

export type GameState = {
  loaded: boolean;
  screen: Screen;
  profileOpen: boolean;
  hangarOpen: boolean;
  profile: Profile;

  stage: StageInfo | null;
  course: Course | null;
  status: 'playing' | 'complete' | 'failed';
  phase: Phase;
  assembly: Assembly;
  /** The paint job being chosen in the paint shop. */
  design: RocketDesign;
  fueling: Fueling;
  /** Fuelled and the crew is aboard: the GO FOR LAUNCH button is up. */
  padReady: boolean;
  /** The launch movie: when IGNITION was pressed (ms), or 0 while counting down. */
  ignitedAt: number;
  report: RocketReport | null;
  rocket: Rocket;
  lives: number;
  /** World units flown along the journey, and as 0..1. */
  distance: number;
  progress: number;
  prep: Prep;
  /** The stop the flight is paused at (questions), and the index of the next one along the course. */
  event: FlightEvent | null;
  nextEvent: number;
  /** How a show stopper ended, for the flight scene's effects (dodge or crash, the flare's flash, the rescue). */
  eventFx: { id: number; kind: EventKind | null; ok: boolean; at: number };
  pickups: Pickups;
  /** After a fuel leak the tank drains faster until the stretch with the canisters is over. */
  leaking: boolean;
  walk: Walk | null;
  repair: Repair;
  /** Docked with the space station. */
  docked: boolean;
  /** How the last docking attempt went (the result card), and how many tries so far. */
  dockResult: { ok: boolean; reason: string } | null;
  dockTries: number;
  /** The capsule's parachutes: fired in the window ('ok'), or by the backup after it ('late'). */
  chutes: { drogue: 'ok' | 'late' | null; mains: 'ok' | 'late' | null };
  /** The game is paused (everything stops: flight, clocks, movies), and since when. */
  paused: boolean;
  pausedAt: number;
  streak: number;
  stageStats: StageStats;
  quiz: QuizState | null;
  questionNumber: number;
  intro: Intro | null;
  feedback: Feedback | null;
  coinEvent: { id: number; amount: number; at: number };
  /** Bumped when a part locks on, a tank fills, or the crew boards. */
  partEvent: { id: number; part: PartId | 'fuel' | 'oxidizer' | 'crew' | Gauge | SystemId | null; ok: boolean };
  hitEvent: { id: number; blocked: boolean };
  steerY: number | null;
  steerDir: -1 | 0 | 1;
};

export type GameActions = {
  load(): Promise<void>;
  openMap(): void;
  setProfileOpen(open: boolean): void;
  setHangarOpen(open: boolean): void;
  startStage(n: number): void;
  dismissIntro(): void;
  answer(i: number): void;
  next(): void;
  useFifty(): void;
  freeFifty(): void;
  say(text: string, sub?: string): void;
  /** Workshop: drop the made part on the rocket (false if it isn't its place: call misfit). */
  placePart(part: PartId): boolean;
  misfit(part: PartId): void;
  turnBolt(part: PartId, k: number): void;
  /** Paint shop. */
  setDesign(d: Partial<RocketDesign>): void;
  paintDone(): void;
  /** On the pad: start the countdown (the launch movie). */
  goForLaunch(): void;
  /** The IGNITION button at the end of the countdown. */
  ignite(): void;
  /** The launch movie reached orbit: the journey starts. */
  orbitReached(): void;
  /** The landing movie is over. */
  landed(): void;
  /** The Moon walk: the astronaut reached a part (its questions start). */
  reachPart(part: PartId): void;
  /** Docking: contact with the port, lined up, centred and slow enough (true) or not (why). */
  dockContact(ok: boolean, reason?: string): void;
  /** After a failed docking: back off and try again. */
  retryDock(): void;
  /** The capsule: a parachute fired in its window, or by the backup once the window has passed. */
  deployChute(kind: 'drogue' | 'mains', timing: 'ok' | 'late'): void;
  /** Pause or resume the game. */
  togglePause(): void;
  /** The age gate's answer (null asks again). */
  setAgeGroup(group: AgeGroup | null): void;
  /** The splashdown movie is over: the mission is accomplished. */
  splashed(): void;
  /** The flight scene: the rocket passed a beacon ring (through it, or not), caught a fuel canister, reached the astronaut. */
  passRing(id: number, hit: boolean): void;
  catchCanister(id: number): void;
  reachRescue(): void;
  buyUpgrade(id: UpgradeId): boolean;
  setSteerY(y: number | null): void;
  setSteerDir(d: -1 | 0 | 1): void;
  flew(dx: number): void;
  hazardHit(): void;
  pickCoin(): void;
  resetProgress(): void;
  adoptProfile(p: Profile): void;
  /** Dev and tests: fit the made part and tighten its bolts. */
  autoFit(): void;
};

export type GameStore = GameState & GameActions;

let fbSeq = 1;
const fb = (kind: Feedback['kind'], text: string, sub?: string): Feedback => ({ id: fbSeq++, kind, text, sub });

const AFTER_RIGHT_MS = 1800;
const AFTER_WRONG_MS = 4200;
export const BOLT_TURNS = 3;

const TASK_SUBJECT: Record<'fuel' | 'oxidizer' | 'crew', Subject> = { fuel: 'space', oxidizer: 'chemistry', crew: 'body' };
export const TASK_NAME: Record<'fuel' | 'oxidizer' | 'crew', string> = { fuel: 'FUEL', oxidizer: 'LIQUID OXYGEN', crew: 'CREW CHECK' };
/** An asteroid storm's (and a solar flare's) questions take turns through the science subjects. */
const STORM_SUBJECTS: Subject[] = ['space', 'physics', 'chemistry', 'body'];
const EVENT_SUBJECT: Record<EventKind, Subject | null> = {
  storm: null, flare: null, fault: 'logic', navigation: 'logic', comms: 'logic', collision: 'physics', fuelLeak: 'chemistry', rescue: 'body', debris: null, burn: null,
};

/** The subject a task's question comes from. */
export function taskSubject(t: Task, event?: FlightEvent | null): Subject {
  switch (t.kind) {
    case 'part': case 'collect': return ROCKET_PARTS[t.part].subject;
    case 'prep': return GAUGE_INFO[t.gauge].subject;
    case 'repair': return SYSTEMS[t.system].subject;
    case 'event': return (event && EVENT_SUBJECT[event.kind]) ?? STORM_SUBJECTS[((event?.asked ?? 0) + (event?.id ?? 0)) % STORM_SUBJECTS.length];
    default: return TASK_SUBJECT[t.kind];
  }
}

function introFor(stage: StageInfo, course: Course): Intro {
  const { fresh } = stageHazards(stage);
  const hazards = [...new Set(course.hazards.map((h) => h.type))];
  const events = [...new Set(course.events.map((e) => e.kind))];
  const seen = new Set<EventKind>();
  for (let n = 1; n < stage.n; n++) stageEvents(stageInfo(n)).forEach((e) => seen.add(e.kind));
  const leg = LEG_INFO[stage.leg];
  const kind = stage.kind === 'boss' ? ' • BOSS' : stage.kind === 'bonus' ? ' • BONUS' : '';
  return {
    title: `${leg.icon} STAGE ${stage.n}: ${leg.name}${kind}`,
    sub: `${leg.blurb}${stage.kind === 'bonus' ? ' • answers pay x2' : stage.kind === 'boss' ? ' • harder questions' : ''}`,
    hazards,
    fresh,
    events,
    freshEvents: events.filter((k) => !seen.has(k)),
  };
}

/** The craft a stage builds: the rocket on Earth, the Lunar Shuttle on the Moon. */
export const orderFor = (stage: StageInfo | null): PartId[] => ORDER[stage ? vehicleFor(stage) : 'rocket'];
const needFor = (stage: StageInfo, index: number) => partAnswers(stage, ROCKET_PARTS[orderFor(stage)[index]].major);
const freshAssembly = (stage: StageInfo): Assembly => ({ index: 0, got: 0, need: needFor(stage, 0), tray: null, fitted: {}, mistakes: {} });
const freshFueling = (stage: StageInfo): Fueling => ({ fuel: 0, oxidizer: 0, crew: 0, need: fuelNeed(stage) });
const freshPrep = (stage: StageInfo): Prep => ({ plan: hasPrep(stage.leg) ? prepPlan(stage) : [], asked: 0, got: { engine: 0, shield: 0, life: 0 } });
const freshRepair = (): Repair => ({ got: { heatShield: 0, oxygen: 0, solar: 0, nav: 0, computer: 0, chutes: 0 }, index: 0 });
/** The Moon liftoff builds the shuttle from parts already earned on the Moon walks (no questions). */
const prebuilt = (stage: StageInfo | null) => stage?.leg === 'moonLaunch';

/** What the build gives the craft: perfect parts (no wrong answers, no wrong drops) make it stronger. */
export function rocketReport(a: Assembly, p: Profile, vehicle: Vehicle = 'rocket'): RocketReport {
  const order = ORDER[vehicle];
  const perfect = order.filter((id) => a.fitted[id]?.locked && !(a.mistakes[id] ?? 0)).length;
  const ok = (id: PartId) => !!a.fitted[id]?.locked && !(a.mistakes[id] ?? 0);
  const steering: PartId[] = vehicle === 'rocket' ? ['engineMount', 'fins', 'landingLegs'] : ['ascentEngine', 'rcsPods'];
  return {
    perfect,
    total: order.length,
    quality: Math.round((perfect / order.length) * 100),
    engine: steering.filter(ok).length + p.upgrades.engine,
    shield: Math.min(3, Math.floor(perfect / 4)) + p.upgrades.shield,
    lives: Math.min(MAX_LIVES, START_LIVES + (ok(vehicle === 'rocket' ? 'payload' : 'crewCabin') ? 1 : 0) + p.upgrades.life),
  };
}

export const gameStore = createStore<GameStore>()((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(get().profile)).catch(() => {});
    }, 400);
  };
  // the next step (a question after an answer, a phase after a pause): it waits while the game is paused
  let nextTimer: ReturnType<typeof setTimeout> | undefined;
  let nextFn: (() => void) | null = null;
  let nextAt = 0;
  const runNext = () => { const fn = nextFn; nextFn = null; fn?.(); };
  const after = (ms: number, fn: () => void) => {
    cancelNext();
    nextFn = fn;
    nextAt = Date.now() + ms;
    if (!get().paused) nextTimer = setTimeout(runNext, ms);
  };
  const cancelNext = () => { clearTimeout(nextTimer); nextFn = null; };
  let pending: (() => void) | null = null;

  /** The task the next question is for, or null when nothing needs a question right now. */
  const currentTask = (): Task | null => {
    const s = get();
    if (s.phase === 'build') {
      const a = s.assembly;
      const order = orderFor(s.stage);
      if (prebuilt(s.stage) || a.tray || a.index >= order.length) return null;
      const part = order[a.index];
      // the previous part must be bolted on first
      const prev = order[a.index - 1];
      if (prev && !a.fitted[prev]?.locked) return null;
      return { kind: 'part', part };
    }
    if (s.phase === 'fuel') {
      const f = s.fueling;
      if (f.fuel < f.need.fuel) return { kind: 'fuel' };
      if (f.oxidizer < f.need.oxidizer) return { kind: 'oxidizer' };
      if (f.crew < f.need.crew) return { kind: 'crew' };
    }
    if (s.phase === 'prep' && s.prep.asked < s.prep.plan.length) return { kind: 'prep', gauge: s.prep.plan[s.prep.asked] };
    if (s.phase === 'fly' && s.event) return { kind: 'event' };
    if (s.phase === 'moonwalk' && s.walk?.target) return { kind: 'collect', part: s.walk.target };
    if (s.phase === 'repair' && s.repair.index < SYSTEM_ORDER.length) return { kind: 'repair', system: SYSTEM_ORDER[s.repair.index] };
    return null;
  };

  const serveQuestion = () => {
    pending = null;
    const s = get();
    if (!s.stage || s.status !== 'playing' || s.intro) return;
    const task = currentTask();
    if (!task) return set({ quiz: null });
    const subject = taskSubject(task, s.event);
    const h = s.profile.history;
    let quiz: Quiz;
    const major = (task.kind === 'part' || task.kind === 'collect') && ROCKET_PARTS[task.part].major;
    if (s.stage.kind === 'boss' && (major || task.kind === 'repair')) {
      quiz = buildQuiz(pickBossQuestion(subject, s.stage.tier, h), { boss: true });
    } else {
      const { record, revision } = pickQuestion(subject, s.stage.tier, h);
      quiz = buildQuiz(record, { revision });
    }
    const history = { ...h, recent: [quiz.record.id, ...h.recent.filter((x) => x !== quiz.record.id)].slice(0, 120) };
    set({
      quiz: { quiz, task, picked: null, removed: [], startedAt: Date.now(), hints: 0, done: null },
      questionNumber: s.questionNumber + 1,
      profile: { ...s.profile, history },
    });
    // a collision gives each question its own clock
    const e = get().event;
    if (task.kind === 'event' && e?.kind === 'collision' && e.timed) {
      const deadline = Date.now() + e.timed * 1000;
      set({ event: { ...e, deadline } });
      armClock(deadline);
    }
  };

  // --- the clock for timed show stoppers ------------------------------------------------------------
  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  const armClock = (deadline: number) => {
    clearTimeout(clockTimer);
    clockTimer = setTimeout(timeUp, Math.max(0, deadline - Date.now()));
  };
  /** Time's up: an unanswered question counts as wrong; a solar flare arrives whatever's left. */
  const timeUp = () => {
    const s = get();
    const e = s.event;
    if (!e || s.status !== 'playing' || s.phase !== 'fly') return;
    const q = s.quiz;
    if (q && !q.done && q.task.kind === 'event') {
      const wrong = q.quiz.options.findIndex((_, i) => i !== q.quiz.correct);
      get().answer(wrong);
      set({ feedback: fb('wrong', 'TOO LATE!', e.kind === 'collision' ? 'The thrusters fired too late' : 'The flare is here') });
    }
    if (get().event?.kind === 'flare') {
      pending = finishEvent;
      after(AFTER_WRONG_MS, () => pending?.());
    }
  };

  /** Shields take a hit first, then a heart; no hearts left ends the stage. */
  const damage = (text: string) => {
    const s = get();
    const p = s.profile;
    if (s.rocket.shield > 0) {
      set({
        rocket: { ...s.rocket, shield: s.rocket.shield - 1 },
        hitEvent: { id: s.hitEvent.id + 1, blocked: true },
        stageStats: { ...s.stageStats, blocked: s.stageStats.blocked + 1 },
        feedback: fb('info', `${text} THE SHIELD TOOK IT`, s.rocket.shield - 1 > 0 ? `${s.rocket.shield - 1} shield left` : 'No shields left'),
      });
      return;
    }
    const lives = s.lives - 1;
    playExplosion();
    set({
      lives,
      streak: 0,
      hitEvent: { id: s.hitEvent.id + 1, blocked: false },
      stageStats: { ...s.stageStats, hits: s.stageStats.hits + 1 },
      profile: { ...p, stats: { ...p.stats, hits: p.stats.hits + 1 } },
      feedback: fb('wrong', text, lives > 0 ? `${lives} heart${lives === 1 ? '' : 's'} left` : undefined),
    });
    save();
    if (lives <= 0) fail();
  };

  const addCoins = (n: number) => {
    const s = get();
    const p = s.profile;
    set({
      stageStats: { ...s.stageStats, coins: s.stageStats.coins + n },
      profile: { ...p, wallet: p.wallet + n, stats: { ...p.stats, coinsEarned: p.stats.coinsEarned + n } },
    });
    save();
  };

  /** A show stopper is over: its last effect, then on with the flight. */
  const finishEvent = () => {
    pending = null;
    clearTimeout(clockTimer);
    const s = get();
    const e = s.event;
    if (!e || s.status !== 'playing') return;
    const fx = (ok: boolean) => ({ id: s.eventFx.id + 1, kind: e.kind, ok, at: Date.now() });
    set({ event: null, quiz: null });
    switch (e.kind) {
      case 'storm': set({ feedback: fb('info', 'HERE COMES THE STORM!', `${get().rocket.shield} shields: find the gaps`) }); break;
      case 'flare': {
        // radiation: two shielding answers keep the crew safe; each one short is a hit
        const hits = Math.max(0, 2 - e.got);
        set({ eventFx: fx(hits === 0), feedback: hits === 0 ? fb('correct', 'THE FLARE PASSED!', 'The crew is safe behind the shielding') : fb('wrong', 'RADIATION!', 'Not enough shielding') });
        for (let i = 0; i < hits && get().status === 'playing'; i++) damage('RADIATION!');
        break;
      }
      case 'navigation': set({ feedback: fb('info', 'FOLLOW THE BEACONS', `Fly through all ${RINGS} rings to get back on course`) }); break;
      case 'fuelLeak': set({ leaking: true, feedback: fb('info', 'CATCH THE FUEL CANISTERS!', 'The tank drains fast until you are through') }); break;
      case 'collision': case 'comms': case 'rescue': break;
      default: set({ feedback: fb('correct', 'BACK ON COURSE', 'Steer on') });
    }
  };

  const arrive = () => {
    const s = get();
    if (!s.stage || s.status !== 'playing') return;
    cancelNext();
    pending = null;
    const st = s.stageStats;
    // a stage with no questions (docking, the splashdown) is judged on the flying alone
    const answered = st.right + st.wrong;
    const stars = starsFor({ right: answered ? st.right : 1, wrong: st.wrong, hints: st.hints, hits: st.hits + st.bumps }) - (st.misfits > 3 && st.hits === 0 ? 1 : 0);
    const p = s.profile;
    const landed = s.stage.leg === 'moonLanding' || s.stage.leg === 'reentry';
    set({
      status: 'complete',
      quiz: null,
      steerY: null,
      steerDir: 0,
      stageStats: { ...st, endedAt: Date.now(), stars: Math.max(1, stars) },
      profile: {
        ...p,
        stars: { ...p.stars, [s.stage.n]: Math.max(p.stars[s.stage.n] ?? 0, Math.max(1, stars)) },
        unlocked: Math.max(p.unlocked, Math.min(STAGE_COUNT, s.stage.n + 1)),
        stats: { ...p.stats, stagesCompleted: p.stats.stagesCompleted + 1, landings: p.stats.landings + (landed ? 1 : 0) },
      },
    });
    save();
    playStageComplete(s.stage.kind === 'boss');
  };

  const fail = () => {
    cancelNext();
    pending = null;
    set({ status: 'failed', steerY: null, steerDir: 0, stageStats: { ...get().stageStats, endedAt: Date.now() } });
  };

  const spend = (cost: number) => {
    const p = get().profile;
    if (p.wallet < cost) return false;
    set({ profile: { ...p, wallet: p.wallet - cost } });
    save();
    return true;
  };

  /** Coins for a right answer. */
  const rewardFor = (q: QuizState, streak: number) => {
    const s = get();
    const rec = q.quiz.record;
    if (s.stage!.kind === 'boss' && q.quiz.boss) return bossQuestionReward(s.stage!);
    const elapsed = (Date.now() - q.startedAt) / 1000;
    return answerReward({ base: rec.reward, noHint: q.hints === 0, fast: elapsed <= rec.timeLimitSec * 0.4, streak, bonus: s.stage!.kind === 'bonus' });
  };

  /** A part is bolted tight: on to the next part, or (all built) to the paint shop. */
  const partLocked = (part: PartId) => {
    const s = get();
    const a = s.assembly;
    const index = a.index + 1;
    const p = s.profile;
    set({
      assembly: { ...a, index, got: 0, need: index < orderFor(s.stage).length && !prebuilt(s.stage) ? needFor(s.stage!, index) : 0 },
      partEvent: { id: s.partEvent.id + 1, part, ok: true },
      feedback: fb('correct', `${ROCKET_PARTS[part].name} LOCKED IN!`, ROCKET_PARTS[part].what),
      profile: { ...p, stats: { ...p.stats, partsBuilt: p.stats.partsBuilt + 1 } },
    });
    playUnlock();
    save();
    if (index >= orderFor(s.stage).length) {
      if (prebuilt(s.stage)) {
        // the Moon liftoff: straight to fuelling (the paint job came along from Earth)
        after(900, () => { set({ phase: 'fuel', quiz: null, feedback: fb('correct', 'LUNAR SHUTTLE BUILT!', 'Fuel it for the trip home') }); after(1200, serveQuestion); });
        return;
      }
      after(900, () => set({ phase: 'paint', quiz: null, design: { ...get().profile.design }, feedback: fb('correct', 'ROCKET BUILT!', 'Now paint it and give it a name') }));
      return;
    }
    if (prebuilt(s.stage)) {
      set({ assembly: { ...get().assembly, tray: orderFor(s.stage)[index] } });
      return;
    }
    after(700, serveQuestion);
  };

  /** The systems check is done: the flight starts with what it charged. */
  const startFlight = () => {
    const s = get();
    const p = s.profile;
    const g = s.prep.got;
    const asked = s.prep.plan.length;
    const right = g.engine + g.shield + g.life;
    const engine = 1 + g.engine + p.upgrades.engine;
    const shield = Math.min(MAX_SHIELD, g.shield + p.upgrades.shield);
    const lives = Math.min(MAX_LIVES, START_LIVES + p.upgrades.life + g.life);
    const fuel = (s.course!.length / TANK_RANGE) * 1.3 + p.upgrades.tank * 0.5;
    set({
      phase: 'fly',
      quiz: null,
      distance: 0,
      progress: 0,
      report: { perfect: right, total: asked, quality: Math.round((right / Math.max(1, asked)) * 100), engine, shield, lives },
      rocket: { engine, fuel, fuelMax: fuel, shield },
      lives: Math.max(s.lives, lives),
      feedback: fb('correct', 'ALL SYSTEMS GO!', 'Engines on: steer through space'),
    });
  };

  /** The flight reached a stop: pause and ask. */
  const startEvent = (e: CourseEvent, fromCourse = true) => {
    const s = get();
    const deadline = e.kind === 'flare' && e.timed ? Date.now() + 1400 + e.timed * 1000 : 0;
    const warn: Record<EventKind, [string, string]> = {
      storm: ['ASTEROID STORM AHEAD!', 'Answer to charge the shields: one per right answer'],
      fault: [`WARNING: ${FAULTS[e.fault ?? 'computer'].name}`, FAULTS[e.fault ?? 'computer'].sub],
      collision: ['COLLISION COURSE!', `A huge asteroid dead ahead: answer within ${e.timed} seconds to fire the thrusters`],
      flare: ['SOLAR FLARE!', `Radiation arrives in ${e.timed} seconds: every right answer adds shielding`],
      navigation: ['NAVIGATION ERROR!', 'We are drifting off course: re-plot it'],
      fuelLeak: ['FUEL LEAK!', 'We are losing fuel fast: patch the line'],
      comms: ['INCOMING MESSAGE', 'Mission Control sent it in code: decode it'],
      rescue: ['ASTRONAUT REACHED!', 'A quick health check before they come aboard'],
      debris: ['SPACE JUNK', ''],
      burn: [`COURSE BURN ${e.id + 1}`, 'Answer right to fire the engine exactly on time'],
    };
    const fuel = e.kind === 'fuelLeak' ? Math.max(0.3, s.rocket.fuel - LEAK_LOSS) : s.rocket.fuel;
    set({
      event: { ...e, asked: 0, got: 0, deadline },
      nextEvent: s.nextEvent + (fromCourse ? 1 : 0),
      rocket: { ...s.rocket, fuel },
      steerY: null,
      steerDir: 0,
      feedback: fb(e.kind === 'comms' || e.kind === 'rescue' ? 'info' : 'wrong', ...warn[e.kind]),
    });
    if (deadline) armClock(deadline);
    after(1400, serveQuestion);
  };

  /** A show stopper that doesn't stop the flight: a warning, and the flying does the rest. */
  const announce = (e: CourseEvent) => {
    const s = get();
    set({
      nextEvent: s.nextEvent + 1,
      feedback: e.kind === 'rescue'
        ? fb('info', 'MAYDAY! ASTRONAUT ADRIFT', 'Fly into them to bring them aboard')
        : fb('wrong', 'SPACE JUNK AHEAD!', 'Dead satellites and torn panels: weave through'),
    });
  };

  /** The flight is over: what comes next depends on the leg. */
  const flightOver = () => {
    const s = get();
    const leg = s.stage!.leg;
    if (leg === 'moonLanding') set({ phase: 'landing', steerY: null, steerDir: 0, feedback: fb('info', 'THE MOON IS RIGHT BELOW', 'Prepare for landing') });
    else {
      if (leg === 'transfer') set({ feedback: fb('correct', 'THE SPACE STATION!', 'Arrived: next, the docking') });
      arrive();
    }
  };

  return {
    loaded: false,
    screen: 'map',
    profileOpen: false,
    hangarOpen: false,
    profile: freshProfile(),
    stage: null,
    course: null,
    status: 'playing',
    phase: 'build',
    assembly: { index: 0, got: 0, need: 1, tray: null, fitted: {}, mistakes: {} },
    design: { ...DEFAULT_DESIGN },
    fueling: { fuel: 0, oxidizer: 0, crew: 0, need: { fuel: 2, oxidizer: 2, crew: 1 } },
    padReady: false,
    ignitedAt: 0,
    report: null,
    rocket: { engine: 0, fuel: 0, fuelMax: 0, shield: 0 },
    lives: START_LIVES,
    distance: 0,
    progress: 0,
    prep: { plan: [], asked: 0, got: { engine: 0, shield: 0, life: 0 } },
    event: null,
    nextEvent: 0,
    eventFx: { id: 0, kind: null, ok: false, at: 0 },
    pickups: { canisters: [], rings: {}, rescued: false },
    leaking: false,
    walk: null,
    repair: freshRepair(),
    docked: false,
    dockResult: null,
    dockTries: 0,
    chutes: { drogue: null, mains: null },
    paused: false,
    pausedAt: 0,
    streak: 0,
    stageStats: freshStats(),
    quiz: null,
    questionNumber: 0,
    intro: null,
    feedback: null,
    coinEvent: { id: 0, amount: 0, at: 0 },
    partEvent: { id: 0, part: null, ok: false },
    hitEvent: { id: 0, blocked: false },
    steerY: null,
    steerDir: 0,

    async load() {
      try {
        const raw = (await AsyncStorage.getItem(SAVE_KEY)) ?? (await AsyncStorage.getItem(OLD_SAVE_KEY));
        if (raw) set({ profile: profileFrom(JSON.parse(raw)) ?? freshProfile() });
      } catch {
        // corrupt or unavailable storage: start fresh
      }
      set({ loaded: true });
    },

    openMap() {
      cancelNext();
      pending = null;
      set({ screen: 'map', stage: null, course: null, quiz: null, intro: null, steerY: null, steerDir: 0, paused: false, pausedAt: 0 });
    },

    setProfileOpen(open) { set({ profileOpen: open }); },
    setHangarOpen(open) { set({ hangarOpen: open }); },

    startStage(n) {
      cancelNext();
      pending = null;
      const stage = stageInfo(Math.min(STAGE_COUNT, Math.max(1, n)));
      const course = buildCourse(stage, 0);
      const p = get().profile;
      const leg = stage.leg;
      const phase: Phase = leg === 'moonwalk' ? 'moonwalk' : leg === 'earthLaunch' || leg === 'moonLaunch' ? 'build'
        : leg === 'dock' ? 'dock' : leg === 'repair' ? 'repair' : leg === 'reentry' ? 'splashdown' : 'prep';
      const assembly = freshAssembly(stage);
      set({
        screen: 'play',
        stage,
        course,
        status: 'playing',
        phase,
        assembly: prebuilt(stage) ? { ...assembly, tray: orderFor(stage)[0], need: 0 } : assembly,
        prep: freshPrep(stage),
        event: null,
        nextEvent: 0,
        pickups: { canisters: [], rings: {}, rescued: false },
        leaking: false,
        walk: leg === 'moonwalk' ? { field: moonField(stage), found: [], target: null, got: 0, need: 0 } : null,
        repair: freshRepair(),
        docked: false,
        dockResult: null,
        dockTries: 0,
        chutes: { drogue: null, mains: null },
        paused: false,
        pausedAt: 0,
        design: { ...p.design },
        fueling: freshFueling(stage),
        padReady: false,
        ignitedAt: 0,
        report: null,
        rocket: { engine: 0, fuel: 0, fuelMax: 0, shield: 0 },
        lives: Math.min(MAX_LIVES, START_LIVES + p.upgrades.life),
        distance: 0,
        progress: 0,
        streak: 0,
        stageStats: freshStats(),
        quiz: null,
        questionNumber: 0,
        intro: introFor(stage, course),
        feedback: null,
        steerY: null,
        steerDir: 0,
      });
    },

    dismissIntro() {
      const s = get();
      if (!s.intro) return;
      set({ intro: null });
      // the hop to the station: no systems check, straight off
      if (s.phase === 'prep' && !s.prep.plan.length) return startFlight();
      serveQuestion();
    },

    answer(i) {
      const s = get();
      const q = s.quiz;
      if (!q || q.done || !s.stage || s.status !== 'playing' || q.removed.includes(i)) return;
      const rec = q.quiz.record;
      const ok = i === q.quiz.correct;
      const p = s.profile;
      const history = recordResult(p.history, rec, ok);
      const streak = ok ? s.streak + 1 : 0;
      const amount = ok ? rewardFor(q, streak) : 0;
      const stats = {
        ...p.stats,
        answered: p.stats.answered + 1,
        right: p.stats.right + (ok ? 1 : 0),
        bestStreak: Math.max(p.stats.bestStreak, streak),
        coinsEarned: p.stats.coinsEarned + amount,
      };
      const stageStats = { ...s.stageStats, right: s.stageStats.right + (ok ? 1 : 0), wrong: s.stageStats.wrong + (ok ? 0 : 1), coins: s.stageStats.coins + amount };
      const common = {
        quiz: { ...q, picked: i, done: ok ? 'right' as const : 'wrong' as const },
        streak,
        coinEvent: ok ? { id: s.coinEvent.id + 1, amount, at: Date.now() } : s.coinEvent,
        profile: { ...p, wallet: p.wallet + amount, history, stats },
      };
      const sub = ok ? `+${amount}${streak >= 3 ? `  •  STREAK x${streak}` : ''}` : `The answer: ${rec.answer}`;

      if (q.task.kind === 'prep') {
        const g = q.task.gauge;
        const prep = { ...s.prep, asked: s.prep.asked + 1, got: { ...s.prep.got, [g]: s.prep.got[g] + (ok ? 1 : 0) } };
        set({
          ...common,
          stageStats,
          prep,
          partEvent: ok ? { id: s.partEvent.id + 1, part: g, ok: true } : s.partEvent,
          feedback: ok ? fb('correct', `${GAUGE_INFO[g].name}: ${GAUGE_INFO[g].what.toUpperCase()}`, sub) : fb('wrong', 'NOT CHARGED', sub),
        });
        save();
        pending = prep.asked >= prep.plan.length ? () => { pending = null; startFlight(); } : serveQuestion;
        after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
        return;
      }

      if (q.task.kind === 'event' && s.event) {
        const e = s.event;
        const event = { ...e, asked: e.asked + 1, got: e.got + (ok ? 1 : 0) };
        let shield = s.rocket.shield, fuel = s.rocket.fuel, lives = s.lives, bonus = 0, over = true;
        let say: Feedback;
        switch (e.kind) {
          case 'storm':
            shield = Math.min(MAX_SHIELD, shield + (ok ? 1 : 0));
            over = event.asked >= e.need;
            say = ok ? fb('correct', 'SHIELD CHARGED! +1', sub) : fb('wrong', 'NO CHARGE', sub);
            break;
          case 'flare':
            over = event.asked >= e.need || (e.deadline > 0 && Date.now() >= e.deadline);
            say = ok ? fb('correct', 'RADIATION SHIELDING +1', sub) : fb('wrong', 'NO SHIELDING', sub);
            break;
          case 'collision':
            say = ok ? fb('correct', 'THRUSTERS FIRED! DODGED IT!', sub) : fb('wrong', 'BRACE FOR IMPACT!', sub);
            break;
          case 'navigation':
            say = ok ? fb('correct', 'COURSE PLOTTED!', `Now fly through the ${RINGS} beacon rings`) : fb('wrong', 'ROUGH COURSE', `${sub} • follow the beacon rings back`);
            break;
          case 'fuelLeak':
            if (!ok) fuel = Math.max(0.2, fuel - 0.5);
            over = event.got >= e.need;
            say = ok ? fb('correct', 'LEAK PATCHED!', sub) : fb('wrong', 'STILL LEAKING! MORE FUEL LOST', sub);
            break;
          case 'comms':
            bonus = ok ? REWARD.comms : 0;
            say = ok ? fb('correct', `MESSAGE DECODED! +${REWARD.comms}`, 'Mission Control: "Great work, crew!"') : fb('wrong', 'MESSAGE LOST', sub);
            break;
          case 'burn':
            if (!ok) fuel = Math.max(0.3, fuel - 0.3);
            say = ok ? fb('correct', `BURN ${e.id + 1}/${s.course?.events.length ?? 5}: ON TARGET!`, sub) : fb('wrong', 'BURN OFF TARGET', `${sub} • a correction burn costs fuel`);
            break;
          case 'rescue':
            bonus = ok ? REWARD.rescue : 10;
            if (ok) lives = Math.min(MAX_LIVES, lives + 1);
            say = ok ? fb('correct', 'ASTRONAUT ABOARD! +1 HEART', `+${REWARD.rescue} coins`) : fb('info', 'ABOARD, BUT NEEDS REST', sub);
            break;
          default: {
            // an equipment failure: a wrong answer burns out a shield cell
            const sparks = !ok && shield > 0;
            if (!ok) shield = Math.max(0, shield - 1);
            over = event.got >= e.need;
            say = ok ? fb('correct', over ? `${FAULTS[e.fault ?? 'computer'].name}: FIXED!` : 'GOOD! ONE MORE STEP', sub)
              : fb('wrong', sparks ? 'SPARKS! A SHIELD CELL BURNT OUT' : 'NOT FIXED YET', sub);
          }
        }
        set({
          ...common,
          stageStats,
          event,
          lives,
          rocket: { ...s.rocket, shield, fuel },
          feedback: say,
          eventFx: e.kind === 'collision' || e.kind === 'rescue' ? { id: s.eventFx.id + 1, kind: e.kind, ok, at: Date.now() } : s.eventFx,
        });
        if (bonus) addCoins(bonus);
        if (e.kind === 'collision') {
          clearTimeout(clockTimer);
          if (!ok) damage('CRASH!');
        }
        save();
        if (get().status !== 'playing') return;
        pending = over ? finishEvent : serveQuestion;
        after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
        return;
      }

      if (q.task.kind === 'collect' && s.walk) {
        const part = q.task.part;
        const w = s.walk;
        const got = w.got + (ok ? 1 : 0);
        const made = got >= w.need;
        const found = made ? [...w.found, part] : w.found;
        const all = found.length >= w.field.parts.length;
        set({
          ...common,
          stageStats,
          walk: made ? { ...w, found, target: null, got: 0, need: 0 } : { ...w, got },
          partEvent: made ? { id: s.partEvent.id + 1, part, ok: true } : s.partEvent,
          profile: made ? { ...common.profile, stats: { ...common.profile.stats, partsBuilt: common.profile.stats.partsBuilt + 1 } } : common.profile,
          feedback: made ? fb('correct', `${ROCKET_PARTS[part].name} COLLECTED!`, all ? 'That was the last one!' : `${w.field.parts.length - found.length} more to find`)
            : ok ? fb('correct', 'RIGHT!', `${w.need - got} more to pick it up`) : fb('wrong', 'NOT QUITE', sub),
        });
        save();
        if (made) {
          pending = all ? () => { pending = null; arrive(); } : () => { pending = null; set({ quiz: null }); };
        } else pending = serveQuestion;
        after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
        return;
      }

      if (q.task.kind === 'repair') {
        const id = q.task.system;
        const got = { ...s.repair.got, [id]: s.repair.got[id] + (ok ? 1 : 0) };
        const fixed = got[id] >= repairNeed(id);
        const index = s.repair.index + (fixed ? 1 : 0);
        const all = index >= SYSTEM_ORDER.length;
        set({
          ...common,
          stageStats,
          repair: { got, index },
          partEvent: fixed ? { id: s.partEvent.id + 1, part: id, ok: true } : s.partEvent,
          feedback: fixed ? fb('correct', `${SYSTEMS[id].name} REPAIRED!`, all ? 'The ship is ready for the trip home' : sub)
            : ok ? fb('correct', 'RIGHT!', `${repairNeed(id) - got[id]} more for the ${SYSTEMS[id].name.toLowerCase()}`) : fb('wrong', 'STILL BROKEN', sub),
        });
        save();
        pending = all ? () => { pending = null; arrive(); } : serveQuestion;
        after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
        return;
      }

      if (q.task.kind === 'part') {
        const part = q.task.part;
        const a = s.assembly;
        const got = a.got + (ok ? 1 : 0);
        const made = ok && got >= a.need;
        const mistakes = ok ? a.mistakes : { ...a.mistakes, [part]: (a.mistakes[part] ?? 0) + 1 };
        set({
          ...common,
          stageStats,
          assembly: { ...a, got, mistakes, tray: made ? part : a.tray },
          feedback: made ? fb('correct', `${ROCKET_PARTS[part].name} IS READY!`, 'Fit it on the rocket')
            : ok ? fb('correct', 'RIGHT!', `${a.need - got} more for the ${ROCKET_PARTS[part].name.toLowerCase()}`)
            : fb('wrong', 'NOT QUITE', sub),
        });
        save();
        // made: the next question waits until it's fitted; otherwise the next question for this part
        if (made) pending = null;
        else {
          pending = serveQuestion;
          after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
        }
        return;
      }

      // fuelling and the crew check
      if (q.task.kind !== 'fuel' && q.task.kind !== 'oxidizer' && q.task.kind !== 'crew') return;
      const f = s.fueling;
      const k = q.task.kind;
      const leak = !ok && k !== 'crew';
      const fueling = { ...f, [k]: ok ? f[k] + 1 : Math.max(0, f[k] - (leak ? LEAK : 0)) };
      const doneAll = fueling.fuel >= f.need.fuel && fueling.oxidizer >= f.need.oxidizer && fueling.crew >= f.need.crew;
      set({
        ...common,
        stageStats: { ...stageStats, leaks: stageStats.leaks + (leak ? 1 : 0) },
        fueling,
        partEvent: ok ? { id: s.partEvent.id + 1, part: k, ok: true } : s.partEvent,
        feedback: ok
          ? fb('correct', k === 'crew' ? 'CREW CHECK PASSED!' : `${TASK_NAME[k]} +1`, sub)
          : fb('wrong', leak ? 'LEAK! A LITTLE SPILLED' : 'NOT CLEARED YET', sub),
      });
      save();
      pending = doneAll
        ? () => { pending = null; set({ quiz: null, padReady: true, feedback: fb('correct', 'ALL SYSTEMS GO!', 'Press GO FOR LAUNCH') }); }
        : serveQuestion;
      after(ok ? AFTER_RIGHT_MS : AFTER_WRONG_MS, () => pending?.());
    },

    next() {
      const q = get().quiz;
      if (!q?.done || !pending) return;
      cancelNext();
      const fn = pending;
      pending = null;
      fn();
    },

    useFifty() {
      const s = get();
      const q = s.quiz;
      if (!q || q.done || q.removed.length || q.quiz.record.trueFalse || s.status !== 'playing') return;
      if (!spend(FIFTY_COST)) {
        set({ feedback: fb('info', 'NOT ENOUGH COINS', `50/50 costs ${FIFTY_COST}`) });
        return;
      }
      get().freeFifty();
    },

    freeFifty() {
      const s = get();
      const q = s.quiz;
      if (!q || q.done || q.removed.length || q.quiz.record.trueFalse) return;
      const wrong = q.quiz.options.map((_, i) => i).filter((i) => i !== q.quiz.correct);
      const removed = wrong.sort(() => Math.random() - 0.5).slice(0, Math.max(0, wrong.length - 1));
      const p = get().profile;
      set({
        quiz: { ...q, removed, hints: q.hints + 1 },
        stageStats: { ...s.stageStats, hints: s.stageStats.hints + 1 },
        profile: { ...p, stats: { ...p.stats, hintsUsed: p.stats.hintsUsed + 1 } },
      });
      save();
    },

    say(text, sub) { set({ feedback: fb('info', text, sub) }); },

    placePart(part) {
      const s = get();
      const a = s.assembly;
      if (s.phase !== 'build' || a.tray !== part) return false;
      const bolts = ROCKET_PARTS[part].bolts.map(() => 0);
      const firstTry = !(a.mistakes[part] ?? 0) && !misfitParts.has(part);
      const bonus = firstTry ? 2 : 0;
      const p = s.profile;
      set({
        assembly: { ...a, tray: null, fitted: { ...a.fitted, [part]: { bolts, locked: bolts.length === 0 } } },
        stageStats: { ...s.stageStats, coins: s.stageStats.coins + bonus },
        profile: { ...p, wallet: p.wallet + bonus, stats: { ...p.stats, coinsEarned: p.stats.coinsEarned + bonus } },
        feedback: fb('correct', bonus ? `PERFECT FIT! +${bonus}` : 'IT FITS!', bolts.length ? `Now tap each bolt ${BOLT_TURNS} times` : undefined),
      });
      playJump();
      if (!bolts.length) partLocked(part);
      return true;
    },

    misfit(part) {
      const s = get();
      if (s.assembly.tray !== part) return;
      misfitParts.add(part);
      set({
        assembly: { ...s.assembly, mistakes: { ...s.assembly.mistakes, [part]: (s.assembly.mistakes[part] ?? 0) + 1 } },
        stageStats: { ...s.stageStats, misfits: s.stageStats.misfits + 1 },
        feedback: fb('wrong', "DOESN'T GO THERE", `Look at the prototype: where does the ${ROCKET_PARTS[part].name.toLowerCase()} go?`),
      });
    },

    turnBolt(part, k) {
      const s = get();
      const f = s.assembly.fitted[part];
      if (!f || f.locked || k < 0 || k >= f.bolts.length || f.bolts[k] >= BOLT_TURNS) return;
      const bolts = f.bolts.map((b, i) => (i === k ? b + 1 : b));
      const locked = bolts.every((b) => b >= BOLT_TURNS);
      set({ assembly: { ...s.assembly, fitted: { ...s.assembly.fitted, [part]: { bolts, locked } } } });
      playJump();
      if (locked) partLocked(part);
    },

    autoFit() {
      const s = get();
      const part = s.assembly.tray;
      if (part) get().placePart(part);
      const a = get().assembly;
      for (const id of Object.keys(a.fitted) as PartId[]) {
        const f = get().assembly.fitted[id]!;
        if (f.locked) continue;
        f.bolts.forEach((_, k) => { for (let t = 0; t < BOLT_TURNS; t++) get().turnBolt(id, k); });
      }
    },

    setDesign(d) {
      const cur = get().design;
      set({ design: { ...cur, ...d, name: d.name !== undefined ? cleanName(d.name) : cur.name } });
    },

    paintDone() {
      const s = get();
      if (s.phase !== 'paint') return;
      const design = { ...s.design, name: s.design.name.trim() || 'SPACEBOLT' };
      set({
        design,
        phase: 'fuel',
        profile: { ...s.profile, design },
        feedback: fb('info', 'TO THE LAUNCH PAD!', 'Answer to fill the tanks'),
      });
      save();
      playUnlock();
      after(1200, serveQuestion);
    },

    goForLaunch() {
      const s = get();
      if (s.phase !== 'fuel' || !s.padReady) return;
      const report = rocketReport(s.assembly, s.profile, vehicleFor(s.stage!));
      const fuel = (s.course!.length / TANK_RANGE) * 1.3 + s.profile.upgrades.tank * 0.5;
      set({
        phase: 'launch',
        quiz: null,
        ignitedAt: 0,
        report,
        rocket: { engine: report.engine, fuel, fuelMax: fuel, shield: report.shield },
        lives: Math.max(s.lives, report.lives),
        feedback: null,
      });
    },

    ignite() {
      const s = get();
      if (s.phase !== 'launch' || s.ignitedAt) return;
      set({ ignitedAt: Date.now() });
    },

    orbitReached() {
      if (get().phase !== 'launch') return;
      set({ phase: 'fly', distance: 0, progress: 0, feedback: fb('correct', 'ORBIT!', 'Steer to the landing site') });
    },

    landed() {
      if (get().phase !== 'landing') return;
      arrive();
    },

    reachPart(part) {
      const s = get();
      const w = s.walk;
      if (s.phase !== 'moonwalk' || s.status !== 'playing' || !w || w.target || w.found.includes(part)) return;
      if (!w.field.parts.some((p) => p.part === part)) return;
      set({
        walk: { ...w, target: part, got: 0, need: partAnswers(s.stage!, ROCKET_PARTS[part].major) },
        feedback: fb('info', `FOUND: ${ROCKET_PARTS[part].name}!`, 'Answer to pick it up'),
      });
      after(600, serveQuestion);
    },

    dockContact(ok, reason = '') {
      const s = get();
      if (s.phase !== 'dock' || s.status !== 'playing' || s.docked || s.dockResult) return;
      if (ok) {
        set({ docked: true, dockResult: { ok: true, reason: 'Hard seal: the hatch is opening' }, feedback: fb('correct', 'DOCKED SUCCESSFULLY!', 'Hard seal: the hatch is opening') });
        playUnlock();
        after(3200, arrive);
        return;
      }
      const lives = s.lives - 1;
      playExplosion();
      set({
        lives,
        streak: 0,
        dockResult: { ok: false, reason },
        hitEvent: { id: s.hitEvent.id + 1, blocked: false },
        stageStats: { ...s.stageStats, bumps: s.stageStats.bumps + 1 },
        feedback: fb('wrong', 'DOCKING FAILED', reason),
      });
      if (lives <= 0) fail();
    },

    retryDock() {
      const s = get();
      if (s.phase !== 'dock' || s.status !== 'playing' || !s.dockResult || s.dockResult.ok) return;
      set({ dockResult: null, dockTries: s.dockTries + 1, feedback: fb('info', 'BACKING OFF', 'Line up again, nice and slow') });
    },

    deployChute(kind, timing) {
      const s = get();
      if (s.phase !== 'splashdown' || s.status !== 'playing' || s.chutes[kind]) return;
      if (kind === 'mains' && !s.chutes.drogue) return;
      const late = timing === 'late';
      set({
        chutes: { ...s.chutes, [kind]: timing },
        stageStats: late ? { ...s.stageStats, hits: s.stageStats.hits + 1 } : s.stageStats,
        feedback: late
          ? fb('wrong', kind === 'drogue' ? 'BACKUP DROGUES FIRED!' : 'BACKUP MAINS FIRED!', 'Too late: a harder ride down')
          : fb('correct', kind === 'drogue' ? 'DROGUE CHUTES OUT!' : 'MAIN CHUTES OUT!', kind === 'drogue' ? 'Steady… now wait for the mains' : 'Three big canopies: gently down'),
      });
      if (!late) playJump();
    },

    setAgeGroup(group) {
      set({ profile: { ...get().profile, ageGroup: group } });
      save();
    },

    togglePause() {
      const s = get();
      if (s.screen !== 'play' || s.status !== 'playing') return;
      if (!s.paused) {
        clearTimeout(nextTimer);
        clearTimeout(clockTimer);
        set({ paused: true, pausedAt: Date.now(), steerY: null, steerDir: 0 });
        return;
      }
      // everything that runs on the clock moves on by the time spent paused
      const d = Date.now() - s.pausedAt;
      const e = s.event;
      set({
        paused: false,
        pausedAt: 0,
        ignitedAt: s.ignitedAt ? s.ignitedAt + d : 0,
        event: e && e.deadline ? { ...e, deadline: e.deadline + d } : e,
        quiz: s.quiz ? { ...s.quiz, startedAt: s.quiz.startedAt + d } : null,
      });
      if (nextFn) {
        nextAt += d;
        nextTimer = setTimeout(runNext, Math.max(0, nextAt - Date.now()));
      }
      const e2 = get().event;
      if (e2?.deadline) armClock(e2.deadline);
    },

    splashed() {
      if (get().phase !== 'splashdown') return;
      arrive();
    },

    buyUpgrade(id) {
      const p = get().profile;
      const level = p.upgrades[id] ?? 0;
      if (level >= UPGRADE_MAX) return false;
      if (!spend(upgradeCost(id, level))) return false;
      const q = get().profile;
      set({ profile: { ...q, upgrades: { ...q.upgrades, [id]: level + 1 } } });
      save();
      playUnlock();
      return true;
    },

    setSteerY(y) { if (get().steerY !== y) set({ steerY: y }); },
    setSteerDir(d) { if (get().steerDir !== d) set({ steerDir: d }); },

    flew(dx) {
      const s = get();
      if (s.status !== 'playing' || s.phase !== 'fly' || !s.course || s.event) return;
      const stop = s.course.events[s.nextEvent];
      const blocking = !!stop && EVENT_INFO[stop.kind].blocking;
      const distance = Math.min(s.course.length, stop && blocking ? Math.min(stop.x, s.distance + dx) : s.distance + dx);
      // after a fuel leak the tank drains twice as fast until the canister stretch is over
      const leakZone = s.leaking && s.course.zones.find((z) => z.kind === 'canisters' && distance < z.x1);
      const leaking = !!leakZone;
      let fuel = s.rocket.fuel - ((distance - s.distance) / TANK_RANGE) * (leaking ? 2 : 1);
      set({ distance, progress: distance / s.course.length, leaking, rocket: { ...s.rocket, fuel: Math.max(0, fuel) } });
      if (fuel <= 0) {
        fuel = 1;
        set({ rocket: { ...get().rocket, fuel } });
        damage('OUT OF FUEL!');
        if (get().status !== 'playing') return;
        set({ feedback: fb('wrong', 'OUT OF FUEL!', 'The emergency reserve kicked in: catch fuel when you can') });
      }
      if (stop && distance >= stop.x) {
        if (blocking) startEvent(stop);
        else announce(stop);
      } else if (distance >= s.course.length) flightOver();
    },

    passRing(id, hit) {
      const s = get();
      if (s.phase !== 'fly' || s.status !== 'playing' || id in s.pickups.rings) return;
      const rings = { ...s.pickups.rings, [id]: hit };
      const done = Object.values(rings).filter(Boolean).length;
      set({
        pickups: { ...s.pickups, rings },
        rocket: hit ? s.rocket : { ...s.rocket, fuel: Math.max(0.2, s.rocket.fuel - 0.3) },
        feedback: hit ? fb('correct', `BEACON ${done}/${RINGS} ✓`, `+${REWARD.ring}`) : fb('wrong', 'MISSED A BEACON!', 'Course corrections cost fuel'),
      });
      if (hit) { addCoins(REWARD.ring); playJump(); }
    },

    catchCanister(id) {
      const s = get();
      if (s.phase !== 'fly' || s.status !== 'playing' || s.pickups.canisters.includes(id)) return;
      const fuel = Math.min(s.rocket.fuelMax, s.rocket.fuel + CANISTER_FUEL);
      set({ pickups: { ...s.pickups, canisters: [...s.pickups.canisters, id] }, rocket: { ...s.rocket, fuel }, feedback: fb('correct', 'FUEL CAUGHT!', `+${REWARD.canister}`) });
      addCoins(REWARD.canister);
      playJump();
    },

    reachRescue() {
      const s = get();
      if (s.phase !== 'fly' || s.status !== 'playing' || s.event || s.pickups.rescued || !s.course?.rescue) return;
      set({ pickups: { ...s.pickups, rescued: true } });
      startEvent({ id: 100, x: s.distance, kind: 'rescue', need: 1 }, false);
    },

    hazardHit() {
      const s = get();
      if (!s.stage || s.status !== 'playing' || s.phase !== 'fly' || s.event) return;
      damage('OUCH!');
    },

    pickCoin() {
      const s = get();
      const p = s.profile;
      set({
        stageStats: { ...s.stageStats, pickups: s.stageStats.pickups + 1, coins: s.stageStats.coins + 1 },
        profile: { ...p, wallet: p.wallet + 1, stats: { ...p.stats, coinsEarned: p.stats.coinsEarned + 1 } },
      });
      save();
    },

    adoptProfile(profile) {
      set({ profile });
      save();
    },

    resetProgress() {
      // a fresh start, but the age gate's answer stays (it's about the player, not the game)
      set({ profile: { ...freshProfile(), ageGroup: get().profile.ageGroup } });
      save();
    },
  };
});

/** Parts dropped in the wrong place at least once this stage (no perfect-fit bonus). */
const misfitParts = new Set<PartId>();
gameStore.subscribe((s, prev) => { if (s.stage !== prev.stage) misfitParts.clear(); });

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector);
}

/** Two saves of the same player (device and cloud) → one, keeping the best of both. */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const stars: Record<number, number> = { ...a.stars };
  for (const [k, v] of Object.entries(b.stars)) stars[+k] = Math.max(stars[+k] ?? 0, v);
  const stats = { ...a.stats };
  for (const k of Object.keys(b.stats) as Array<keyof Profile['stats']>) stats[k] = Math.max(stats[k] ?? 0, b.stats[k] ?? 0);
  const upgrades = { ...a.upgrades };
  for (const k of Object.keys(b.upgrades) as UpgradeId[]) upgrades[k] = Math.max(upgrades[k] ?? 0, b.upgrades[k] ?? 0);
  const newer = b.stats.answered > a.stats.answered ? b : a;
  return {
    campaign: CAMPAIGN,
    // a child on either device stays a child
    ageGroup: a.ageGroup === 'child' || b.ageGroup === 'child' ? 'child' : a.ageGroup ?? b.ageGroup,
    wallet: Math.max(a.wallet, b.wallet),
    stars,
    unlocked: Math.max(a.unlocked, b.unlocked),
    upgrades,
    design: newer.design,
    stats,
    history: newer.history,
  };
}

/** A saved profile (device or cloud); anything missing or malformed falls back to a fresh value. */
export function profileFrom(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Profile>;
  const base = freshProfile();
  const d = (r.design ?? {}) as Partial<RocketDesign>;
  // a save from before the round trip: keep coins, upgrades and stats; the stages start again
  const current = r.campaign === CAMPAIGN;
  return {
    ...base,
    ...r,
    campaign: CAMPAIGN,
    ageGroup: r.ageGroup === 'child' || r.ageGroup === 'general' ? r.ageGroup : null,
    wallet: typeof r.wallet === 'number' ? r.wallet : 0,
    unlocked: current && typeof r.unlocked === 'number' ? Math.min(STAGE_COUNT, Math.max(1, r.unlocked)) : 1,
    stars: current ? { ...(r.stars ?? {}) } : {},
    upgrades: { ...base.upgrades, ...(r.upgrades ?? {}) },
    design: { ...base.design, ...d, name: cleanName(typeof d.name === 'string' ? d.name : base.design.name) },
    stats: { ...base.stats, ...(r.stats ?? {}) },
    history: { ...base.history, ...(r.history ?? {}) },
  };
}
