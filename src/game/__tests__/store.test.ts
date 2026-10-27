import { CAMPAIGN, gameStore, mergeProfiles, profileFrom, rocketReport } from '../store';
import {
  CANISTER_FUEL, LEAK_LOSS, MAX_LIVES, MAX_SHIELD, REWARD, RINGS, STAGE_COUNT, SYSTEM_ORDER,
  buildCourse, fuelNeed, partAnswers, prepPlan, repairNeed, stageEvents, stageInfo, walkParts, type EventKind,
} from '../rules';
import { BUILD_ORDER, PARTS, SHUTTLE_ORDER } from '../../rocket/model';

const s = () => gameStore.getState();
const tick = (ms = 1000) => jest.advanceTimersByTime(ms);

/** Answer the current question (right or wrong), then move on. */
function answer(right: boolean) {
  const q = s().quiz!;
  const i = right ? q.quiz.correct : q.quiz.options.findIndex((_, k) => k !== q.quiz.correct);
  s().answer(i);
  s().next();
  tick();
}

/** Make and fit every part: `right(part)` says whether to answer that part's questions right first time. */
function build(right: (part: string) => boolean = () => true) {
  let guard = 0;
  while (s().phase === 'build' && guard++ < 400) {
    const st = s();
    if (st.assembly.tray || Object.values(st.assembly.fitted).some((f) => f && !f.locked)) { st.autoFit(); tick(); continue; }
    if (!st.quiz || st.quiz.done) { tick(); continue; }
    const part = st.quiz.task.kind === 'part' ? st.quiz.task.part : '';
    // a part answered wrong once (then right)
    const wrongOnce = !right(part) && !(st.assembly.mistakes[part as never] ?? 0);
    answer(!wrongOnce);
  }
  tick(1500);
}

function fuelUp(right = () => true) {
  let guard = 0;
  while (!s().padReady && guard++ < 200) {
    if (s().quiz && !s().quiz!.done) answer(right());
    else tick();
  }
}

/** Fly on, answering every stop's questions (right, unless `right` says otherwise). */
function flyToEnd(right: () => boolean = () => true) {
  let guard = 0;
  while (s().phase === 'fly' && s().status === 'playing' && guard++ < 20000) {
    if (s().event) {
      if (s().quiz && !s().quiz!.done) answer(right());
      else tick();
      continue;
    }
    s().flew(50);
  }
}

/** The systems check before a flight. */
function check(right: () => boolean = () => true) {
  let guard = 0;
  while (s().phase === 'prep' && guard++ < 100) {
    if (s().quiz && !s().quiz!.done) answer(right());
    else tick();
  }
}

/** The first stage whose flight has this show stopper. */
const stageWith = (kind: EventKind) => Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).find((n) => stageEvents(stageInfo(n)).some((e) => e.kind === kind))!;

/** Fly on (answering every other stop right) until the flight stops for this show stopper, its question up. */
function flyTo(kind: EventKind) {
  let guard = 0;
  while (s().event?.kind !== kind && s().status === 'playing' && guard++ < 20000) {
    if (s().event) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); continue; }
    s().flew(50);
  }
  tick(1500);
}

/** Answer every question of the current stop. */
function clearStop(right = true) {
  let guard = 0;
  while (s().event && s().status === 'playing' && guard++ < 30) { if (s().quiz && !s().quiz!.done) answer(right); else tick(); }
}

/** Start a stage and get past its round card. */
function begin(n: number) {
  s().startStage(n);
  s().dismissIntro();
}

beforeEach(() => {
  jest.useFakeTimers();
  s().resetProgress();
  s().openMap();
});
afterEach(() => jest.useRealTimers());

describe('a whole mission', () => {
  it('builds every part from questions, paints and names it, fuels up, launches, flies and lands', () => {
    s().startStage(1);
    expect(s().intro).not.toBeNull();
    s().dismissIntro();
    expect(s().phase).toBe('build');
    expect(s().quiz!.task).toEqual({ kind: 'part', part: 'boosterTube' });
    build();
    expect(BUILD_ORDER.every((p) => s().assembly.fitted[p]?.locked)).toBe(true);
    expect(s().phase).toBe('paint');

    s().setDesign({ name: 'luna 7!', body: '#2f6fd6', pattern: 'flames' });
    expect(s().design.name).toBe('LUNA 7!');
    s().paintDone();
    expect(s().phase).toBe('fuel');
    expect(s().profile.design.name).toBe('LUNA 7!');
    tick(1500);
    expect(s().quiz!.task.kind).toBe('fuel');
    fuelUp();
    expect(s().padReady).toBe(true);

    s().goForLaunch();
    expect(s().phase).toBe('launch');
    expect(s().report!.quality).toBe(100);
    s().ignite();
    expect(s().ignitedAt).toBeGreaterThan(0);
    s().orbitReached();
    expect(s().phase).toBe('fly');
    flyToEnd();
    // stage 1 ends in Earth orbit: no landing
    expect(s().status).toBe('complete');
    expect(s().profile.unlocked).toBe(2);
    expect(s().profile.stars[1]).toBe(3);
    expect(s().profile.stats.landings).toBe(0);
  });

  it('asks the right subject for each part, and two answers per major part on the Moon', () => {
    for (const p of BUILD_ORDER) expect(['physics', 'space', 'chemistry', 'body']).toContain(PARTS[p].subject);
    expect(partAnswers(stageInfo(1), true)).toBe(1);
    expect(partAnswers(stageInfo(21), true)).toBe(2);
    expect(partAnswers(stageInfo(21), false)).toBe(1);
  });
});

describe('a flight leg', () => {
  it('starts with a systems check: a question per gauge, right answers charge the rocket', () => {
    begin(13);
    expect(s().phase).toBe('prep');
    const plan = prepPlan(stageInfo(13));
    expect(s().quiz!.task).toEqual({ kind: 'prep', gauge: plan[0] });
    expect(s().quiz!.quiz.record.subject).toBe('physics');
    // all right but the last (life support)
    let k = 0;
    check(() => ++k < plan.length);
    expect(s().phase).toBe('fly');
    const shields = plan.filter((g) => g === 'shield').length;
    expect(s().rocket.shield).toBe(shields);
    expect(s().rocket.engine).toBe(1 + plan.filter((g) => g === 'engine').length);
    expect(s().report!.quality).toBeLessThan(100);
  });

  it('stops for a fault: logic questions until it is fixed; a wrong answer burns out a shield', () => {
    begin(4);
    check();
    const stop = buildCourse(stageInfo(4), 0).events[0];
    while (!s().event) s().flew(50);
    expect(s().distance).toBe(stop.x);
    expect(s().event!.kind).toBe('fault');
    tick(2000);
    expect(s().quiz!.task).toEqual({ kind: 'event' });
    expect(s().quiz!.quiz.record.subject).toBe('logic');
    // paused: no flying, no hits while the questions are up
    const at = s().distance;
    s().flew(500);
    s().hazardHit();
    expect(s().distance).toBe(at);
    expect(s().stageStats.hits).toBe(0);
    const shields = s().rocket.shield;
    answer(false);
    expect(s().rocket.shield).toBe(Math.max(0, shields - 1));
    expect(s().event).not.toBeNull();
    while (s().event) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); }
    expect(s().nextEvent).toBe(1);
    s().flew(50);
    expect(s().distance).toBeGreaterThan(at);
  });

  it('an asteroid storm asks a set number of questions: a shield for each right answer', () => {
    begin(6);
    check();
    flyTo('storm');
    const before = s().rocket.shield;
    const need = s().event!.need;
    answer(true);
    expect(s().rocket.shield).toBe(Math.min(MAX_SHIELD, before + 1));
    answer(false);
    expect(s().rocket.shield).toBe(Math.min(MAX_SHIELD, before + 1));
    clearStop();
    expect(s().event).toBeNull();
    expect(s().event?.asked ?? need).toBeGreaterThanOrEqual(0);
    flyToEnd();
    expect(s().status).toBe('complete');
  });
});

describe('show stoppers', () => {
  it('collision course: a right answer in time fires the thrusters', () => {
    begin(stageWith('collision'));
    check();
    flyTo('collision');
    expect(s().event!.deadline).toBeGreaterThan(Date.now());
    const lives = s().lives, shield = s().rocket.shield;
    answer(true);
    expect(s().eventFx).toMatchObject({ kind: 'collision', ok: true });
    expect([s().lives, s().rocket.shield]).toEqual([lives, shield]);
    expect(s().event).toBeNull();
  });

  it('collision course: too late is a crash (shield first, then a heart)', () => {
    begin(stageWith('collision'));
    check();
    flyTo('collision');
    const lives = s().lives, shield = s().rocket.shield;
    tick(16000);
    expect(s().stageStats.wrong).toBe(1);
    expect(s().eventFx).toMatchObject({ kind: 'collision', ok: false });
    if (shield > 0) expect(s().rocket.shield).toBe(shield - 1);
    else expect(s().lives).toBe(lives - 1);
  });

  it('solar flare: shielding answers before the clock runs out keep the crew safe', () => {
    begin(stageWith('flare'));
    check();
    flyTo('flare');
    const lives = s().lives, shield = s().rocket.shield;
    clearStop(true);
    expect(s().eventFx).toMatchObject({ kind: 'flare', ok: true });
    expect([s().lives, s().rocket.shield]).toEqual([lives, shield]);
  });

  it('solar flare: no shielding when it arrives means radiation hits', () => {
    begin(stageWith('flare'));
    check();
    flyTo('flare');
    const shield = s().rocket.shield, lives = s().lives;
    tick(60000); // nobody answers
    expect(s().event).toBeNull();
    expect(s().eventFx).toMatchObject({ kind: 'flare', ok: false });
    expect(shield + lives - (s().rocket.shield + s().lives)).toBe(Math.min(2, shield + lives));
  });

  it('navigation error: re-plot the course, then each beacon ring flown through pays, a missed one costs fuel', () => {
    begin(stageWith('navigation'));
    check();
    flyTo('navigation');
    expect(s().quiz!.quiz.record.subject).toBe('logic');
    clearStop();
    const rings = s().course!.rings;
    expect(rings).toHaveLength(RINGS);
    const wallet = s().profile.wallet;
    s().passRing(rings[0].id, true);
    s().passRing(rings[0].id, true); // once only
    expect(s().profile.wallet).toBe(wallet + REWARD.ring);
    const fuel = s().rocket.fuel;
    s().passRing(rings[1].id, false);
    expect(s().rocket.fuel).toBeCloseTo(Math.max(0.2, fuel - 0.3));
  });

  it('fuel leak: it costs fuel, then the tank drains fast until the canisters are passed; each canister refuels', () => {
    begin(stageWith('fuelLeak'));
    check();
    let guard = 0;
    while (s().course!.events[s().nextEvent]?.kind !== 'fuelLeak' && guard++ < 20000) {
      if (s().event) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); continue; }
      s().flew(50);
    }
    s().flew(s().course!.events[s().nextEvent].x - s().distance - 1);
    const before = s().rocket.fuel;
    s().flew(5);
    expect(s().event!.kind).toBe('fuelLeak');
    expect(s().rocket.fuel).toBeCloseTo(Math.max(0.3, before - LEAK_LOSS), 2);
    tick(1500);
    clearStop();
    expect(s().leaking).toBe(true);
    const can = s().course!.canisters[0];
    const fuel = s().rocket.fuel;
    s().catchCanister(can.id);
    expect(s().rocket.fuel).toBeCloseTo(Math.min(s().rocket.fuelMax, fuel + CANISTER_FUEL));
    flyToEnd();
    expect(s().leaking).toBe(false);
  });

  it('running dry costs a heart (or a shield) and kicks in the reserve tank', () => {
    begin(2);
    check();
    s().flew(10);
    gameStore.setState({ rocket: { ...s().rocket, fuel: 0.001, shield: 0 } });
    const lives = s().lives;
    s().flew(50);
    expect(s().lives).toBe(lives - 1);
    expect(s().rocket.fuel).toBeGreaterThan(0.9);
  });

  it('mayday: the warning does not stop the flight; reaching the astronaut asks a health check, right brings a heart', () => {
    begin(stageWith('rescue'));
    check();
    let guard = 0;
    while (s().course!.events[s().nextEvent]?.kind !== 'rescue' && guard++ < 20000) {
      if (s().event) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); continue; }
      s().flew(50);
    }
    s().flew(s().course!.events[s().nextEvent].x - s().distance + 1);
    expect(s().event).toBeNull();
    expect(s().feedback!.text).toMatch(/MAYDAY/);
    gameStore.setState({ lives: 2 });
    s().reachRescue();
    tick(1500);
    expect(s().quiz!.task.kind).toBe('event');
    expect(s().quiz!.quiz.record.subject).toBe('body');
    answer(true);
    expect(s().lives).toBe(3);
    s().reachRescue();
    expect(s().event).toBeNull(); // once only
  });

  it('a secret message decoded pays a reward', () => {
    begin(stageWith('comms'));
    check();
    flyTo('comms');
    const wallet = s().profile.wallet;
    answer(true);
    expect(s().profile.wallet).toBeGreaterThanOrEqual(wallet + REWARD.comms);
  });

  it('space junk just warns: the flight goes on', () => {
    begin(stageWith('debris'));
    check();
    let guard = 0;
    while (s().course!.events[s().nextEvent]?.kind !== 'debris' && guard++ < 20000) {
      if (s().event) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); continue; }
      s().flew(50);
    }
    const at = s().course!.events[s().nextEvent].x;
    s().flew(at - s().distance + 60);
    expect(s().event).toBeNull();
    expect(s().distance).toBeGreaterThan(at);
    expect(s().feedback!.text).toMatch(/JUNK/);
  });
});

describe('the Moon', () => {
  it('lands on the Moon at the end of stage 20', () => {
    begin(20);
    check();
    flyToEnd();
    expect(s().phase).toBe('landing');
    s().landed();
    expect(s().status).toBe('complete');
    expect(s().profile.stats.landings).toBe(1);
    expect(s().profile.unlocked).toBe(21);
  });

  it('the Moon walk: reach a part, answer to pick it up; all found ends the stage', () => {
    begin(21);
    expect(s().phase).toBe('moonwalk');
    expect(s().quiz).toBeNull();
    const parts = walkParts(stageInfo(21));
    expect(s().walk!.field.parts.map((p) => p.part)).toEqual(parts);
    for (const part of parts) {
      s().reachPart(part);
      expect(s().walk!.target).toBe(part);
      // walking onto another part meanwhile does nothing
      s().reachPart(parts.find((p) => p !== part)!);
      expect(s().walk!.target).toBe(part);
      tick();
      expect(s().quiz!.task).toEqual({ kind: 'collect', part });
      expect(s().walk!.need).toBe(partAnswers(stageInfo(21), PARTS[part].major));
      let guard = 0;
      while (s().walk!.target && guard++ < 20) { if (s().quiz && !s().quiz!.done) answer(true); else tick(); }
      tick(2000);
    }
    expect(s().walk!.found).toEqual(parts);
    expect(s().status).toBe('complete');
  });

  it('the Moon liftoff: build the Lunar Shuttle from the found parts (no questions), fuel up, lift off', () => {
    begin(23);
    expect(s().phase).toBe('build');
    expect(s().quiz).toBeNull();
    expect(s().assembly.tray).toBe(SHUTTLE_ORDER[0]);
    let guard = 0;
    while (s().phase === 'build' && guard++ < 100) { s().autoFit(); tick(); }
    expect(SHUTTLE_ORDER.every((p) => s().assembly.fitted[p]?.locked)).toBe(true);
    expect(s().stageStats.right + s().stageStats.wrong).toBe(0);
    expect(s().phase).toBe('fuel');
    tick(1500);
    fuelUp();
    s().goForLaunch();
    expect(s().report!.total).toBe(SHUTTLE_ORDER.length);
    s().ignite();
    s().orbitReached();
    flyToEnd();
    expect(s().status).toBe('complete');
  });
});

describe('the way home', () => {
  it('the hop to the space station: no systems check, exactly five questions, one per course burn', () => {
    begin(24);
    expect(s().phase).toBe('fly');
    expect(s().course!.events).toHaveLength(5);
    let asked = 0;
    let guard = 0;
    while (s().status === 'playing' && guard++ < 20000) {
      if (s().event) {
        if (s().quiz && !s().quiz!.done) { expect(s().event!.kind).toBe('burn'); asked++; answer(true); } else tick();
        continue;
      }
      s().flew(50);
    }
    expect(asked).toBe(5);
    expect(s().status).toBe('complete');
  });

  it('docking: a bad approach fails (a heart, and why); back off and try again; a good one docks', () => {
    begin(25);
    expect(s().phase).toBe('dock');
    const lives = s().lives;
    s().dockContact(false, 'Too fast');
    expect(s().lives).toBe(lives - 1);
    expect(s().dockResult).toEqual({ ok: false, reason: 'Too fast' });
    s().dockContact(true); // no second contact while the failure is up
    expect(s().docked).toBe(false);
    s().retryDock();
    expect(s().dockResult).toBeNull();
    expect(s().dockTries).toBe(1);
    s().dockContact(true);
    expect(s().docked).toBe(true);
    expect(s().dockResult!.ok).toBe(true);
    tick(4000);
    expect(s().status).toBe('complete');
  });

  it('failing to dock with no hearts left ends the stage', () => {
    begin(25);
    let guard = 0;
    while (s().status === 'playing' && guard++ < 20) { s().dockContact(false, 'Off centre'); s().retryDock(); }
    expect(s().status).toBe('failed');
  });

  it('repairs: every system fixed with questions; the flight computer with logic', () => {
    begin(26);
    expect(s().phase).toBe('repair');
    expect(s().quiz!.task).toEqual({ kind: 'repair', system: SYSTEM_ORDER[0] });
    let guard = 0;
    let sawLogic = false;
    while (s().status === 'playing' && guard++ < 50) {
      if (s().quiz && !s().quiz!.done) {
        if ((s().quiz!.task as { system?: string }).system === 'computer') sawLogic = s().quiz!.quiz.record.subject === 'logic';
        answer(true);
      } else tick();
    }
    expect(sawLogic).toBe(true);
    expect(s().status).toBe('complete');
    for (const id of SYSTEM_ORDER) expect(s().repair.got[id]).toBe(repairNeed(id));
  });

  it('home: you fire the parachutes; in time is a clean splashdown, late costs stars', () => {
    begin(STAGE_COUNT);
    expect(s().phase).toBe('splashdown');
    s().deployChute('mains', 'ok'); // the drogues come first
    expect(s().chutes.mains).toBeNull();
    s().deployChute('drogue', 'ok');
    s().deployChute('mains', 'late');
    expect(s().chutes).toEqual({ drogue: 'ok', mains: 'late' });
    expect(s().stageStats.hits).toBe(1);
    s().splashed();
    expect(s().status).toBe('complete');
    expect(s().stageStats.stars).toBeLessThan(3);
    expect(s().profile.stats.landings).toBe(1);
    begin(STAGE_COUNT);
    s().deployChute('drogue', 'ok');
    s().deployChute('mains', 'ok');
    s().splashed();
    expect(s().stageStats.stars).toBe(3);
  });
});

describe('pause', () => {
  it('stops the clock: nothing moves on while paused, and timed questions keep their time', () => {
    begin(stageWith('collision'));
    check();
    flyTo('collision');
    const left = s().event!.deadline - Date.now();
    s().togglePause();
    expect(s().paused).toBe(true);
    const at = s().distance;
    s().flew(500);
    tick(60000); // a long pause: the collision clock doesn't run out
    expect(s().quiz!.done).toBeNull();
    s().togglePause();
    expect(s().paused).toBe(false);
    expect(s().event!.deadline - Date.now()).toBeGreaterThan(left - 50);
    answer(true);
    expect(s().eventFx).toMatchObject({ kind: 'collision', ok: true });
    expect(s().distance).toBe(at);
  });

  it('the next question waits while paused', () => {
    begin(13);
    const q = s().quiz!;
    s().answer(q.quiz.correct);
    s().togglePause();
    tick(20000);
    expect(s().quiz!.quiz.record.id).toBe(q.quiz.record.id);
    s().togglePause();
    tick(5000);
    expect(s().quiz!.quiz.record.id).not.toBe(q.quiz.record.id);
  });
});

describe('the workshop', () => {
  it('a made part waits in the tray; the next question comes only once it is bolted on', () => {
    s().startStage(1);
    s().dismissIntro();
    const q = s().quiz!;
    s().answer(q.quiz.correct);
    expect(s().assembly.tray).toBe('boosterTube');
    tick(10000);
    expect(s().quiz!.quiz.record.id).toBe(q.quiz.record.id);
    expect(s().placePart('boosterTube')).toBe(true); // no bolts: locks at once
    tick();
    expect(s().quiz!.task).toEqual({ kind: 'part', part: 'engineMount' });
    s().answer(s().quiz!.quiz.correct);
    expect(s().placePart('engineMount')).toBe(true);
    expect(s().assembly.fitted.engineMount!.locked).toBe(false);
    for (let k = 0; k < PARTS.engineMount.bolts.length; k++) for (let t = 0; t < 3; t++) s().turnBolt('engineMount', k);
    expect(s().assembly.fitted.engineMount!.locked).toBe(true);
    expect(s().assembly.index).toBe(2);
  });

  it('wrong answers and wrong drops make a part less than perfect, and a weaker rocket', () => {
    s().startStage(1);
    s().dismissIntro();
    build((p) => p !== 'fins' && p !== 'payload');
    expect(s().assembly.mistakes.fins).toBe(1);
    const r = rocketReport(s().assembly, s().profile);
    expect(r.perfect).toBe(BUILD_ORDER.length - 2);
    expect(r.engine).toBe(2); // engine mount and legs perfect, fins not
    expect(r.lives).toBe(3); // payload not perfect: no extra heart
  });

  it('a misfit counts against the part and gives a hint', () => {
    s().startStage(1);
    s().dismissIntro();
    s().answer(s().quiz!.quiz.correct);
    s().misfit('boosterTube');
    expect(s().stageStats.misfits).toBe(1);
    expect(s().feedback!.text).toBe("DOESN'T GO THERE");
    expect(s().assembly.mistakes.boosterTube).toBe(1);
  });
});

describe('on the launch pad', () => {
  function toPad(n = 1) {
    s().startStage(n);
    s().dismissIntro();
    build();
    s().paintDone();
    tick(1500);
  }

  it('fills fuel, then oxygen, then the crew check, one right answer a notch', () => {
    toPad();
    const need = fuelNeed(stageInfo(1));
    for (let i = 0; i < need.fuel; i++) { expect(s().quiz!.task.kind).toBe('fuel'); answer(true); }
    for (let i = 0; i < need.oxidizer; i++) { expect(s().quiz!.task.kind).toBe('oxidizer'); answer(true); }
    expect(s().quiz!.task.kind).toBe('crew');
    expect(s().quiz!.quiz.record.subject).toBe('body');
    answer(true);
    expect(s().padReady).toBe(true);
  });

  it('a wrong answer while fuelling leaks half a notch', () => {
    toPad();
    answer(true);
    expect(s().fueling.fuel).toBe(1);
    answer(false);
    expect(s().fueling.fuel).toBe(0.5);
    expect(s().stageStats.leaks).toBe(1);
  });
});

describe('the journey', () => {
  function launch() {
    s().startStage(1);
    s().dismissIntro();
    build();
    s().paintDone();
    tick(1500);
    fuelUp();
    s().goForLaunch();
    s().ignite();
    s().orbitReached();
  }

  it('has fuel to spare for every flight', () => {
    launch();
    flyToEnd();
    expect(s().status).toBe('complete');
    expect(s().rocket.fuel).toBeGreaterThan(0);
    begin(19);
    check();
    flyToEnd();
    expect(s().rocket.fuel).toBeGreaterThan(0);
  });

  it('a shield takes a hit before a heart does; no hearts left ends the mission', () => {
    launch();
    const shields = s().rocket.shield;
    expect(shields).toBe(3); // 13 perfect parts
    const lives = s().lives;
    s().hazardHit();
    expect(s().rocket.shield).toBe(shields - 1);
    expect(s().lives).toBe(lives);
    for (let i = 0; i < shields - 1; i++) s().hazardHit();
    s().hazardHit();
    expect(s().lives).toBe(lives - 1);
    while (s().status === 'playing') s().hazardHit();
    expect(s().status).toBe('failed');
    expect(lives).toBeLessThanOrEqual(MAX_LIVES);
  });
});

describe('hints and the hangar', () => {
  it('50/50 costs coins and removes wrong answers only', () => {
    s().adoptProfile({ ...s().profile, wallet: 100 });
    s().startStage(3);
    s().dismissIntro();
    let guard = 0;
    while (s().quiz!.quiz.record.trueFalse && guard++ < 30) { answer(true); if (s().assembly.tray) { s().autoFit(); tick(); } }
    const before = s().profile.wallet;
    s().useFifty();
    const q = s().quiz!;
    expect(s().profile.wallet).toBe(before - 10);
    expect(q.removed).toHaveLength(2);
    expect(q.removed).not.toContain(q.quiz.correct);
  });

  it('upgrades cost coins and power up the rocket', () => {
    s().adoptProfile({ ...s().profile, wallet: 1000 });
    expect(s().buyUpgrade('shield')).toBe(true);
    expect(s().profile.upgrades.shield).toBe(1);
    expect(s().profile.wallet).toBe(800);
    s().adoptProfile({ ...s().profile, wallet: 0 });
    expect(s().buyUpgrade('engine')).toBe(false);
  });
});

describe('saves', () => {
  it('merges two saves, keeping the best of each', () => {
    const a = profileFrom({ campaign: CAMPAIGN, wallet: 50, unlocked: 4, stars: { 1: 3, 2: 1 }, upgrades: { engine: 1 } })!;
    const b = profileFrom({ campaign: CAMPAIGN, wallet: 80, unlocked: 2, stars: { 2: 2 }, upgrades: { tank: 2 } })!;
    const m = mergeProfiles(a, b);
    expect(m.wallet).toBe(80);
    expect(m.unlocked).toBe(4);
    expect(m.stars).toEqual({ 1: 3, 2: 2 });
    expect(m.upgrades).toEqual({ engine: 1, tank: 2, shield: 0, life: 0 });
  });

  it('a save from before the round trip keeps its coins, upgrades and stats, and starts the stages again', () => {
    const old = profileFrom({ wallet: 900, unlocked: 37, stars: { 1: 3, 36: 2 }, upgrades: { shield: 2 }, stats: { answered: 400 } })!;
    expect(old.campaign).toBe(CAMPAIGN);
    expect(old.wallet).toBe(900);
    expect(old.upgrades.shield).toBe(2);
    expect(old.stats.answered).toBe(400);
    expect(old.unlocked).toBe(1);
    expect(old.stars).toEqual({});
  });

  it('keeps the age gate\'s answer: a child on either device stays a child, and a reset keeps it', () => {
    expect(profileFrom({})!.ageGroup).toBeNull();
    expect(profileFrom({ ageGroup: 'adult' })!.ageGroup).toBeNull();
    const kid = profileFrom({ campaign: CAMPAIGN, ageGroup: 'child' })!;
    const grown = profileFrom({ campaign: CAMPAIGN, ageGroup: 'general' })!;
    expect(mergeProfiles(kid, grown).ageGroup).toBe('child');
    expect(mergeProfiles(grown, profileFrom({})!).ageGroup).toBe('general');
    s().setAgeGroup('child');
    s().resetProgress();
    expect(s().profile.ageGroup).toBe('child');
    s().setAgeGroup(null);
    expect(s().profile.ageGroup).toBeNull();
  });

  it('reads a damaged save without crashing, and cleans the rocket name', () => {
    expect(profileFrom(null)).toBeNull();
    expect(profileFrom({ wallet: 'x' })!.wallet).toBe(0);
    expect(profileFrom({ design: { name: 'héllo wörld rocket 1234' } })!.design.name).toBe('HLLO WRLD RO');
  });
});
