import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { Sprite } from '../scene/Sprite';
import { TEXTURES } from '../assets';
import { gameStore, useGame } from '../game/store';
import { RocketMesh, UPPER_STAGE } from '../rocket/RocketMesh';
import { setMotionSound } from '../audio/sfx';
import { Poly, SkyGradient, Smoke, StarField, Stroke, circlePts, rect, type Emitter } from './common';
import { caption, clamp01, flash, lerp, smooth } from './movie';

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;

/** The landing site: the Moon. */
const L = {
  ground: '#cfcfd3', groundDark: '#a6a6ad', sky: ['#000003', '#06080f'] as [string, string], stars: 1, chute: false,
  planet: 'earth' as keyof Tex, why: 'No air on the Moon: no parachute, only the engine can slow us down',
};
/** Seconds of the glide in, and after touchdown: the hatch, each astronaut down the ladder, the flag, the end. */
const GLIDE = 5;
const HATCH = 1.2;
const DOWN_1 = 2.8;
const DOWN_2 = 4.8;
const FLAG = 8.2;
const END = 11.5;
/** The hatch in rocket coordinates (on the crew cabin), and where the ladder reaches the ground. */
const HATCH_Y = 706;
const LADDER_X = 46;

/** The lander is drawn at 0.6 scale; its feet (legs out) are this far below the stage's local origin… */
const RL = 0.6;
const FOOT_Y = 304;
/** The descent engine's nozzle, and the lander's middle (it turns about it), in rocket coordinates. */
const NOZZLE_Y = 340;
const CENTER = 640;

export function LandingScene() {
  return (
    <Suspense fallback={null}>
      <Landing />
    </Suspense>
  );
}

type Run = { t: number; x: number; y: number; vy: number; rot: number; legs: number; burn: number; chute: number; chuteGone: number; touchAt: number; done: boolean };

function Landing() {
  const tex = useTextures(TEXTURES) as Tex;
  const design = useGame((s) => s.design);
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const run = useRef<Run>({ t: 0, x: -900, y: 1300, vy: 0, rot: -Math.PI / 2, legs: 0, burn: 0, chute: 0, chuteGone: 0, touchAt: -1, done: false });
  const lander = useRef<THREE.Group>(null);
  const legs = useRef(0);
  const flame = useRef<THREE.Mesh>(null);
  const chute = useRef<THREE.Group>(null);
  const astro = useRef<THREE.Mesh>(null);
  const astro2 = useRef<THREE.Mesh>(null);
  const door = useRef<THREE.Group>(null);
  const ladder = useRef<THREE.Group>(null);
  const flagPole = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Mesh>(null);
  const sky = useRef({ top: new THREE.Color(L.sky[0]), bottom: new THREE.Color(L.sky[1]) });
  const stars = useRef(L.stars);
  const emitters = useRef<Emitter[]>([]);
  useEffect(() => { if (__DEV__) (globalThis as { __landing?: unknown }).__landing = run; }, []);

  // the ground: flat where the lander comes down, bumpy beyond, with craters and rocks
  const ground = useMemo(() => {
    const top: number[] = [];
    for (let x = -3000; x <= 3000; x += 100) {
      const flat = Math.abs(x) < 420;
      top.push(x, flat ? 0 : Math.sin(x * 0.004) * 50 + Math.sin(x * 0.011) * 22 + 20);
    }
    return [...top, 3000, -2500, -3000, -2500];
  }, []);
  const craters = useMemo(() => [[-700, 18, 120], [560, 22, 90], [-1300, 30, 160], [1250, 40, 140], [220, -40, 60], [-260, -70, 46]], []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = gameStore.getState();
    const r = run.current;
    if (s.paused) { setMotionSound(null); return; }
    r.t += dt;
    const t = r.t;
    // --- the descent --------------------------------------------------------------------------
    // 0–5 s: glide in from the left and turn upright
    const turn = smooth((t - 0.6) / (GLIDE - 0.8));
    r.rot = lerp(-Math.PI / 2, 0, turn);
    const groundY = (CENTER - FOOT_Y) * RL; // the lander's middle, when its feet touch the ground
    if (r.touchAt < 0) {
      if (t < GLIDE) {
        r.x = lerp(-900, 0, smooth(t / GLIDE));
        r.y = lerp(1300, 900, smooth(t / GLIDE));
        r.vy = -50;
      } else {
        const alt = r.y - groundY;
        // parachute (where there is air), then the engine
        if (L.chute && t < 6.5) {
          r.chute = smooth((t - 3.3) / 0.8);
          r.vy = lerp(r.vy, -90, dt * 1.5);
        } else {
          if (L.chute && r.chuteGone === 0) r.chuteGone = t;
          r.chute = L.chute ? Math.max(0, 1 - (t - r.chuteGone) * 1.2) : 0;
          // retro burn: slow, slower, and a gentle touchdown
          r.burn = clamp01(r.burn + dt * 2);
          const want = alt > 300 ? -75 : -16 - alt * 0.1;
          r.vy = lerp(r.vy, want, dt * 1.6);
        }
        if (alt < 330) legs.current = Math.min(1, legs.current + dt * 0.9);
        r.y += r.vy * dt;
        if (r.y <= groundY) {
          r.y = groundY;
          r.touchAt = t;
          legs.current = 1;
          flash(0.25);
          setTimeout(() => flash(0), 120);
        }
      }
    } else {
      r.burn = Math.max(0, r.burn - dt * 3);
    }
    if (lander.current) {
      lander.current.position.set(r.x, r.y, 10);
      lander.current.rotation.z = r.rot;
    }
    const flick = 0.85 + Math.sin(t * 38) * 0.1 + Math.sin(t * 21) * 0.05;
    if (flame.current) {
      flame.current.visible = r.burn > 0.03;
      flame.current.scale.set(0.9, r.burn * flick * 1.3, 1);
    }
    setMotionSound(r.burn > 0.1 ? 'jet' : null);
    if (chute.current) {
      const k = r.chute;
      chute.current.visible = k > 0.02;
      chute.current.scale.set(0.3 + k * 0.7, 0.2 + k * 0.8, 1);
      const away = r.chuteGone > 0 ? (t - r.chuteGone) : 0;
      chute.current.position.set(r.x + away * 140, r.y + (940 - CENTER) * RL + 30 + away * 160, 8);
    }

    // dust blown out sideways by the engine near the ground, and a puff at touchdown
    const list: Emitter[] = [];
    const alt = r.y - groundY;
    if (r.burn > 0.2 && alt < 260) list.push({ x: r.x, y: 4, rate: 30 * (1 - alt / 260) * r.burn, spreadX: 40, vx: 260, vy: 20, jitter: 60, size: 46, life: 1.8 });
    if (r.touchAt >= 0 && t - r.touchAt < 0.3) list.push({ x: r.x, y: 4, rate: 90, spreadX: 120, vx: 160, vy: 30, jitter: 60, size: 60, life: 2 });
    emitters.current = list;

    // --- after touchdown: the hatch opens, two astronauts climb down, walk out and plant the flag ----
    const since = r.touchAt >= 0 ? t - r.touchAt : -1;
    const open = clamp01((since - HATCH) / 1.0);
    if (door.current) door.current.scale.x = lerp(1, -0.15, smooth(open));
    if (ladder.current) ladder.current.visible = open > 0.6;
    const hatchY = (HATCH_Y - FOOT_Y) * RL;
    const crew = (m: THREE.Mesh | null, start: number, dir: 1 | -1, far: number) => {
      if (!m) return;
      m.visible = since > start;
      const down = clamp01((since - start) / 1.6);
      const walk = clamp01((since - start - 1.6) / 1.8);
      m.position.set(r.x + LADDER_X * RL + 14 + dir * walk * far, lerp(hatchY - 30, 0, down), 14);
      m.scale.x = dir;
      const mat = m.material as THREE.MeshBasicMaterial;
      const tx = walk > 0 && walk < 1 && Math.floor(t * 6) % 2 === 0 ? tex.astronautWalk : tex.astronaut;
      if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
    };
    crew(astro.current, DOWN_1, 1, 140);
    crew(astro2.current, DOWN_2, -1, 150);
    if (flagPole.current) {
      const up = clamp01((since - FLAG) / 1.2);
      flagPole.current.visible = up > 0;
      flagPole.current.scale.set(1, Math.max(0.01, up), 1);
      flagPole.current.position.set(r.x + 200, 0, 13);
    }
    if (planet.current) planet.current.position.set(camera.position.x + 260 - r.x * 0.05, camera.position.y + 170, -80);

    // --- captions ---------------------------------------------------------------------------
    const name = s.design.name;
    if (t < GLIDE) caption('APPROACHING THE MOON', 'Turning upright for the descent');
    else if (r.touchAt < 0 && legs.current < 0.5) caption('NO AIR, NO PARACHUTE', L.why);
    else if (r.touchAt < 0) caption('LANDING LEGS OUT', 'Slowly… gently… 10 metres… 5…');
    else if (since < HATCH) caption('TOUCHDOWN!', `${name} has landed on the Moon`);
    else if (since < DOWN_1) caption('THE HATCH OPENS', 'The crew gets ready to step outside');
    else if (since < DOWN_2) caption('ONE SMALL STEP…', 'The first astronaut climbs down the ladder');
    else if (since < FLAG) caption('…ONE GIANT LEAP', 'The second astronaut follows');
    else if (since < FLAG + 2) caption('THE FLAG GOES UP', `The ${name} flag stands on the Moon`);
    else caption('WE ARE ON THE MOON!', 'No wind up here: the flag will stay just like that');
    if (since > END && !r.done) {
      r.done = true;
      s.landed();
    }

    // --- camera: follows the lander down, then frames the landing site -------------------------
    const base = Math.min(size.height / 760, size.width / 1100);
    const near = smooth(1 - (r.y - groundY) / 700);
    camera.zoom = base * lerp(0.8, 1.3, near);
    camera.updateProjectionMatrix();
    const viewH = size.height / camera.zoom;
    camera.position.x = lerp(camera.position.x, r.x + (since > 3 ? 90 : 0), r.t < 0.1 ? 1 : dt * 3);
    // keep the ground in the lower third once we're close
    camera.position.y = Math.max(viewH * 0.18, r.y + 40);
    camera.position.z = 100;
  });

  return (
    <>
      <SkyGradient colors={sky} />
      <StarField opacity={stars} />
      <Sprite ref={planet} texture={tex[L.planet]} width={150} height={150} opacity={0.95} />
      <Poly pts={ground} color={L.ground} z={-30} />
      <Poly pts={rect(-3000, -14, 3000, 0)} color={L.groundDark} z={-29.5} outline={false} />
      {craters.map(([x, y, w], i) => (
        <mesh key={i} position={[x, y, -29]} scale={[w, w * 0.28, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color={L.groundDark} toneMapped={false} /></mesh>
      ))}
      <Smoke texture={tex.smoke} emitters={emitters} max={70} z={30} />
      <group ref={chute} visible={false}>
        <Poly pts={[-130, 0, -110, 50, -60, 85, 0, 98, 60, 85, 110, 50, 130, 0, 80, 14, 0, 18, -80, 14]} color="#f08a3c" />
        <Poly pts={[-40, 16, -20, 92, 20, 92, 40, 16]} color="#f7f4ee" outline={false} z={0.05} />
        {[-120, -60, 0, 60, 120].map((x) => <Stroke key={x} pts={[x, 4, 0, -170]} width={2} color="#e8e2d6" z={-0.1} />)}
      </group>
      <group ref={lander}>
        <group position={[0, -CENTER * RL, 0]}>
          <group scale={[RL, RL, 1]}>
            <RocketMesh design={design} parts={UPPER_STAGE} legs={legs} />
            {/* the hatch: dark doorway, and the door that swings open on its left hinge */}
            <Poly pts={rect(-34, HATCH_Y - 40, 34, HATCH_Y + 40)} color="#14161d" z={6} />
            <group ref={door} position={[-34, 0, 6.2]}>
              <Poly pts={rect(0, HATCH_Y - 40, 68, HATCH_Y + 40)} color={design.trim} />
              <Poly pts={circlePts(34, HATCH_Y + 10, 13, 16)} color="#9fd6ff" z={0.05} />
            </group>
            <group ref={ladder} visible={false} position={[0, 0, 5.8]}>
              <Stroke pts={[LADDER_X - 14, HATCH_Y - 40, LADDER_X - 14, 120]} width={5} color="#d8dce2" />
              <Stroke pts={[LADDER_X + 14, HATCH_Y - 40, LADDER_X + 14, 120]} width={5} color="#d8dce2" />
              {Array.from({ length: 12 }, (_, i) => <Stroke key={i} pts={[LADDER_X - 14, 140 + i * 46, LADDER_X + 14, 140 + i * 46]} width={4} color="#d8dce2" />)}
            </group>
          </group>
          <Sprite ref={flame} texture={tex.flame} width={36} height={120} anchor={[0.5, 0.03]} position={[0, NOZZLE_Y * RL + 2, -0.5]} />
        </group>
      </group>
      <Sprite ref={astro} texture={tex.astronaut} width={56} height={63} anchor={[0.5, 1]} position={[0, 0, 14]} visible={false} />
      <Sprite ref={astro2} texture={tex.astronaut} width={56} height={63} anchor={[0.5, 1]} position={[0, 0, 14.1]} visible={false} />
      <group ref={flagPole} visible={false}>
        <Poly pts={rect(-3, 0, 3, 150)} color="#d8dce2" />
        <Poly pts={[3, 148, 96, 136, 88, 108, 3, 100]} color={design.trim} z={0.05} />
        <Poly pts={[3, 132, 70, 124, 66, 114, 3, 116]} color={design.body} z={0.1} outline={false} />
      </group>
    </>
  );
}
