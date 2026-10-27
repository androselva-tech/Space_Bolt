import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { Sprite } from '../scene/Sprite';
import { TEXTURES } from '../assets';
import { gameStore, useGame } from '../game/store';
import { RocketMesh, BOOSTER_STAGE, UPPER_STAGE } from '../rocket/RocketMesh';
import { SHUTTLE_ASCENT } from '../rocket/model';

/** On the Moon the Lunar Shuttle lifts off its landing platform, which stays behind. */
const STRUTS = ['landingStruts'] as const;
/** The shuttle's ascent engine nozzle (shuttle coordinates), and the height at which it reaches lunar orbit. */
const SHUTTLE_NOZZLE = 126;
const MOON_ORBIT_ALT = 4200;
import { setMotionSound } from '../audio/sfx';
import { Poly, SkyGradient, Smoke, StarField, Stroke, circlePts, rect, type Emitter } from './common';
import { caption, clamp01, flash, lerp, smooth } from './movie';

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;

/** The rocket is drawn at half size: 470 units tall on the pad. */
const R = 0.5;
/** Seconds from IGNITION to liftoff (the engine spools up). */
const SPOOL = 2.2;
/** Liftoff acceleration (units / s²), the second stage's, and where the stages split. */
const ACCEL = 70;
const ACCEL2 = 85;
const SPLIT_ALT = 5200;
/** Seconds after separation until orbit (the cut to the journey). */
const TO_ORBIT = 7.5;
/** Where the crew access arm meets the cabin hatch, and the tower. */
const ARM_Y = 345;
const TOWER_X = -150;

export type StageRect = { x: number; y: number; w: number; h: number };

/**
 * The launch pad and the launch movie. While fuelling, the rocket stands on the pad beside its
 * tower, fuel tanks and pipes (fuel pulses through the pipes with every right answer, liquid oxygen
 * boils off as white vapour, the astronaut walks the access arm to the hatch). After IGNITION:
 * the engine spools up in fire and smoke, the arms swing away, liftoff, the sky turns from blue to
 * black, the booster burns out and falls away, the second stage lights and turns towards orbit.
 */
export function LaunchScene({ stage }: { stage: StageRect }) {
  return (
    <Suspense fallback={null}>
      <Pad stage={stage} />
    </Suspense>
  );
}

type Body = { x: number; y: number; vx: number; vy: number; rot: number; spin: number };
type Run = {
  t: number;
  alt: number;
  speed: number;
  heading: number;
  whole: Body;
  sepAt: number;
  booster: Body;
  upper: Body;
  upperLit: number;
  done: boolean;
  shake: number;
};
const freshRun = (): Run => ({
  t: 0, alt: 0, speed: 0, heading: 0,
  whole: { x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0 },
  sepAt: -1, booster: { x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0 }, upper: { x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0 },
  upperLit: 0, done: false, shake: 0,
});

const SKY = {
  ground: { top: new THREE.Color('#5aa7ee'), bottom: new THREE.Color('#cfe9ff') },
  high: { top: new THREE.Color('#0d1840'), bottom: new THREE.Color('#2b4c9a') },
  space: { top: new THREE.Color('#000004'), bottom: new THREE.Color('#050a1c') },
};

function Pad({ stage }: { stage: StageRect }) {
  const tex = useTextures(TEXTURES) as Tex;
  const design = useGame((s) => s.design);
  // the way home starts from the Moon: black sky, grey ground, Earth overhead, low gravity
  const moon = useGame((s) => s.stage?.leg === 'moonLaunch');
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const run = useRef<Run>(freshRun());
  const whole = useRef<THREE.Group>(null);
  const booster = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const flameMain = useRef<THREE.Mesh>(null);
  const flameUpper = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const crewArm = useRef<THREE.Group>(null);
  const fuelArm = useRef<THREE.Group>(null);
  const astronaut = useRef<THREE.Mesh>(null);
  const flow = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const earth = useRef<THREE.Mesh>(null);
  const earthGroup = useRef<THREE.Group>(null);
  const sky = useRef({ top: SKY.ground.top.clone(), bottom: SKY.ground.bottom.clone() });
  const stars = useRef(0);
  const homeEarth = useRef<THREE.Mesh>(null);
  const emitters = useRef<Emitter[]>([]);
  const boardAt = useRef(-1);
  const flowAt = useRef(-10);
  const partEvent = useGame((s) => s.partEvent);
  useEffect(() => {
    if (partEvent.part === 'crew') boardAt.current = run.current.t;
    if (partEvent.part === 'fuel' || partEvent.part === 'oxidizer') flowAt.current = run.current.t;
  }, [partEvent.id]);
  useEffect(() => { if (__DEV__) (globalThis as { __launch?: unknown }).__launch = run; }, []);

  // clouds along the way up
  const clouds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: (i % 3 - 1) * 520 + (i * 137) % 300, y: 900 + i * 240, s: 0.8 + (i % 3) * 0.35 })), []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = gameStore.getState();
    const r = run.current;
    if (s.paused) { setMotionSound(null); return; }
    r.t += dt;
    const ignited = s.phase === 'launch' && s.ignitedAt > 0;
    const tl = ignited ? (Date.now() - s.ignitedAt) / 1000 : -1;
    const lift = Math.max(0, tl - SPOOL);

    // --- the rocket's flight ------------------------------------------------------------------
    if (ignited && lift > 0 && r.sepAt < 0) {
      r.speed = ACCEL * lift;
      r.heading = 1.25 * smooth((r.alt - 900) / 5600);
      r.whole.x += Math.sin(r.heading) * r.speed * dt;
      r.whole.y += Math.cos(r.heading) * r.speed * dt;
      r.whole.rot = -r.heading;
      r.alt = r.whole.y;
      // the shuttle has no booster: it climbs straight into lunar orbit
      if (moon && r.alt >= MOON_ORBIT_ALT && !r.done) {
        r.done = true;
        flash(1);
        s.orbitReached();
        setTimeout(() => flash(0), 250);
      }
      if (!moon && r.alt >= SPLIT_ALT) {
        r.sepAt = tl;
        r.booster = { ...r.whole, vx: Math.sin(r.heading) * r.speed * 0.85, vy: Math.cos(r.heading) * r.speed * 0.85, spin: 0.7 };
        r.upper = { ...r.whole, vx: Math.sin(r.heading) * r.speed, vy: Math.cos(r.heading) * r.speed, spin: 0 };
        flash(0.6);
      }
    }
    if (r.sepAt >= 0) {
      const since = tl - r.sepAt;
      // the booster: no thrust, gravity pulls it back, it tumbles
      r.booster.vy -= 260 * dt;
      r.booster.x += r.booster.vx * dt; r.booster.y += r.booster.vy * dt;
      r.booster.rot += r.booster.spin * dt;
      // the upper stage: coasts, then its own engine lights and it turns over towards orbit
      r.upperLit = clamp01((since - 1.2) / 0.5);
      r.heading = lerp(r.heading, 1.45, dt * 0.35);
      const sp = Math.hypot(r.upper.vx, r.upper.vy) + ACCEL2 * r.upperLit * dt;
      r.upper.vx = Math.sin(r.heading) * sp; r.upper.vy = Math.cos(r.heading) * sp;
      r.upper.x += r.upper.vx * dt; r.upper.y += r.upper.vy * dt;
      r.upper.rot = -r.heading;
      r.alt = r.upper.y;
      // the separation flash fades; the cut to orbit flashes white again
      if (since > TO_ORBIT - 0.8) flash(clamp01((since - (TO_ORBIT - 0.8)) / 0.8));
      else flash(Math.max(0, 0.55 - since * 1.4));
      if (since > TO_ORBIT && !r.done) {
        r.done = true;
        s.orbitReached();
        setTimeout(() => flash(0), 250);
      }
    }
    // a little shake while the engine roars near the ground
    r.shake = ignited && r.alt < 900 ? (tl < SPOOL ? smooth(tl / SPOOL) * 3 : 3 * (1 - r.alt / 900)) : 0;

    // --- the pieces in place --------------------------------------------------------------------
    const place = (g: THREE.Group | null, b: Body) => {
      if (!g) return;
      g.position.set(b.x + (Math.random() - 0.5) * r.shake, b.y + (Math.random() - 0.5) * r.shake, 0);
      g.rotation.z = b.rot;
    };
    if (r.sepAt < 0) { place(whole.current, r.whole); if (booster.current) booster.current.position.set(0, 0, 0); if (upper.current) upper.current.position.set(0, 0, 0); }
    else {
      if (whole.current) { whole.current.position.set(0, 0, 0); whole.current.rotation.z = 0; }
      place(booster.current, r.booster);
      place(upper.current, r.upper);
    }
    // flames: the main engine from IGNITION until separation, the upper stage's after it lights
    const thrust = !ignited ? 0 : r.sepAt >= 0 ? 0 : smooth(tl / SPOOL);
    const flick = 0.88 + Math.sin(r.t * 40) * 0.08 + Math.sin(r.t * 23) * 0.05;
    if (flameMain.current) {
      flameMain.current.visible = thrust > 0.02;
      flameMain.current.scale.set(0.8 + thrust * 0.6, thrust * flick * (1.4 + clamp01(r.alt / 3000) * 1.6), 1);
    }
    if (glow.current) {
      glow.current.visible = thrust > 0.02;
      glow.current.scale.setScalar(thrust * (0.9 + flick * 0.2));
    }
    if (flameUpper.current) {
      flameUpper.current.visible = r.upperLit > 0.02;
      flameUpper.current.scale.set(0.7, r.upperLit * flick * 1.4, 1);
    }
    setMotionSound(thrust > 0.1 || r.upperLit > 0.1 ? 'jet' : null);

    // the tower's arms swing away at IGNITION
    const swing = ignited ? smooth(tl / 1.6) : 0;
    if (crewArm.current) crewArm.current.rotation.z = swing * 1.25;
    if (fuelArm.current) fuelArm.current.rotation.z = -swing * 0.9;

    // the astronaut walks the access arm to the hatch after the crew check, then climbs in
    if (astronaut.current) {
      const f = s.fueling;
      const walking = boardAt.current >= 0 ? clamp01((r.t - boardAt.current) / 2.4) : 0;
      const aboard = (f.crew >= f.need.crew && boardAt.current < 0) || walking >= 1 || ignited;
      astronaut.current.visible = !aboard;
      if (moon) astronaut.current.position.set(lerp(-330, -60, walking), Math.abs(Math.sin(walking * 14)) * 10, 12);
      else astronaut.current.position.set(lerp(TOWER_X - 10, -34, walking), ARM_Y + 20 + Math.abs(Math.sin(walking * 20)) * 2, 12);
      const m = astronaut.current.material as THREE.MeshBasicMaterial;
      const walkTex = walking > 0 && walking < 1 && Math.floor(r.t * 6) % 2 === 0 ? tex.astronautWalk : tex.astronaut;
      if (m.map !== walkTex) { m.map = walkTex; m.needsUpdate = true; }
    }
    // fuel pulses through the pipes after each right fuelling answer
    const pulse = r.t - flowAt.current;
    flow.forEach((ref, k) => {
      const m = ref.current;
      if (!m) return;
      const p = (pulse * 0.9 - k * 0.15);
      m.visible = p > 0 && p < 1 && !ignited;
      const x = lerp(420, 40, clamp01(p));
      m.position.set(x, 12, 8);
    });

    // --- smoke ------------------------------------------------------------------------------
    const list: Emitter[] = [];
    const f = s.fueling;
    if (!ignited && f.oxidizer > 0) list.push({ x: 26, y: 150, rate: 2 + f.oxidizer, spreadX: 6, vx: 30, vy: 12, jitter: 10, size: 28, life: 2.2 });
    if (ignited && r.alt < 700) {
      // billowing clouds rolling out sideways along the ground
      const k = (r.sepAt < 0 ? thrust * (1 - r.alt / 700) : 0) * (moon ? 0.5 : 1);
      list.push({ x: 0, y: 6, rate: 28 * k, spreadX: 60, vx: 320, vy: 40, jitter: 80, size: 90, life: 3.2 });
    }
    if (ignited && lift > 0 && r.sepAt < 0) {
      // the exhaust trail behind the climbing rocket
      const nx = r.whole.x - Math.sin(r.heading) * 20, ny = r.whole.y - Math.cos(r.heading) * 20;
      list.push({ x: nx, y: ny, rate: 14, spreadX: 10, vx: 20, vy: -30, jitter: 30, size: 50, life: 2.6 });
    }
    if (r.sepAt >= 0 && tl - r.sepAt < 0.6) {
      const j = r.upper;
      list.push({ x: j.x + Math.sin(r.heading) * 180, y: j.y + Math.cos(r.heading) * 180, rate: 40, spreadX: 30, vx: 60, vy: 0, jitter: 90, size: 30, life: 1.2 });
    }
    emitters.current = list;

    // --- sky: blue to black with height; stars come out; the curve of the Earth below -----------
    const hi = smooth(r.alt / 3200), sp = moon ? 1 : smooth((r.alt - 3200) / 2600);
    sky.current.top.copy(SKY.ground.top).lerp(SKY.high.top, moon ? 1 : hi).lerp(SKY.space.top, sp);
    sky.current.bottom.copy(SKY.ground.bottom).lerp(SKY.high.bottom, moon ? 1 : hi).lerp(SKY.space.bottom, sp);
    stars.current = moon ? 1 : smooth((r.alt - 2400) / 2400);
    if (homeEarth.current) {
      const viewW = size.width / camera.zoom, viewH = size.height / camera.zoom;
      homeEarth.current.position.set(camera.position.x + viewW * 0.28, camera.position.y + viewH * 0.26, -70);
    }
    if (earthGroup.current && earth.current) {
      const e = smooth((r.alt - 3800) / 2400);
      earthGroup.current.visible = e > 0.01;
      const viewH = size.height / camera.zoom;
      earthGroup.current.position.set(camera.position.x, camera.position.y - viewH * 0.45 - 4250 + (1 - e) * 600, -60);
      (earth.current.material as THREE.MeshBasicMaterial).opacity = e;
    }

    // --- captions ---------------------------------------------------------------------------
    const name = s.design.name;
    if (!ignited) { /* the pad overlay talks while fuelling and counting down */ }
    else if (moon) {
      if (tl < SPOOL) caption('IGNITION!', 'Engine start on the Moon');
      else if (lift < 3) caption('LIFTOFF FROM THE MOON!', `${name} is heading home`);
      else if (lift < 5) caption('THE PLATFORM STAYS BEHIND', 'Its landing struts became our launch pad, just like Apollo');
      else if (r.alt < 2400) caption('ONE-SIXTH GRAVITY', 'Leaving the Moon takes far less push than leaving Earth');
      else if (r.alt < 3600) caption('NO AIR, NO CLOUDS', 'No air to push through: the sky stays black all the way');
      else caption('INTO LUNAR ORBIT', 'Next stop: the space station');
    }
    else if (tl < SPOOL) caption('IGNITION!', 'Main engine start');
    else if (lift < 3) caption('LIFTOFF!', `${name} has cleared the tower`);
    else if (r.sepAt < 0 && r.alt < 2600) caption('MAX-Q', 'The air pushes hardest on the rocket here');
    else if (r.sepAt < 0) caption('LEAVING THE ATMOSPHERE', "The sky turns black: there's almost no air up here");
    else if (tl - r.sepAt < 1.4) caption('BOOSTER SEPARATION!', 'The empty booster falls back to Earth');
    else if (tl - r.sepAt < 4) caption('SECOND STAGE IGNITION', 'The upper stage flies on');
    else caption('GRAVITY TURN', 'Turning sideways to go into orbit');

    // --- camera -----------------------------------------------------------------------------
    const base = Math.min((size.height * stage.h) / 780, (size.width * stage.w) / 760);
    camera.zoom = base * lerp(1, 0.62, smooth(r.alt / 3500));
    camera.updateProjectionMatrix();
    const viewW = size.width / camera.zoom, viewH = size.height / camera.zoom;
    const focus = r.sepAt < 0 ? r.whole : r.upper;
    const fy = r.alt > 120 ? focus.y + 260 * R * Math.cos(r.heading) : 290;
    const fx = r.alt > 120 ? focus.x : 60;
    // the focus sits in the middle of the stage rect
    const ax = stage.x + stage.w * 0.5, ay = stage.y + stage.h * 0.55;
    camera.position.x = fx + viewW * (0.5 - ax);
    camera.position.y = fy + viewH * (ay - 0.5);
    camera.position.z = 100;
  });

  const flameTex = tex.flame;
  return (
    <>
      <SkyGradient colors={sky} />
      <StarField opacity={stars} />
      {/* the Earth's curve, seen from high up */}
      <group ref={earthGroup} visible={false}>
        <mesh position={[0, 0, -0.5]}>
          <circleGeometry args={[4880, 120]} />
          <meshBasicMaterial color={moon ? '#c9c9cf' : '#8fd0ff'} transparent opacity={moon ? 0.2 : 0.45} toneMapped={false} />
        </mesh>
        <mesh ref={earth}>
          <circleGeometry args={[4800, 120]} />
          <meshBasicMaterial color={moon ? '#9c9ca3' : '#3f8ad8'} transparent opacity={0} toneMapped={false} />
        </mesh>
        <mesh position={[-900, 4500, 0.2]} scale={[1, 0.18, 1]}><circleGeometry args={[700, 40]} /><meshBasicMaterial color={moon ? '#85858c' : '#4f9b5a'} toneMapped={false} /></mesh>
        <mesh position={[1100, 4560, 0.2]} scale={[1, 0.14, 1]}><circleGeometry args={[520, 40]} /><meshBasicMaterial color={moon ? '#8a8a91' : '#5aa865'} toneMapped={false} /></mesh>
      </group>
      {moon && <Sprite ref={homeEarth} texture={tex.earth} width={130} height={130} opacity={0.95} />}
      {!moon && clouds.map((c, i) => <Sprite key={i} texture={tex.cloud} width={300 * c.s} height={130 * c.s} position={[c.x, c.y, -40 + i * 0.1]} opacity={0.9} />)}
      {/* far hills (Moon: crater rims) and the ground */}
      <Poly pts={[-6000, 0, -6000, 70, -2400, 120, -900, 60, 300, 140, 1600, 70, 6000, 110, 6000, 0]} color={moon ? '#77777e' : '#3c6b54'} z={-50} outline={false} />
      <Poly pts={rect(-6000, -3000, 6000, 0)} color={moon ? '#8e8e95' : '#4f7d4a'} z={-49} outline={false} />
      <Poly pts={rect(-6000, -40, 6000, 0)} color={moon ? '#a4a4aa' : '#5d8c55'} z={-48} outline={false} />
      {/* the pad: concrete, and the flame trench under the engine */}
      {!moon && (
        <>
          <Poly pts={rect(-210, -34, 230, 0)} color="#9aa0a8" z={-20} />
          <Poly pts={rect(-48, -34, 48, -2)} color="#1d1818" z={-19} outline={false} />
          <Tower />
          <FuelFarm />
        </>
      )}
      <group ref={crewArm} position={[TOWER_X + 30, ARM_Y + 6, 0]} visible={!moon}>
        <Poly pts={rect(0, -8, 112, 8)} color="#c4493b" z={-6} />
        <Stroke pts={[0, 24, 110, 24]} width={3} z={-6} />
      </group>
      <group ref={fuelArm} position={[TOWER_X + 30, 150, 0]} visible={!moon}>
        <Poly pts={rect(0, -6, 118, 6)} color="#7b818b" z={-6} />
      </group>
      {moon && <group scale={[R, R, 1]}><RocketMesh design={design} parts={STRUTS} /></group>}
      {!moon && flow.map((ref, k) => (
        <mesh key={k} ref={ref} visible={false}><circleGeometry args={[7, 12]} /><meshBasicMaterial color={k === 1 ? '#bfe9ff' : '#f2c13d'} toneMapped={false} /></mesh>
      ))}
      <Sprite ref={astronaut} texture={tex.astronaut} width={34} height={38} anchor={[0.5, 1]} position={[TOWER_X, ARM_Y + 20, 12]} />
      <Smoke texture={tex.smoke} emitters={emitters} max={90} z={30} />
      {/* the rocket: one group on the pad; after separation the two stages fly apart */}
      <group ref={whole}>
        <group ref={booster}>
          <group scale={[R, R, 1]}>
            <RocketMesh design={design} parts={moon ? SHUTTLE_ASCENT : BOOSTER_STAGE} />
          </group>
          <Sprite ref={glow} texture={tex.glow} width={260} height={260} position={[0, moon ? SHUTTLE_NOZZLE * R - 20 : -20, -1]} opacity={0.85} />
          {/* the flame hangs down from the nozzle (its picture points down) */}
          <Sprite ref={flameMain} texture={flameTex} width={moon ? 38 : 46} height={150} anchor={[0.5, 0.03]} position={[0, moon ? SHUTTLE_NOZZLE * R + 2 : 2, -0.5]} />
        </group>
        <group ref={upper} visible={!moon}>
          <group scale={[R, R, 1]}>
            <RocketMesh design={design} parts={UPPER_STAGE} />
          </group>
          <Sprite ref={flameUpper} texture={flameTex} width={26} height={80} anchor={[0.5, 0.03]} position={[0, 340 * R + 2, -0.5]} />
        </group>
      </group>
    </>
  );
}

/** The launch tower: two steel legs with cross-bracing, platforms, a light on top. */
function Tower() {
  const x0 = TOWER_X - 30, x1 = TOWER_X + 30, top = 560;
  const braces: number[][] = [];
  for (let y = 0; y < top - 40; y += 56) braces.push([x0, y, x1, y + 56], [x1, y, x0, y + 56]);
  return (
    <group position={[0, 0, -8]}>
      <Poly pts={rect(x0 - 6, 0, x0 + 6, top)} color="#c4493b" />
      <Poly pts={rect(x1 - 6, 0, x1 + 6, top)} color="#c4493b" />
      {braces.map((b, i) => <Stroke key={i} pts={b} width={4} color="#8e3328" />)}
      {[160, ARM_Y + 6, 500].map((y) => <Poly key={y} pts={rect(x0 - 14, y - 6, x1 + 14, y + 6)} color="#7b818b" />)}
      <Poly pts={rect(x0 - 4, top, x1 + 4, top + 26)} color="#7b818b" />
      <Poly pts={circlePts(TOWER_X, top + 40, 10)} color="#ff6a4a" />
      <Stroke pts={[TOWER_X, top + 26, TOWER_X, top + 30]} width={4} />
    </group>
  );
}

/** The liquid-oxygen sphere, the fuel tank and the pipes to the pad. */
function FuelFarm() {
  return (
    <group position={[0, 0, -12]}>
      <Stroke pts={[300, 0, 300, 50]} width={8} color="#5c6370" />
      <Stroke pts={[360, 0, 360, 50]} width={8} color="#5c6370" />
      <Poly pts={circlePts(330, 120, 78)} color="#f4f6f8" />
      <Poly pts={circlePts(300, 150, 16)} color="#ffffff" outline={false} />
      <Poly pts={rect(430, 0, 520, 210)} color="#d9a441" />
      <Poly pts={[430, 210, 475, 240, 520, 210]} color="#d9a441" />
      <Poly pts={rect(430, 70, 520, 92)} color="#1d1818" outline={false} />
      <Stroke pts={[475, 0, 475, 10, 40, 10, 40, 30]} width={10} color="#5c6370" />
      <Stroke pts={[330, 42, 330, 22, 46, 22, 46, 40]} width={8} color="#9fd6ff" />
    </group>
  );
}
