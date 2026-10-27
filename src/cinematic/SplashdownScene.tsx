import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { Sprite } from '../scene/Sprite';
import { TEXTURES } from '../assets';
import { gameStore, useGame } from '../game/store';
import { setMotionSound } from '../audio/sfx';
import { Poly, SkyGradient, Smoke, StarField, Stroke, circlePts, rect, type Emitter } from './common';
import { caption, clamp01, flash, lerp, smooth } from './movie';
import { ALT_TO_M, DROGUE_WINDOW, MAINS_WINDOW, reentryStore, type ChuteWindow } from './reentryState';
import { RocketMesh } from '../rocket/RocketMesh';
import { CAPSULE, type PartId } from '../rocket/model';
import { Station } from '../station/StationArt';

/** What's left of the shuttle after undocking: the capsule's service section. */
const SERVICE: PartId[] = ['ascentEngine', 'mainHull', 'fuelTanks', 'rcsPods', 'solarWings'];
/** The capsule (the shuttle's crew cabin) is drawn at this scale, its heat shield at y = 352. */
const CS = 0.62;
const SHIELD_Y = 352;

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;

/** The movie's beats (seconds): undocking, the deorbit burn, then separation and the fall. */
const UNDOCK = 3;
const BURN = 6;
const SEP = 7;
/** After splashdown: the ship arrives, then the end. */
const SHIP_AFTER = 6;
const END_AFTER = 10;
/** Height at the start of the fall (world units; the sea is at 0), and where re-entry's fire fades. */
const TOP = 9000;
const BLAZE_END = 5000;
/** Falling speeds (units/s): through the air, under the drogues, under the mains. */
const FREE_FALL = 470;
const DROGUE_FALL = 170;
const MAINS_FALL = 45;

/** The capsule's middle sits this far above its heat shield (where it floats on the water). */
const FLOAT = 30;

const SKY = {
  space: { top: new THREE.Color('#000004'), bottom: new THREE.Color('#050a1c') },
  high: { top: new THREE.Color('#0d1840'), bottom: new THREE.Color('#2b4c9a') },
  low: { top: new THREE.Color('#5aa7ee'), bottom: new THREE.Color('#d7ecff') },
};

export function SplashdownScene() {
  return (
    <Suspense fallback={null}>
      <Splash />
    </Suspense>
  );
}

/**
 * Coming home: the crew capsule leaves its service module, turns its heat shield forward and
 * blazes through the air (radio blackout), opens two drogue chutes, then three big main ones,
 * floats down through the clouds and splashes into the sea. Flotation bags pop up, the recovery
 * ship comes alongside: mission accomplished.
 */
function Splash() {
  const tex = useTextures(TEXTURES) as Tex;
  const design = useGame((s) => s.design);
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const run = useRef({ t: 0, done: false, splashAt: -1, alt: TOP, v: FREE_FALL + 120, drogueAt: -1, mainsAt: -1, readAt: 0, autoAt: -1 });
  const station = useRef<THREE.Group>(null);
  const burn = useRef<THREE.Mesh>(null);
  const capsule = useRef<THREE.Group>(null);
  const service = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const drogues = useRef<THREE.Group>(null);
  const mains = useRef<THREE.Group>(null);
  const bags = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Group>(null);
  const waves = useRef<THREE.Group>(null);
  const sky = useRef({ top: SKY.space.top.clone(), bottom: SKY.space.bottom.clone() });
  const stars = useRef(1);
  const emitters = useRef<Emitter[]>([]);
  useEffect(() => { if (__DEV__) (globalThis as { __splash?: unknown }).__splash = run; }, []);
  useEffect(() => {
    const m = glow.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.color = new THREE.Color('#ff8a3a');
  }, []);
  const clouds = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ x: ((i * 397) % 1400) - 700, y: 900 + i * 180, s: 0.9 + (i % 3) * 0.4 })), []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = gameStore.getState();
    const r = run.current;
    if (s.paused) { setMotionSound(null); return; }
    r.t += dt;
    const t = r.t;

    // --- the fall: free through the air, slowed by each chute once it's out ---------------------------
    if (t > SEP && r.splashAt < 0) {
      const want = r.mainsAt >= 0 ? MAINS_FALL : r.drogueAt >= 0 ? DROGUE_FALL : FREE_FALL;
      r.v = lerp(r.v, want, Math.min(1, dt * (r.mainsAt >= 0 || r.drogueAt >= 0 ? 1.3 : 0.4)));
      r.alt = Math.max(0, r.alt - r.v * dt);
    }
    const alt = r.alt;
    // the chute windows: open in their band; past the band the backup fires (late)
    const win = (fired: boolean, band: readonly [number, number], ready: boolean): ChuteWindow =>
      fired ? 'done' : !ready || alt > band[0] ? 'wait' : alt >= band[1] ? 'open' : 'done';
    const drogueWin = win(!!s.chutes.drogue, DROGUE_WINDOW, t > SEP);
    const mainsWin = win(!!s.chutes.mains, MAINS_WINDOW, !!s.chutes.drogue);
    if (!s.chutes.drogue && t > SEP && alt < DROGUE_WINDOW[1]) s.deployChute('drogue', 'late');
    if (s.chutes.drogue && !s.chutes.mains && alt < MAINS_WINDOW[1]) s.deployChute('mains', 'late');
    // dev builds: the autopilot fires each chute just inside its window
    if (__DEV__ && (globalThis as { __autopilot?: boolean }).__autopilot) {
      if (drogueWin === 'open' && alt < DROGUE_WINDOW[0] - 300) s.deployChute('drogue', 'ok');
      if (mainsWin === 'open' && alt < MAINS_WINDOW[0] - 300) s.deployChute('mains', 'ok');
    }
    const st = gameStore.getState().chutes;
    if (st.drogue && r.drogueAt < 0) r.drogueAt = t;
    if (st.mains && r.mainsAt < 0) r.mainsAt = t;
    if (t - r.readAt > 0.1) {
      r.readAt = t;
      reentryStore.setState({ altitude: Math.round(alt * ALT_TO_M), speed: Math.round(r.v * 6), drogue: drogueWin, mains: mainsWin });
    }

    const sinceSplash = r.splashAt > 0 ? t - r.splashAt : -1;
    const bob = sinceSplash > 0 ? Math.sin(t * 1.8) * 6 : 0;
    const blazing = t > SEP + 0.5 && alt > BLAZE_END && alt < TOP - 200;
    const heat = blazing ? Math.min(1, (TOP - alt) / 1500) * Math.min(1, (alt - BLAZE_END) / 900) : 0;
    const shake = heat * 5;
    const cx = (Math.random() - 0.5) * shake;
    const cy = alt + FLOAT + bob + (Math.random() - 0.5) * shake;
    if (capsule.current) {
      capsule.current.position.set(cx, cy, 10);
      // tilted while blazing in, hanging straight under the chutes
      capsule.current.rotation.z = t < SEP ? 0 : r.drogueAt < 0 ? 0.3 * Math.min(1, (t - SEP) / 2) : Math.sin(t * 1.1) * 0.05;
    }
    // undocking: the station drifts away; the deorbit burn; then the service section falls behind
    if (station.current) {
      station.current.visible = t < SEP + 1;
      station.current.position.set(380 + t * 60, cy + 260 + t * 40, -30);
      station.current.rotation.z = t * 0.2;
    }
    if (burn.current) {
      burn.current.visible = t > UNDOCK && t < BURN;
      burn.current.position.set(cx, cy - 200, 8.5);
      burn.current.scale.set(1, 0.8 + Math.sin(t * 40) * 0.1, 1);
    }
    if (service.current) {
      const k = Math.max(0, t - SEP);
      service.current.visible = k < 6;
      service.current.position.set(cx - k * 60, cy - 2 - k * 50 + (k > 0 ? 0 : 0), 9);
      service.current.rotation.z = k * 0.25;
    }
    if (glow.current) {
      glow.current.visible = heat > 0.02;
      glow.current.position.set(cx, cy - 30, 9.5);
      glow.current.scale.set(1.2 * heat + 0.3, 0.9 * heat + 0.2, 1);
    }
    const drogue = r.drogueAt >= 0 ? smooth((t - r.drogueAt) / 0.6) * (r.mainsAt >= 0 ? 1 - smooth((t - r.mainsAt) / 0.6) : 1) : 0;
    if (drogues.current) {
      drogues.current.visible = drogue > 0.02;
      drogues.current.position.set(cx, cy + 200, 8);
      drogues.current.scale.setScalar(0.3 + drogue * 0.7);
    }
    const main = r.mainsAt >= 0 ? smooth((t - r.mainsAt) / 1.4) : 0;
    if (mains.current) {
      const fold = r.splashAt > 0 ? clamp01(1 - (t - r.splashAt) / 1.5) : 1;
      mains.current.visible = main > 0.02 && fold > 0.02;
      mains.current.position.set(cx + (1 - fold) * 160, cy + 110 + 240 * main * fold, 8);
      mains.current.scale.set(0.2 + main * 0.8 * fold, (0.2 + main * 0.8) * fold, 1);
    }
    if (bags.current) {
      const up = sinceSplash > 0 ? smooth((sinceSplash - 1) / 1.2) : 0;
      bags.current.visible = up > 0.02;
      bags.current.position.set(cx, cy + 92, 10.5);
      bags.current.scale.setScalar(Math.max(0.01, up));
    }
    if (ship.current) {
      const k = sinceSplash > 0 ? smooth((sinceSplash - 1) / SHIP_AFTER) : 0;
      ship.current.visible = alt < 1500;
      ship.current.position.set(lerp(1700, 470, k), Math.sin(t * 1.2) * 4, 4);
    }
    if (waves.current) waves.current.position.x = (t * 30) % 200;

    // splashdown: gentle under the mains, a hard smack if they came late
    if (alt <= 0 && r.splashAt < 0) {
      r.splashAt = t;
      flash(s.chutes.mains === 'ok' ? 0.35 : 0.7);
      setTimeout(() => flash(0), 140);
    }
    const list: Emitter[] = [];
    if (heat > 0.05) list.push({ x: cx, y: cy + 60, rate: 26 * heat, spreadX: 30, vx: 30, vy: 260, jitter: 60, size: 46, life: 1.4 });
    if (sinceSplash >= 0 && sinceSplash < 0.5) {
      list.push({ x: cx - 70, y: 6, rate: 120, spreadX: 30, vx: 220, vy: 320, jitter: 90, size: 40, life: 1.6 });
      list.push({ x: cx + 70, y: 6, rate: 120, spreadX: 30, vx: 220, vy: 320, jitter: 90, size: 40, life: 1.6 });
    }
    emitters.current = list;
    setMotionSound(heat > 0.1 || (t > UNDOCK && t < BURN) ? 'jet' : null);

    // the sky: black space, the dark blue of high air, then a bright blue day over the sea
    const high = 1 - smooth((alt - 6000) / 4000), low = 1 - smooth((alt - 1500) / 3000);
    sky.current.top.copy(SKY.space.top).lerp(SKY.high.top, high).lerp(SKY.low.top, low);
    sky.current.bottom.copy(SKY.space.bottom).lerp(SKY.high.bottom, high).lerp(SKY.low.bottom, low);
    stars.current = 1 - high;
    if (earth.current) {
      earth.current.visible = alt > 5500;
      earth.current.position.set(camera.position.x, cy - 600 - 6000, -60);
    }

    // captions
    const name = s.design.name;
    const late = s.chutes.drogue === 'late' || s.chutes.mains === 'late';
    if (t < UNDOCK) caption('UNDOCKING', 'The crew capsule pulls away from the space station');
    else if (t < BURN) caption('DEORBIT BURN', 'One last push to drop out of orbit');
    else if (t < SEP + 1) caption('CAPSULE SEPARATION', 'The service section falls away: only the capsule comes home');
    else if (heat > 0.05 && alt > 7000) caption('RE-ENTRY!', 'The heat shield faces forward into the air');
    else if (heat > 0.05) caption('RADIO BLACKOUT', 'The air around us glows hotter than 2,000 °C');
    else if (!s.chutes.drogue) caption(alt > DROGUE_WINDOW[0] ? 'GET READY…' : 'DEPLOY THE DROGUES!', alt > DROGUE_WINDOW[0] ? 'Fire the drogue chutes when the button turns green' : 'Now! Before it is too late');
    else if (!s.chutes.mains) caption(alt > MAINS_WINDOW[0] ? 'DROGUES OUT' : 'DEPLOY THE MAINS!', alt > MAINS_WINDOW[0] ? 'Steady… the main chutes are next' : 'Now: three big canopies');
    else if (sinceSplash < 0) caption('MAIN PARACHUTES!', late ? 'A rough ride, but they held' : 'Gently down to the sea');
    else if (sinceSplash < 2.5) caption(late ? 'HARD SPLASHDOWN!' : 'SPLASHDOWN!', `${name}'s crew is back on Earth`);
    else if (sinceSplash < SHIP_AFTER) caption('FLOTATION BAGS UP', 'The recovery ship is on its way');
    else caption('MISSION ACCOMPLISHED!', `To the Moon and back: welcome home, crew of ${name}!`);
    if (sinceSplash > END_AFTER && !r.done) {
      r.done = true;
      s.splashed();
    }

    // the camera follows the capsule; at the sea it frames the capsule and the ship
    const base = Math.min(size.height / 900, size.width / 1300);
    camera.zoom = base * (sinceSplash > 0 ? lerp(1.1, 0.8, smooth(sinceSplash / 4)) : 1.1);
    camera.updateProjectionMatrix();
    const viewH = size.height / camera.zoom;
    camera.position.x = sinceSplash > 0 ? lerp(0, 220, smooth(sinceSplash / 5)) : 0;
    camera.position.y = Math.max(viewH * 0.3, cy + (r.drogueAt >= 0 && sinceSplash < 1 ? 200 : 120));
    camera.position.z = 100;
  });

  return (
    <>
      <SkyGradient colors={sky} />
      <StarField opacity={stars} />
      <group ref={earth}>
        <mesh position={[0, 0, -0.5]}><circleGeometry args={[6080, 120]} /><meshBasicMaterial color="#8fd0ff" transparent opacity={0.45} toneMapped={false} /></mesh>
        <mesh><circleGeometry args={[6000, 120]} /><meshBasicMaterial color="#2f6fb3" toneMapped={false} /></mesh>
        <mesh position={[-1200, 5800, 0.2]} scale={[1, 0.15, 1]}><circleGeometry args={[800, 40]} /><meshBasicMaterial color="#4f9b5a" toneMapped={false} /></mesh>
        <mesh position={[300, 5900, 0.3]} scale={[1, 0.1, 1]}><circleGeometry args={[900, 40]} /><meshBasicMaterial color="#f4f6f8" transparent opacity={0.8} toneMapped={false} /></mesh>
      </group>
      {clouds.map((c, i) => <Sprite key={i} texture={tex.cloud} width={300 * c.s} height={130 * c.s} position={[c.x, c.y, -40 + i * 0.1]} opacity={0.9} />)}
      {/* the sea */}
      <Poly pts={rect(-8000, -4000, 8000, 0)} color="#5aa0de" z={-20} outline={false} />
      <Poly pts={rect(-8000, -4000, 8000, -40)} color="#4a90d0" z={-19.9} outline={false} />
      <group ref={waves} position={[0, 0, 12]}>
        {Array.from({ length: 70 }, (_, i) => <Stroke key={i} pts={[-7000 + i * 200, -12 - (i % 3) * 14, -6960 + i * 200, -6 - (i % 3) * 14, -6920 + i * 200, -12 - (i % 3) * 14]} width={3} color="#e4f3ff" />)}
      </group>
      <Ship ref={ship} />
      <Smoke texture={tex.smoke} emitters={emitters} max={80} z={11} />
      <Sprite ref={glow} texture={tex.glow} width={260} height={200} visible={false} opacity={0.95} />
      <group ref={station} scale={[0.22, 0.22, 1]}><Station /></group>
      <Sprite ref={burn} texture={tex.flame} width={44} height={150} anchor={[0.5, 0.03]} visible={false} />
      {/* the rest of the shuttle, left behind at separation */}
      <group ref={service}>
        <group scale={[CS, CS, 1]} position={[0, -SHIELD_Y * CS - FLOAT, 0]}>
          <RocketMesh design={design} parts={SERVICE} />
        </group>
      </group>
      <Chutes refDrogue={drogues} refMains={mains} />
      <group ref={bags} visible={false}>
        {[-40, 0, 40].map((x) => <Poly key={x} pts={circlePts(x, 14, 18, 16)} color="#f08a3c" />)}
      </group>
      <group ref={capsule}>
        <group scale={[CS, CS, 1]} position={[0, -SHIELD_Y * CS - FLOAT, 0]}>
          <RocketMesh design={design} parts={CAPSULE} />
        </group>
      </group>
    </>
  );
}

/** Two drogue chutes, and the three big striped main chutes. */
function Chutes({ refDrogue, refMains }: { refDrogue: React.RefObject<THREE.Group | null>; refMains: React.RefObject<THREE.Group | null> }) {
  const canopy = (w: number, h: number, color: string, stripe: string) => (
    <>
      <Poly pts={[-w, 0, -w * 0.85, h * 0.5, -w * 0.45, h * 0.88, 0, h, w * 0.45, h * 0.88, w * 0.85, h * 0.5, w, 0, w * 0.6, h * 0.12, 0, h * 0.16, -w * 0.6, h * 0.12]} color={color} />
      <Poly pts={[-w * 0.3, h * 0.14, -w * 0.16, h * 0.96, w * 0.16, h * 0.96, w * 0.3, h * 0.14]} color={stripe} outline={false} z={0.05} />
    </>
  );
  return (
    <>
      <group ref={refDrogue} visible={false}>
        {[-1, 1].map((d) => (
          <group key={d} position={[d * 60, 0, 0]}>
            {canopy(42, 50, '#f08a3c', '#f7f4ee')}
            <Stroke pts={[-40, 0, -d * 60, -190, 40, 0]} width={2} color="#e8e2d6" z={-0.1} />
          </group>
        ))}
      </group>
      <group ref={refMains} visible={false}>
        {[-1, 0, 1].map((d) => (
          <group key={d} position={[d * 230, d === 0 ? 30 : 0, -0.2 * Math.abs(d)]}>
            {canopy(120, 120, d === 0 ? '#f7f4ee' : '#f08a3c', d === 0 ? '#f08a3c' : '#f7f4ee')}
            <Stroke pts={[-110, 0, -d * 230, -240, 110, 0]} width={2} color="#e8e2d6" z={-0.1} />
          </group>
        ))}
      </group>
    </>
  );
}

/** The recovery ship: hull, deck, bridge and crane. */
const Ship = ({ ref }: { ref: React.RefObject<THREE.Group | null> }) => (
  <group ref={ref}>
    <Poly pts={[-340, -40, 300, -40, 380, 60, -360, 60]} color="#8f99a6" z={0} />
    <Poly pts={rect(-360, 40, 380, 60)} color="#b5473a" z={0.05} outline={false} />
    <Poly pts={rect(-200, 60, 60, 170)} color="#e9e5dc" z={0.1} />
    <Poly pts={rect(-120, 170, 20, 230)} color="#e9e5dc" z={0.15} />
    {[-170, -120, -70, -20, 30].map((x) => <Poly key={x} pts={rect(x, 120, x + 30, 145)} color="#4f7fd6" z={0.2} outline={false} />)}
    <Stroke pts={[160, 60, 160, 240, 300, 180]} width={8} color="#f2c13d" z={0.2} />
    <Stroke pts={[-60, 230, -60, 300]} width={4} color="#9aa0a8" z={0.2} />
  </group>
);
