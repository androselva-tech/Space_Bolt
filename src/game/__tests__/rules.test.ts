import {
  CEIL, EVENT_CALM, EVENT_FIRST, EVENT_INFO, FLOOR, HAZARD_SIZE, MOON_DISTANCE_KM, PICKUP_R, RESCUE_CLEAR, RINGS, RING_HALF, ROCKET_R, STAGE_COUNT, WORLDS,
  buildCourse, hasFlight, journeyLength, kmToGo, minGapSec, moonField, stageEvents, stageHazards, stageInfo, starsFor, walkParts,
  type EventKind,
} from '../rules';
import { SHUTTLE_ORDER } from '../../rocket/model';

const ALL = Array.from({ length: STAGE_COUNT }, (_, i) => stageInfo(i + 1));
const FLIGHTS = ALL.filter((s) => hasFlight(s.leg));

describe('the campaign', () => {
  it('is two worlds: 20 stages out to the Moon, 7 back home', () => {
    expect(STAGE_COUNT).toBe(27);
    expect(WORLDS.map((w) => w.stages)).toEqual([[1, 20], [21, 27]]);
    expect(ALL.filter((s) => s.kind === 'boss').map((s) => s.n)).toEqual([10, 20, 25, 27]);
    expect(ALL.filter((s) => s.kind === 'bonus').map((s) => s.n)).toEqual([5, 15]);
  });

  it('tells the story in order: launch, the trip, the Moon, the walks, home via the station, the sea', () => {
    expect(stageInfo(1).leg).toBe('earthLaunch');
    expect(stageInfo(20).leg).toBe('moonLanding');
    expect(ALL.filter((s) => s.world === 'homebound').map((s) => s.leg)).toEqual(['moonwalk', 'moonwalk', 'moonLaunch', 'transfer', 'dock', 'repair', 'reentry']);
    for (const leg of ['cruise', 'fault', 'storm'] as const) {
      expect(ALL.filter((s) => s.world === 'outbound' && s.leg === leg).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('gets harder: tiers and speed never go down within a world', () => {
    for (let n = 2; n <= STAGE_COUNT; n++) {
      const a = stageInfo(n - 1), b = stageInfo(n);
      if (a.world !== b.world) continue;
      expect(b.tier).toBeGreaterThanOrEqual(a.tier);
      expect(b.speed).toBeGreaterThan(a.speed);
    }
  });

  it('introduces each hazard once, as new', () => {
    const seen = new Set<string>();
    for (const s of ALL) {
      const { pool, fresh } = stageHazards(s);
      for (const h of fresh) expect(seen.has(h)).toBe(false);
      pool.forEach((h) => seen.add(h));
    }
    expect(seen.size).toBe(Object.keys(HAZARD_SIZE).length);
  });

  it('counts the kilometres down to the Moon, then home to Earth', () => {
    expect(kmToGo(stageInfo(1), 0.5)).toBeNull();
    expect(kmToGo(stageInfo(2), 0)).toBe(MOON_DISTANCE_KM);
    expect(kmToGo(stageInfo(20), 1)).toBe(0);
    // home: the hop to the station (in high Earth orbit) covers nearly all of it
    expect(kmToGo(stageInfo(24), 0)).toBe(MOON_DISTANCE_KM);
    expect(kmToGo(stageInfo(24), 1)).toBeLessThan(MOON_DISTANCE_KM * 0.1);
    expect(kmToGo(stageInfo(25), 0)).toBeNull();
    for (let n = 3; n <= 20; n++) expect(kmToGo(stageInfo(n), 0)).toBe(kmToGo(stageInfo(n - 1), 1));
  });
});

describe('every course of every flight', () => {
  for (const s of FLIGHTS) {
    it(`stage ${s.n} (${s.leg}) is fair`, () => {
      const c = buildCourse(s, 0);
      expect(c.length).toBe(journeyLength(s));
      expect(c.hazards.length).toBeGreaterThan(2);
      // in bounds, and nothing in the calm start or right in front of the end
      for (const h of c.hazards) {
        expect(h.x).toBeGreaterThanOrEqual(700);
        expect(h.x).toBeLessThan(c.length - 300);
        if (h.type !== 'comet') {
          expect(h.y).toBeGreaterThanOrEqual(FLOOR - 1);
          expect(h.y).toBeLessThanOrEqual(CEIL + 1);
        }
      }
      // hazards at different distances are far enough apart to steer between
      const xs = [...new Set(c.hazards.map((h) => h.x))].sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect((xs[i] - xs[i - 1]) / s.speed).toBeGreaterThanOrEqual(minGapSec(s) * 0.99);
      // stacked hazards (pairs, storm walls) always leave an opening the rocket fits through
      const byX = new Map<number, typeof c.hazards>();
      for (const h of c.hazards) byX.set(h.x, [...(byX.get(h.x) ?? []), h]);
      for (const group of byX.values()) {
        if (group.length < 2) continue;
        const sorted = [...group].sort((p, q) => q.y - p.y);
        // the way through may be between two of them, or between the outermost one and the edge
        const top = sorted[0], bottom = sorted[sorted.length - 1];
        let widest = Math.max(CEIL - (top.y + HAZARD_SIZE[top.type].r), (bottom.y - HAZARD_SIZE[bottom.type].r) - FLOOR);
        for (let i = 1; i < sorted.length; i++) {
          const a = sorted[i - 1], b = sorted[i];
          widest = Math.max(widest, (a.y - HAZARD_SIZE[a.type].r) - (b.y + HAZARD_SIZE[b.type].r));
        }
        expect(widest).toBeGreaterThan(ROCKET_R * 3);
      }
      // nothing right at a stop for questions, so the flight resumes calmly
      for (const e of c.events.filter((ev) => EVENT_INFO[ev.kind].blocking)) for (const h of c.hazards) expect(Math.abs(h.x - e.x)).toBeGreaterThanOrEqual(EVENT_CALM - 1);
      // the stops come in order, inside the course, each zone after its stop and none overlapping
      const xs2 = c.events.map((e) => e.x);
      expect([...xs2].sort((a, b) => a - b)).toEqual(xs2);
      for (const e of c.events) { expect(e.x).toBeGreaterThan(1000); expect(e.x).toBeLessThan(c.length - 400); }
      const zs = [...c.zones].sort((a, b) => a.x0 - b.x0);
      for (let i = 1; i < zs.length; i++) expect(zs[i].x0).toBeGreaterThanOrEqual(zs[i - 1].x1);
      for (const z of zs) expect(z.x1).toBeLessThanOrEqual(c.length);
      // beacon rings: none near a hazard, all inside the flight lane
      for (const ring of c.rings) {
        expect(Math.abs(ring.y) + RING_HALF).toBeLessThanOrEqual(CEIL);
        for (const h of c.hazards) expect(Math.abs(h.x - ring.x)).toBeGreaterThan(200);
      }
      // fuel canisters and the astronaut are clear of hazards
      for (const can of c.canisters) for (const h of c.hazards) if (h.type !== 'comet') expect(Math.hypot(can.x - h.x, can.y - h.y)).toBeGreaterThan(110);
      if (c.rescue) for (const h of c.hazards) expect(Math.abs(h.x - c.rescue.x)).toBeGreaterThanOrEqual(RESCUE_CLEAR - 1);
      // coins stay clear of hazards
      for (const coin of c.coins) for (const h of c.hazards) if (h.type !== 'comet') expect(Math.hypot(coin.x - h.x, coin.y - h.y)).toBeGreaterThan(100);
    });
  }

  it('every leg brings its own show stoppers, and each one sets up what follows it', () => {
    expect(buildCourse(stageInfo(1), 0).events).toEqual([]);
    expect(stageEvents(stageInfo(4)).filter((e) => e.kind === 'fault')).toHaveLength(2);
    expect(stageEvents(stageInfo(6)).map((e) => e.kind)).toContain('storm');
    expect(stageEvents(stageInfo(20))).toEqual([{ kind: 'collision' }, { kind: 'fault', fault: 'radar' }]);
    // the hop to the station: exactly five questions, one per course burn
    expect(stageEvents(stageInfo(24)).map((e) => e.kind)).toEqual(['burn', 'burn', 'burn', 'burn', 'burn']);
    expect(buildCourse(stageInfo(24), 0).events).toHaveLength(5);
    const storm = buildCourse(stageInfo(6), 0);
    const st = storm.events.find((e) => e.kind === 'storm')!;
    expect(storm.storm!.x0).toBeGreaterThan(st.x);
    expect(storm.hazards.filter((h) => h.x > storm.storm!.x0 && h.x < storm.storm!.x1 && h.type === 'boulder').length).toBeGreaterThan(3);
    for (const s of FLIGHTS) {
      const c = buildCourse(s, 0);
      for (const e of c.events) {
        if (e.kind === 'navigation') expect(c.rings.length).toBe(RINGS);
        if (e.kind === 'fuelLeak') expect(c.canisters.length).toBeGreaterThanOrEqual(4);
        if (e.kind === 'rescue') expect(c.rescue!.x).toBeGreaterThan(e.x);
        if (e.kind === 'debris') expect(c.hazards.filter((h) => h.type === 'debris' || h.type === 'panel').length).toBeGreaterThan(3);
        if (e.kind === 'collision' || e.kind === 'flare') expect(e.timed).toBeGreaterThan(0);
      }
    }
  });

  it('brings in each new show stopper on its first stage, and varies the mix from stage to stage', () => {
    for (const [kind, n] of Object.entries(EVENT_FIRST) as Array<[EventKind, number]>) {
      expect(stageEvents(stageInfo(n)).map((e) => e.kind)).toContain(kind);
      for (let m = 1; m < n; m++) expect(stageEvents(stageInfo(m)).map((e) => e.kind)).not.toContain(kind);
    }
    // the long cruise legs never repeat the stage before's exact mix
    const cruises = ALL.filter((s) => s.leg === 'cruise' && s.n > 9);
    for (const s of cruises) {
      const mix = stageEvents(s).map((e) => e.kind).sort().join();
      expect(mix).not.toBe(stageEvents(stageInfo(s.n - 1)).map((e) => e.kind).sort().join());
      expect(new Set(stageEvents(s).map((e) => e.kind)).size).toBe(3);
    }
    // every kind turns up again and again over the trip
    const count: Record<string, number> = {};
    for (const s of ALL) for (const e of stageEvents(s)) count[e.kind] = (count[e.kind] ?? 0) + 1;
    for (const kind of Object.keys(EVENT_INFO)) expect(count[kind]).toBeGreaterThanOrEqual(3);
  });

  it('the long legs get longer through each world', () => {
    for (const world of ['outbound', 'homebound']) {
      const cruises = ALL.filter((s) => s.world === world && s.leg === 'cruise');
      for (let i = 1; i < cruises.length; i++) expect(journeyLength(cruises[i])).toBeGreaterThan(journeyLength(cruises[i - 1]));
    }
  });

  it('builds the same course every time (seeded)', () => {
    expect(buildCourse(stageInfo(13), 0)).toEqual(buildCourse(stageInfo(13), 0));
  });
});

describe('the Moon walks', () => {
  it('scatter the Lunar Shuttle\'s lower half on the first walk and its upper half on the second', () => {
    expect([...walkParts(stageInfo(21)), ...walkParts(stageInfo(22))]).toEqual(SHUTTLE_ORDER);
  });

  for (const n of [21, 22]) {
    it(`stage ${n}: every part can be reached, away from the base and the boulders`, () => {
      const f = moonField(stageInfo(n));
      expect(f.parts.map((p) => p.part)).toEqual(walkParts(stageInfo(n)));
      for (const p of f.parts) {
        expect(Math.hypot(p.x, p.y)).toBeGreaterThan(400);
        expect(Math.hypot(p.x, p.y)).toBeLessThan(f.radius - 200);
        for (const b of f.boulders) expect(Math.hypot(p.x - b.x, p.y - b.y)).toBeGreaterThan(b.r + PICKUP_R);
      }
      for (const b of f.boulders) expect(Math.hypot(b.x, b.y)).toBeGreaterThan(300);
      expect(moonField(stageInfo(n))).toEqual(f);
    });
  }
});

describe('stars', () => {
  it('gives 3 for accurate answers and a clean flight', () => {
    expect(starsFor({ right: 10, wrong: 1, hints: 0, hits: 0 })).toBe(3);
    expect(starsFor({ right: 10, wrong: 1, hints: 0, hits: 1 })).toBe(2);
    expect(starsFor({ right: 3, wrong: 7, hints: 0, hits: 0 })).toBe(1);
  });
});
