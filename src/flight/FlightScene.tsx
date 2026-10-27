import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { Sprite } from '../scene/Sprite';
import { ROCK_TEXTURES, TEXTURES, hazardTexture } from '../assets';
import { gameStore, useGame } from '../game/store';
import {
  CEIL, FLOOR, HAZARD_SIZE, RING_HALF, ROCKET_R, VIEW_H, hazardPos, journeySpan, rng, steerSpeed, touches,
  type Course, type CourseHazard, type StageInfo,
} from '../game/rules';
import { Station } from '../station/StationArt';
import { RocketMesh, UPPER_STAGE } from '../rocket/RocketMesh';
import { SHUTTLE_ASCENT } from '../rocket/model';
import { vehicleFor } from '../game/rules';
import { setMotionSound } from '../audio/sfx';

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;

/** World units always visible left-to-right in the flight area (so there's time to see what's coming). */
const MIN_VIEW_WIDTH = 900;
export const viewZoom = (width: number, height: number) => Math.min(height / VIEW_H, width / MIN_VIEW_WIDTH);
/** Where the rocket sits in the flight area (fractions across): to the left while flying, centred while building. */
const FLY_ANCHOR = 0.22;
const BUILD_ANCHOR = 0.5;
/** Building: the camera moves in on the rocket so each new part is easy to see. */
const BUILD_ZOOM = 1.55;
/** How far ahead a hazard "wakes up" (starts moving), in world units. */
const WAKE_AHEAD = 560;
/** Seconds the rocket can't be hit again after a hit. */
const INVULNERABLE = 1.4;

/** Where the flight area sits in the canvas (fractions); the question panel floats over the rest. */
export type StageRect = { x: number; y: number; w: number; h: number };

/** Shared with the steering pad: the rocket's height right now (world units). */
export const flight = { y: 0, zoom: 1 };

/** The flight's moment-to-moment state, kept out of React (it changes every frame). */
type Runtime = {
  y: number;
  vy: number;
  t: number;
  invulnerable: number;
  /** Time each hazard woke up (came close), and hazards that already hit. */
  woke: Map<number, number>;
  struck: Set<number>;
  coins: Set<number>;
  boomAt: number;
  boomX: number;
  boomY: number;
  boomBlocked: boolean;
  zoomMix: number;
};
const freshRuntime = (): Runtime => ({
  y: 0, vy: 0, t: 0, invulnerable: 0, woke: new Map(), struck: new Set(), coins: new Set(),
  boomAt: -10, boomX: 0, boomY: 0, boomBlocked: false, zoomMix: 1,
});

export function FlightScene({ onReady, stage }: { onReady: () => void; stage: StageRect }) {
  return (
    <Suspense fallback={null}>
      <World onReady={onReady} stage={stage} />
    </Suspense>
  );
}

function World({ onReady, stage }: { onReady: () => void; stage: StageRect }) {
  const tex = useTextures(TEXTURES) as Tex;
  const course = useGame((s) => s.course);
  const stageInfo = useGame((s) => s.stage);
  useEffect(onReady, [onReady]);
  const rt = useRef<Runtime>(freshRuntime());
  // a new course (new round or stage): the rocket starts level in the middle
  useEffect(() => {
    rt.current = freshRuntime();
    flight.y = 0;
  }, [course]);
  // dev builds: the flight's state, for automated play-testing
  useEffect(() => {
    if (__DEV__) (globalThis as { __flight?: unknown }).__flight = rt;
  }, []);
  if (!course || !stageInfo) return null;
  return (
    <>
      <CameraRig rt={rt} stage={stage} />
      <Backdrop tex={tex} info={stageInfo} course={course} />
      <Stars />
      <RockField tex={tex} layer={0} />
      <RockField tex={tex} layer={1} />
      {stageInfo.leg === 'transfer' ? (
        <group position={[course.length + 260, 0, -12]} scale={[0.32, 0.32, 1]}><Station /></group>
      ) : stageInfo.leg !== 'moonLanding' ? <Gate tex={tex} course={course} /> : null}
      <Coins tex={tex} course={course} rt={rt} />
      <Rings tex={tex} course={course} rt={rt} />
      <Canisters tex={tex} course={course} rt={rt} />
      <Rescue tex={tex} course={course} rt={rt} />
      <Hazards tex={tex} course={course} rt={rt} />
      <CollisionRock tex={tex} rt={rt} />
      <Rocket tex={tex} rt={rt} />
      <Boom tex={tex} rt={rt} />
      <RockField tex={tex} layer={2} />
      <Flare tex={tex} />
      <Pilot rt={rt} />
    </>
  );
}

/** Follows the rocket: wide while flying, in close while building. */
function CameraRig({ rt, stage }: { rt: React.RefObject<Runtime>; stage: StageRect }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const first = useRef(true);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = gameStore.getState();
    const building = false; // the flight scene is only on screen for the journey
    const r = rt.current;
    // 1 = flying framing, 0 = building close-up
    r.zoomMix += ((building ? 0 : 1) - r.zoomMix) * (first.current ? 1 : 1 - Math.exp(-dt * 3));
    const base = viewZoom(size.width * stage.w, size.height * stage.h);
    camera.zoom = base * (BUILD_ZOOM + (1 - BUILD_ZOOM) * r.zoomMix);
    camera.updateProjectionMatrix();
    flight.zoom = camera.zoom;
    const viewW = size.width / camera.zoom;
    const viewH = size.height / camera.zoom;
    const anchor = BUILD_ANCHOR + (FLY_ANCHOR - BUILD_ANCHOR) * r.zoomMix;
    const fx = stage.x + stage.w * anchor;
    const fy = stage.y + stage.h * 0.5;
    const x = s.distance;
    // flying: world height 0 in the middle of the flight area; building: the rocket itself
    const focusY = r.y * (1 - r.zoomMix);
    camera.position.x = x + viewW * (0.5 - fx);
    camera.position.y = focusY + viewH * (fy - 0.5);
    camera.position.z = 100;
    first.current = false;
  });
  return null;
}

const SKY_TINT = { calm: new THREE.Color('#ffffff'), storm: new THREE.Color('#ffb08a') };

/**
 * Where we are on the trip: 0 at Earth, 1 at the Moon. The orbit flights stay by their world; the
 * long legs move from one to the other as the stage's flight goes on.
 */
function tripAt(info: StageInfo, progress: number) {
  const span = journeySpan(info);
  if (!span) return info.world === 'outbound' ? 0 : 1;
  const done = span.from + (span.to - span.from) * progress;
  return span.target === 'MOON' ? done : 1 - done;
}

/**
 * The deep sky: a nebula band across the stars (glowing red inside an asteroid storm), drifting a
 * little as the flight goes on. Near Earth its curved edge glows along the bottom, near the Moon
 * the Moon's; in between, Earth shrinks behind and the Moon grows ahead (the other way home).
 */
function Backdrop({ tex, info, course }: { tex: Tex; info: StageInfo; course: Course }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const sky = useRef<THREE.Mesh>(null);
  const earth = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const limbE = useRef<THREE.Mesh>(null);
  const limbM = useRef<THREE.Mesh>(null);
  const storm = useRef(0);
  useFrame((_, dt) => {
    const s = gameStore.getState();
    const cx = camera.position.x, cy = camera.position.y;
    const viewW = size.width / camera.zoom, viewH = size.height / camera.zoom;
    // inside the storm the sky glows red
    const inStorm = course.storm && s.distance > course.storm.x0 - 300 && s.distance < course.storm.x1 ? 1 : 0;
    storm.current += (inStorm - storm.current) * Math.min(1, dt * 2);
    if (sky.current) {
      // the nebula covers the view with room to drift a little over the whole flight
      const w = Math.max(viewW * 1.35, viewH * 2.7);
      sky.current.scale.set(w / 2400, w / 2400, 1);
      sky.current.position.set(cx + (0.5 - s.progress) * (w - viewW) * 0.8, cy, -95);
      (sky.current.material as THREE.MeshBasicMaterial).color.copy(SKY_TINT.calm).lerp(SKY_TINT.storm, storm.current);
    }
    // the trip: Earth falls behind, the Moon comes closer (or the other way on the way home)
    const k = tripAt(info, s.progress);
    if (earth.current) {
      const e = 230 * Math.pow(0.12, k);
      earth.current.scale.setScalar(e / 240);
      earth.current.position.set(cx - viewW * 0.24, cy - viewH * 0.3, -91);
      earth.current.visible = k > 0.18 && e > 24;
    }
    if (moon.current) {
      const m = 360 * Math.pow(0.1, 1 - k);
      moon.current.scale.setScalar(m / 240);
      moon.current.position.set(cx + viewW * 0.36, cy + viewH * 0.3 - m * 0.15, -90);
      moon.current.visible = k < 0.82 && m > 18;
    }
    // planet edges along the bottom: Earth's sinks away as we leave it, the Moon's rises as we arrive
    const limb = (m: THREE.Mesh | null, show: number) => {
      if (!m) return;
      m.visible = show > 0.01;
      const w = viewW * 1.3;
      m.scale.set(w / 2400, w / 2400, 1);
      m.position.set(cx, cy - viewH / 2 + (w / 2400) * 350 * show - (w / 2400) * 120, -89);
    };
    limb(limbE.current, Math.max(0, 1 - k / 0.22));
    limb(limbM.current, Math.max(0, (k - 0.82) / 0.18));
  });
  return (
    <>
      <Sprite ref={sky} texture={tex.spaceNebula} width={2400} height={1200} />
      <Sprite ref={earth} texture={tex.earth} width={240} height={240} opacity={0.9} />
      <Sprite ref={moon} texture={tex.moon} width={240} height={240} opacity={0.9} />
      <Sprite ref={limbE} texture={tex.limbEarth} width={2400} height={700} />
      <Sprite ref={limbM} texture={tex.limbMoon} width={2400} height={700} />
    </>
  );
}

/**
 * Asteroids drifting past at different depths, for the feel of flying through a rocky field: far
 * (small, dim, slow), middle, and a few big near ones sliding past the top and bottom edges in
 * front of everything. Scenery only: they never hit the rocket.
 */
const FIELD_W = 3200;
const FIELD: Array<{ n: number; size: [number, number]; speed: number; tint: string; opacity: number; z: number; near: boolean }> = [
  { n: 18, size: [18, 46], speed: 0.12, tint: '#7d7f90', opacity: 0.75, z: -80, near: false },
  { n: 9, size: [50, 100], speed: 0.38, tint: '#a6a2a8', opacity: 0.95, z: -60, near: false },
  { n: 4, size: [240, 380], speed: 1.45, tint: '#5f5a5a', opacity: 1, z: 30, near: true },
];
function RockField({ tex, layer }: { tex: Tex; layer: number }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const L = FIELD[layer];
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const rocks = useMemo(() => {
    const r = rng(4100 + layer * 77);
    return Array.from({ length: L.n }, (_, i) => {
      const size = L.size[0] + r() * (L.size[1] - L.size[0]);
      // near rocks pass along the top and bottom edges, out of the flight lane
      const y = L.near ? (i % 2 ? 1 : -1) * (CEIL + 120 + r() * 120) : (r() - 0.5) * 1000;
      return { x: (i / L.n) * FIELD_W + r() * (FIELD_W / L.n), y, size, tex: ROCK_TEXTURES[Math.floor(r() * ROCK_TEXTURES.length)], spin: (r() - 0.5) * 0.4, a: r() * 6 };
    });
  }, [layer]);
  useEffect(() => {
    refs.current.forEach((m) => m && (m.material as THREE.MeshBasicMaterial).color.set(L.tint));
  }, [layer]);
  useFrame(() => {
    const cx = camera.position.x, cy = camera.position.y;
    const t = performance.now() / 1000;
    rocks.forEach((k, i) => {
      const m = refs.current[i];
      if (!m) return;
      const rel = ((((k.x - cx * L.speed) % FIELD_W) + FIELD_W) % FIELD_W) - FIELD_W / 2;
      m.position.set(cx + rel, (L.near ? 0 : cy * (1 - L.speed * 0.5)) + k.y, L.z + i * 0.01);
      m.rotation.z = k.a + t * k.spin;
    });
  });
  return (
    <>
      {rocks.map((k, i) => <Sprite key={i} ref={(m) => { refs.current[i] = m; }} texture={tex[k.tex]} width={k.size} height={k.size} opacity={L.opacity} />)}
    </>
  );
}

/** Two layers of little stars drifting past at different speeds. */
const STAR_TILE = 1600;
function Stars() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const layers = [useRef<THREE.Points>(null), useRef<THREE.Points>(null)];
  const geos = useMemo(() => [0, 1].map((L) => {
    // a seeded pattern, repeated over three tiles so the layer can slide seamlessly
    let a = 1234 + L * 777;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    const n = L === 0 ? 70 : 40;
    const pts: number[] = [];
    const tile = Array.from({ length: n }, () => [r() * STAR_TILE, (r() - 0.5) * 900]);
    for (let t = 0; t < 3; t++) for (const [x, y] of tile) pts.push(x + t * STAR_TILE, y, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }), []);
  useFrame(() => {
    const cx = camera.position.x, cy = camera.position.y;
    layers.forEach((ref, L) => {
      const p = ref.current;
      if (!p) return;
      const speed = L === 0 ? 0.15 : 0.4;
      const o = (((cx * speed) % STAR_TILE) + STAR_TILE) % STAR_TILE;
      p.position.set(cx - STAR_TILE - o, cy * (1 - speed * 0.5), -88 + L);
    });
  });
  return (
    <>
      {geos.map((g, L) => (
        <points key={L} ref={layers[L]} geometry={g}>
          <pointsMaterial color="#ffffff" size={L === 0 ? 1.6 : 2.6} sizeAttenuation={false} transparent opacity={L === 0 ? 0.5 : 0.8} depthWrite={false} />
        </points>
      ))}
    </>
  );
}

/** The checkpoint ring at the end of the course. */
function Gate({ tex, course }: { tex: Tex; course: Course }) {
  return <Sprite texture={tex.gate} width={190} height={(CEIL - FLOOR) + 120} position={[course.length + 40, 0, -10]} />;
}

function Coins({ tex, course, rt }: { tex: Tex; course: Course; rt: React.RefObject<Runtime> }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(() => {
    const s = gameStore.getState();
    const r = rt.current;
    const x = s.distance;
    course.coins.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const got = r.coins.has(c.id);
      m.visible = !got && c.x > x - 300 && c.x < x + 1600;
      if (!m.visible) return;
      m.scale.x = Math.max(0.15, Math.abs(Math.cos(r.t * 3 + c.id)));
      if (s.phase === 'fly' && s.status === 'playing' && !s.event && Math.abs(c.x - x) < 34 && Math.abs(c.y - r.y) < 46) {
        r.coins.add(c.id);
        s.pickCoin();
      }
    });
  });
  return (
    <>
      {course.coins.map((c, i) => (
        <Sprite key={c.id} ref={(m) => { refs.current[i] = m; }} texture={tex.coin} width={38} height={38} position={[c.x, c.y, -5]} />
      ))}
    </>
  );
}

/** How big each hazard is drawn (rocks a little bigger than they hit, so the edges look fair). */
const HAZARD_DRAW: Record<CourseHazard['type'], { w: number; h: number }> = {
  meteor: { w: 96, h: 96 },
  asteroid: { w: 158, h: 158 },
  boulder: { w: 215, h: 215 },
  comet: { w: 84, h: 84 },
  debris: { w: 130, h: 130 },
  panel: { w: 230, h: 72 },
};

/** Every hazard of the course; they wake up (start moving) as the rocket comes near, and hit on contact. */
function Hazards({ tex, course, rt }: { tex: Tex; course: Course; rt: React.RefObject<Runtime> }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(() => {
    const s = gameStore.getState();
    const r = rt.current;
    const x = s.distance;
    const flying = s.phase === 'fly' && s.status === 'playing' && !s.event && !s.paused;
    course.hazards.forEach((h, i) => {
      const m = refs.current[i];
      if (!m) return;
      if (!r.woke.has(h.id) && h.x - x < WAKE_AHEAD && flying) r.woke.set(h.id, r.t);
      const age = r.woke.has(h.id) ? r.t - r.woke.get(h.id)! : 0;
      const p = hazardPos(h, age, r.y);
      m.visible = p.x > x - 400 && p.x < x + 1700 && p.y > FLOOR - 300;
      if (!m.visible) return;
      m.position.set(p.x, p.y, -4);
      // rocks turn slowly, satellites tumble, panels rock a little (they hit as flat boxes)
      if (h.type === 'panel') m.rotation.z = Math.sin(r.t * 0.9 + h.id) * 0.12;
      else m.rotation.z = h.id + r.t * (h.type === 'debris' ? 0.6 : h.type === 'comet' ? 2 : 0.25) * (h.id % 2 ? 1 : -1);
      if (flying && r.invulnerable <= 0 && !r.struck.has(h.id) && touches(h.type, p.x, p.y, x, r.y)) {
        r.struck.add(h.id);
        r.invulnerable = INVULNERABLE;
        const blocked = s.rocket.shield > 0;
        r.boomAt = r.t; r.boomX = x + (blocked ? 30 : 0); r.boomY = r.y; r.boomBlocked = blocked;
        s.hazardHit();
      }
    });
  });
  return (
    <>
      {course.hazards.map((h, i) => {
        const d = HAZARD_DRAW[h.type];
        return <Sprite key={h.id} ref={(m) => { refs.current[i] = m; }} texture={tex[hazardTexture(h.type, h.id)]} width={d.w} height={d.h} position={[h.x, h.y, -4]} />;
      })}
    </>
  );
}

const flyingNow = () => {
  const s = gameStore.getState();
  return s.phase === 'fly' && s.status === 'playing' && !s.event && !s.paused;
};

/** Navigation beacons: fly through each ring (it lights green) or miss it (red, and it costs fuel). */
function Rings({ tex, course, rt }: { tex: Tex; course: Course; rt: React.RefObject<Runtime> }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const green = useMemo(() => new THREE.Color('#8ee07c'), []);
  const red = useMemo(() => new THREE.Color('#ff6a5a'), []);
  useFrame(() => {
    const s = gameStore.getState();
    const x = s.distance;
    course.rings.forEach((ring, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.visible = ring.x > x - 400 && ring.x < x + 1700;
      const judged = s.pickups.rings[ring.id];
      const mat = m.material as THREE.MeshBasicMaterial;
      if (judged !== undefined) mat.color.copy(judged ? green : red);
      m.scale.setScalar(1 + (judged === undefined ? Math.sin(rt.current.t * 4 + i) * 0.04 : 0));
      if (judged === undefined && flyingNow() && x >= ring.x) s.passRing(ring.id, Math.abs(rt.current.y - ring.y) < RING_HALF);
    });
  });
  return <>{course.rings.map((ring, i) => <Sprite key={ring.id} ref={(m) => { refs.current[i] = m; }} texture={tex.navRing} width={64} height={RING_HALF * 2 + 50} position={[ring.x, ring.y, -3]} />)}</>;
}

/** Fuel canisters after a fuel leak: fly into them. */
function Canisters({ tex, course, rt }: { tex: Tex; course: Course; rt: React.RefObject<Runtime> }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(() => {
    const s = gameStore.getState();
    const x = s.distance;
    course.canisters.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const got = s.pickups.canisters.includes(c.id);
      m.visible = !got && c.x > x - 300 && c.x < x + 1700;
      if (!m.visible) return;
      const bob = Math.sin(rt.current.t * 2 + i) * 8;
      m.position.set(c.x, c.y + bob, -3);
      m.rotation.z = Math.sin(rt.current.t * 1.3 + i) * 0.3;
      if (flyingNow() && Math.abs(c.x - x) < 44 && Math.abs(c.y + bob - rt.current.y) < 54) s.catchCanister(c.id);
    });
  });
  return <>{course.canisters.map((c, i) => <Sprite key={c.id} ref={(m) => { refs.current[i] = m; }} texture={tex.fuelCanister} width={78} height={78} position={[c.x, c.y, -3]} />)}</>;
}

/** Mayday: an astronaut tumbling in space, a beacon blinking; fly into them to bring them aboard. */
function Rescue({ tex, course, rt }: { tex: Tex; course: Course; rt: React.RefObject<Runtime> }) {
  const astro = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = gameStore.getState();
    const p = course.rescue;
    const m = astro.current;
    if (!p || !m) return;
    const t = rt.current.t;
    const gone = s.pickups.rescued;
    m.visible = !gone && p.x > s.distance - 300 && p.x < s.distance + 1700;
    const y = p.y + Math.sin(t * 0.8) * 20;
    m.position.set(p.x, y, -2);
    m.rotation.z = t * 0.7;
    if (beacon.current) {
      beacon.current.visible = m.visible && Math.floor(t * 3) % 2 === 0;
      beacon.current.position.set(p.x, y, -2.5);
    }
    if (!gone && flyingNow() && Math.abs(p.x - s.distance) < 50 && Math.abs(y - rt.current.y) < 60) s.reachRescue();
  });
  if (!course.rescue) return null;
  return (
    <>
      <Sprite ref={beacon} texture={tex.glow} width={150} height={150} opacity={0.8} />
      <Sprite ref={astro} texture={tex.astronaut} width={64} height={72} />
    </>
  );
}

/**
 * Collision course: while the question is up, a huge asteroid grows ahead as the clock runs down;
 * then it sweeps past (thrusters fired) or into the rocket.
 */
function CollisionRock({ tex, rt }: { tex: Tex; rt: React.RefObject<Runtime> }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = gameStore.getState();
    const rock = m.current;
    if (!rock) return;
    const e = s.event;
    const now = s.paused ? s.pausedAt : Date.now();
    const fx = s.eventFx.kind === 'collision' ? s.eventFx : null;
    const since = fx ? (now - fx.at) / 1000 : 99;
    if (e?.kind === 'collision') {
      const left = e.deadline ? Math.max(0, (e.deadline - now) / ((e.timed ?? 15) * 1000)) : 1;
      const k = 1 - left;
      rock.visible = true;
      rock.position.set(s.distance + 720 - k * 420, rt.current.y, 12);
      rock.scale.setScalar(0.55 + k * 0.8);
    } else if (fx && since < 1.6) {
      // dodged: it tumbles past below; hit: it bursts against the rocket
      rock.visible = fx.ok || since < 0.2;
      rock.position.set(s.distance + 300 - since * 700, rt.current.y - (fx.ok ? since * 320 : 0), 12);
    } else rock.visible = false;
    rock.rotation.z = rt.current.t * 0.4;
  });
  return <Sprite ref={m} texture={tex.rock2} width={360} height={360} visible={false} />;
}

/** A solar flare: the Sun blazes up in the corner and the view turns orange as the clock runs down. */
function Flare({ tex }: { tex: Tex }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const sun = useRef<THREE.Mesh>(null);
  const wash = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = gameStore.getState();
    const e = s.event;
    const now = s.paused ? s.pausedAt : Date.now();
    const fx = s.eventFx.kind === 'flare' ? s.eventFx : null;
    const since = fx ? (now - fx.at) / 1000 : 99;
    const viewW = size.width / camera.zoom, viewH = size.height / camera.zoom;
    let glow = 0, flash = 0;
    if (e?.kind === 'flare') glow = e.deadline ? 1 - Math.max(0, (e.deadline - now) / ((e.timed ?? 30) * 1000)) : 0.2;
    else if (since < 2.5) { glow = 1 - since / 2.5; flash = since < 0.6 ? (1 - since / 0.6) * (fx!.ok ? 0.5 : 0.85) : 0; }
    if (sun.current) {
      sun.current.visible = glow > 0.01;
      sun.current.position.set(camera.position.x + viewW * 0.18, camera.position.y + viewH * 0.32, 40);
      sun.current.scale.setScalar(0.4 + glow * 0.9);
      (sun.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, 0.4 + glow);
    }
    if (wash.current) {
      wash.current.visible = glow > 0.01 || flash > 0;
      wash.current.position.set(camera.position.x, camera.position.y, 41);
      wash.current.scale.set(viewW + 40, viewH + 40, 1);
      const mat = wash.current.material as THREE.MeshBasicMaterial;
      mat.color.set(flash > 0 ? '#ffffff' : '#ff8a2a');
      mat.opacity = Math.max(glow * 0.28, flash);
    }
  });
  return (
    <>
      <mesh ref={wash} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff8a2a" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <Sprite ref={sun} texture={tex.sunFlare} width={700} height={700} visible={false} />
    </>
  );
}

/** The upper stage flies the journey, lying on its side (nose to the right), at this scale. */
const RF = 0.36;
/** Each craft in flight: its parts, the middle it turns about, and where its engine nozzle is (craft coordinates). */
const CRAFT = {
  rocket: { parts: UPPER_STAGE, center: 640, nozzle: 340, scale: RF },
  shuttle: { parts: SHUTTLE_ASCENT, center: 340, nozzle: 126, scale: 0.15 },
};

/**
 * The upper stage the player built and painted. Steering eases it towards the height the player
 * drags to; its engine level (from the build) sets how fast it can climb or dive.
 */
function Rocket({ tex, rt }: { tex: Tex; rt: React.RefObject<Runtime> }) {
  const group = useRef<THREE.Group>(null);
  const shield = useRef<THREE.Mesh>(null);
  const flame = useRef<THREE.Mesh>(null);
  const design = useGame((s) => s.design);
  const craft = CRAFT[useGame((s) => (s.stage ? vehicleFor(s.stage) : 'rocket'))];

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = gameStore.getState();
    const r = rt.current;
    if (s.paused) { setMotionSound(null); return; }
    r.t += dt;
    r.invulnerable = Math.max(0, r.invulnerable - dt);
    const flying = s.phase === 'fly' && s.status === 'playing' && !s.event;
    if (flying) {
      const auto = (globalThis as { __autopilotY?: number | null }).__autopilotY;
      const target = s.steerY ?? (s.steerDir ? r.y + s.steerDir * 400 : auto ?? r.y);
      const vmax = steerSpeed(s.rocket.engine);
      const want = Math.max(-vmax, Math.min(vmax, (target - r.y) * 7));
      r.vy += (want - r.vy) * (1 - Math.exp(-dt * 10));
      r.y = Math.max(FLOOR, Math.min(CEIL, r.y + r.vy * dt));
      s.flew(s.stage!.speed * dt);
    } else {
      r.vy *= 0.9;
    }
    flight.y = r.y;
    setMotionSound(flying ? 'jet' : null);
    const g = group.current;
    if (g) {
      g.position.set(s.distance, r.y, 0);
      g.rotation.z = Math.max(-0.3, Math.min(0.3, r.vy / 900));
      g.visible = r.invulnerable <= 0 || Math.floor(r.invulnerable * 12) % 2 === 0;
    }
    if (shield.current) {
      shield.current.visible = s.rocket.shield > 0;
      (shield.current.material as THREE.MeshBasicMaterial).opacity = (0.55 + Math.min(3, s.rocket.shield) * 0.15) * (0.9 + Math.sin(r.t * 4) * 0.1);
    }
    if (flame.current) {
      const flick = 0.85 + Math.sin(r.t * 31) * 0.1 + Math.sin(r.t * 17) * 0.05;
      flame.current.scale.set(1, (flying ? 1 + Math.min(6, s.rocket.engine) * 0.22 : 0.5) * flick, 1);
    }
  });

  return (
    <group ref={group}>
      <group rotation={[0, 0, -Math.PI / 2]}>
        <group position={[0, -craft.center * craft.scale, 0]}>
          <group scale={[craft.scale, craft.scale, 1]}>
            <RocketMesh design={design} parts={craft.parts} />
          </group>
          <Sprite ref={flame} texture={tex.flame} width={22} height={70} anchor={[0.5, 0.03]} position={[0, craft.nozzle * craft.scale + 2, -0.5]} />
        </group>
      </group>
      <Sprite ref={shield} texture={tex.shield} width={290} height={150} position={[0, 0, 6]} />
    </group>
  );
}

/** A burst where something hit the rocket (blue when a shield took it). */
function Boom({ tex, rt }: { tex: Tex; rt: React.RefObject<Runtime> }) {
  const m = useRef<THREE.Mesh>(null);
  const blue = useMemo(() => new THREE.Color('#9fe6ff'), []);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  useFrame(() => {
    const r = rt.current;
    const age = r.t - r.boomAt;
    if (!m.current) return;
    m.current.visible = age < 0.5;
    if (!m.current.visible) return;
    m.current.position.set(r.boomX, r.boomY, 8);
    m.current.scale.setScalar(0.6 + age * 1.6);
    const mat = m.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 1 - age / 0.5;
    mat.color = r.boomBlocked ? blue : white;
  });
  return <Sprite ref={m} texture={tex.boom} width={150} height={150} />;
}

/**
 * Dev and test builds only: `globalThis.__autopilot = true` flies the rocket by itself, picking the
 * height with the most room around the hazards just ahead (used by the e2e playthrough and demos).
 */
function Pilot({ rt }: { rt: React.RefObject<Runtime> }) {
  useFrame(() => {
    const g = globalThis as { __autopilot?: boolean; __autopilotY?: number | null };
    if (!__DEV__ || !g.__autopilot) {
      if (g.__autopilotY !== undefined) g.__autopilotY = null;
      return;
    }
    const s = gameStore.getState();
    if (!s.course || s.phase !== 'fly' || s.event) return;
    const r = rt.current;
    const x = s.distance;
    const speed = s.stage!.speed;
    let best = r.y, bestCost = Infinity;
    for (let y = FLOOR + 10; y <= CEIL - 10; y += 15) {
      let cost = Math.abs(y - r.y) * 0.02;
      for (const h of s.course.hazards) {
        const ahead = h.x - x;
        if (ahead < -80 || ahead > 700) continue;
        const lead = Math.max(0, ahead / speed);
        const woke = r.woke.get(h.id);
        const age = (woke === undefined ? 0 : r.t - woke) + lead;
        const p = hazardPos(h, age, y);
        const size = HAZARD_SIZE[h.type];
        const reach = (size.hh ?? size.r) + ROCKET_R + 30;
        const dy = Math.abs(p.y - y);
        if (dy < reach) cost += (reach - dy) * (ahead < 250 ? 8 : 3);
      }
      // head for the next beacon ring, fuel canister or the astronaut
      const goal = [
        ...s.course.rings.filter((g) => !(g.id in s.pickups.rings)),
        ...s.course.canisters.filter((c) => !s.pickups.canisters.includes(c.id)),
        ...(s.course.rescue && !s.pickups.rescued ? [s.course.rescue] : []),
      ].filter((g) => g.x - x > -20 && g.x - x < 650).sort((a, b) => a.x - b.x)[0];
      if (goal) cost += Math.abs(y - goal.y) * 0.4;
      if (cost < bestCost) { bestCost = cost; best = y; }
    }
    g.__autopilotY = best;
  });
  return null;
}
