import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { TEXTURES } from '../assets';
import { gameStore } from '../game/store';
import { DOCK, rng, stationSpin } from '../game/rules';
import { setMotionSound } from '../audio/sfx';
import { dockInput, dockStore } from './dockState';

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;
export type StageRect = { x: number; y: number; w: number; h: number };

/** The station's size (metres): the wheel's radius, the hub, the docking slot. */
const RING_R = 22;
const MODULES = 12;
const HUB_R = 4;
const HUB_FRONT = 4;
/** How hard the controls push: spin (deg/s²), thrust (m/s²), side thrusters (m/s²). */
const SPIN_ACCEL = 6;
const THRUST_ACCEL = 2;
const SIDE_ACCEL = 1.2;

type Run = {
  range: number; v: number; capAngle: number; capSpin: number; stAngle: number;
  ox: number; oy: number; vx: number; vy: number; t: number; readAt: number; tries: number; contact: boolean;
};
const freshRun = (tries: number, seed: number): Run => {
  const r = rng(seed + tries * 17);
  return {
    range: tries ? 120 : DOCK.start, v: 0, capAngle: 0, capSpin: 0, stAngle: 30 + r() * 90,
    // the shuttle comes in off centre and drifting: the side thrusters have to correct it
    ox: (r() < 0.5 ? -1 : 1) * (8 + r() * 8), oy: (r() < 0.5 ? -1 : 1) * (5 + r() * 6),
    vx: (r() - 0.5) * 0.6, vy: (r() - 0.5) * 0.6, t: 0, readAt: 0, tries, contact: false,
  };
};

/** The slot looks the same either way round: fold the angle to -90..90. */
const slotError = (deg: number) => {
  const a = ((deg % 180) + 180) % 180;
  return a > 90 ? a - 180 : a;
};

export function Dock3D({ stage }: { stage: StageRect }) {
  return (
    <Suspense fallback={null}>
      <Docking stage={stage} />
    </Suspense>
  );
}

/**
 * Docking, seen from the shuttle's cockpit, like the scene in Interstellar: the station is a
 * wheel of modules spinning in front of us, over the glowing edge of the Earth. Roll the shuttle
 * to match its spin (it stops turning on screen), line its slot up, fire the side thrusters to
 * stay centred (nothing slows a drift in space), and touch the port at walking pace or slower.
 */
function Docking({ stage }: { stage: StageRect }) {
  const tex = useTextures(TEXTURES) as Tex;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const info = gameStore.getState().stage!;
  const spin = stationSpin(info);
  const run = useRef<Run>(freshRun(0, info.n));
  const station = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Points>(null);
  const limb = useRef<THREE.Mesh>(null);
  const lights = useRef<Array<THREE.Mesh | null>>([]);
  useEffect(() => {
    if (__DEV__) (globalThis as { __dock?: unknown }).__dock = run;
    return () => { dockInput.spin = 0; dockInput.thrust = 0; dockInput.mx = 0; dockInput.my = 0; setMotionSound(null); };
  }, []);
  const limbTex = useMemo(() => { const t = tex.limbEarth.clone(); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }, [tex]);

  const starGeo = useMemo(() => {
    const r = rng(4242);
    const p: number[] = [];
    for (let i = 0; i < 1600; i++) {
      const a = r() * Math.PI * 2, e = (r() - 0.5) * Math.PI;
      p.push(Math.cos(a) * Math.cos(e) * 4000, Math.sin(e) * 4000, -Math.abs(Math.sin(a) * Math.cos(e) * 4000) - 200);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = gameStore.getState();
    let r = run.current;
    if (s.dockTries !== r.tries && !s.dockResult) r = run.current = freshRun(s.dockTries, info.n);
    const live = s.phase === 'dock' && s.status === 'playing' && !s.docked && !s.dockResult && !s.paused;
    if (!s.paused) { r.t += dt; r.stAngle += spin * dt; }

    // dev builds: the autopilot docks by itself (e2e playthrough)
    if (__DEV__ && (globalThis as { __autopilot?: boolean }).__autopilot && live) {
      const err = slotError(r.stAngle - r.capAngle);
      const wantSpin = spin + Math.max(-4, Math.min(4, err * 0.6));
      dockInput.spin = Math.abs(wantSpin - r.capSpin) > 0.3 ? (wantSpin > r.capSpin ? 1 : -1) : 0;
      const side = (o: number, v: number) => { const want = -o * 0.35 - v * 1.2; return Math.abs(want) > 0.08 ? (want > 0 ? 1 : -1) : 0; };
      dockInput.mx = side(r.ox, r.vx) as -1 | 0 | 1;
      dockInput.my = side(r.oy, r.vy) as -1 | 0 | 1;
      const ready = Math.abs(err) < 3 && Math.abs(r.capSpin - spin) < 1 && Math.hypot(r.ox, r.oy) < 1;
      const wantV = r.range > 80 ? (ready ? 9 : 4) : r.range > 20 ? (ready ? 3 : 0.5) : ready ? 0.8 : 0;
      dockInput.thrust = Math.abs(wantV - r.v) > 0.15 ? (wantV > r.v ? 1 : -1) : 0;
    }

    if (live) {
      r.capSpin += dockInput.spin * SPIN_ACCEL * dt;
      r.v = Math.max(-3, Math.min(DOCK.maxSpeed, r.v + dockInput.thrust * THRUST_ACCEL * dt));
      r.vx += dockInput.mx * SIDE_ACCEL * dt;
      r.vy += dockInput.my * SIDE_ACCEL * dt;
      r.ox += r.vx * dt; r.oy += r.vy * dt;
      r.range = Math.max(0, r.range - r.v * dt);
    }
    if (!s.paused) r.capAngle += r.capSpin * dt;
    const err = slotError(r.stAngle - r.capAngle);
    const spinDiff = r.capSpin - spin;
    const offset = Math.hypot(r.ox, r.oy);
    const okSpin = Math.abs(spinDiff) < DOCK.spinTol;
    const okAlign = Math.abs(err) < DOCK.alignTol;
    const okSpeed = r.v < DOCK.speedTol;
    const okOffset = offset < DOCK.offsetTol;
    if (live && r.range <= 0 && !r.contact) {
      r.contact = true;
      const ok = okSpin && okAlign && okSpeed && okOffset;
      const why = !okSpeed ? `Too fast: ${r.v.toFixed(1)} m/s (touch at under ${DOCK.speedTol} m/s)`
        : !okOffset ? `Off centre by ${offset.toFixed(1)} m: the probe missed the port`
        : !okSpin ? `Spin not matched (${spinDiff > 0 ? '+' : ''}${spinDiff.toFixed(1)}°/s): the station twisted away`
        : !okAlign ? `The slot was turned ${Math.round(err)}°: the probe couldn't lock` : '';
      if (ok) { r.v = 0; r.capSpin = spin; }
      else { r.v = -1.5; r.range = 0.5; }
      s.dockContact(ok, why);
    }
    if (s.docked) { r.capAngle = r.stAngle - err * Math.max(0, 1 - dt * 3); r.capSpin = spin; }
    if (!live && s.dockResult && !s.dockResult.ok && !s.paused) { r.range = Math.min(40, r.range + 1.5 * dt); }
    setMotionSound(live && (dockInput.thrust !== 0 || dockInput.spin !== 0 || dockInput.mx !== 0 || dockInput.my !== 0) ? 'jet' : null);

    // --- the view from the cockpit: the station turns by the difference between its spin and ours ---
    const W = size.width, H = size.height;
    const scx = (stage.x + stage.w / 2) * W, scy = (stage.y + stage.h * 0.55) * H;
    camera.setViewOffset(W, H, -(scx - W / 2), -(scy - H / 2), W, H);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
    const g = station.current;
    if (g) {
      g.position.set(-r.ox, -r.oy, -(r.range + HUB_FRONT + 3));
      g.rotation.z = THREE.MathUtils.degToRad(r.stAngle - r.capAngle);
    }
    if (stars.current) stars.current.rotation.z = THREE.MathUtils.degToRad(-r.capAngle);
    if (limb.current) {
      const a = THREE.MathUtils.degToRad(-r.capAngle);
      limb.current.position.set(Math.sin(a) * 900, -Math.cos(a) * 900, -2600);
      limb.current.rotation.z = a;
    }
    lights.current.forEach((m, i) => { if (m) m.visible = Math.floor(r.t * 2 + i * 0.5) % 2 === 0; });

    if (r.t - r.readAt > 0.1) {
      r.readAt = r.t;
      const p = new THREE.Vector3(-r.ox, -r.oy, -(r.range + 3)).project(camera);
      const px = ((p.x * 0.5 + 0.5) * W - stage.x * W) / (stage.w * W), py = ((-p.y * 0.5 + 0.5) * H - stage.y * H) / (stage.h * H);
      dockStore.setState({
        range: Math.round(r.range * 10) / 10, speed: Math.round(r.v * 10) / 10, spinDiff: Math.round(spinDiff * 10) / 10,
        align: Math.round(err), offset: Math.round(offset * 10) / 10, okSpin, okAlign, okSpeed, okOffset,
        portX: Math.max(0.02, Math.min(0.98, px)), portY: Math.max(0.05, Math.min(0.95, py)),
      });
    }
  });

  return (
    <>
      <color attach="background" args={['#010208']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-60, 40, 50]} intensity={3} color="#fff4e6" />
      <directionalLight position={[30, -60, -20]} intensity={0.5} color="#6fa8ff" />
      <points ref={stars} geometry={starGeo}>
        <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={0.9} depthWrite={false} />
      </points>
      <mesh ref={limb}>
        <planeGeometry args={[4800, 1400]} />
        <meshBasicMaterial map={limbTex} transparent depthWrite={false} />
      </mesh>
      <group ref={station}><Station lights={lights} /></group>
    </>
  );
}

/**
 * The station, modelled after the ship in Interstellar: twelve modules in a ring, joined by short
 * tubes, four spokes to the hub, two long radiator wings, and the docking port on the hub's face
 * (a ring with a slot across it, red and green lights at its ends).
 */
function Station({ lights }: { lights: React.RefObject<Array<THREE.Mesh | null>> }) {
  const hull = <meshStandardMaterial color="#d9dde3" metalness={0.55} roughness={0.42} />;
  const dark = <meshStandardMaterial color="#5b616b" metalness={0.6} roughness={0.5} />;
  const glass = <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.2} />;
  const modules = useMemo(() => Array.from({ length: MODULES }, (_, i) => (i / MODULES) * Math.PI * 2), []);
  return (
    <group>
      {modules.map((a, i) => (
        <group key={i} position={[Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0]} rotation={[0, 0, a + Math.PI / 2]}>
          <mesh><boxGeometry args={[8.5, 4.2, 5.2]} />{i % 3 === 0 ? dark : hull}</mesh>
          <mesh position={[0, 0, 2.65]}><boxGeometry args={[6, 1.1, 0.12]} />{glass}</mesh>
          <mesh position={[5.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.1, 1.1, 2.8, 12]} />{dark}</mesh>
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2 + Math.PI / 4]} position={[Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (RING_R / 2 + 1), Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (RING_R / 2 + 1), 0]}>
          <boxGeometry args={[RING_R - 4, 0.9, 0.9]} />{dark}
        </mesh>
      ))}
      {/* radiator wings along one spoke line */}
      {[-1, 1].map((d) => (
        <mesh key={d} position={[0, d * (RING_R + 9), -1]}>
          <boxGeometry args={[7, 14, 0.25]} />
          <meshStandardMaterial color="#2b4f9e" metalness={0.3} roughness={0.35} emissive="#0a1a3a" />
        </mesh>
      ))}
      {/* the hub and its docking port */}
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[HUB_R, HUB_R, HUB_FRONT * 2, 28]} />{hull}</mesh>
      <mesh position={[0, 0, HUB_FRONT]}><torusGeometry args={[HUB_R * 0.8, 0.35, 10, 32]} />{dark}</mesh>
      <mesh position={[0, 0, HUB_FRONT + 0.05]}><circleGeometry args={[HUB_R * 0.78, 32]} /><meshStandardMaterial color="#9aa2ad" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 0, HUB_FRONT + 0.12]}><boxGeometry args={[HUB_R * 1.3, 0.75, 0.1]} /><meshStandardMaterial color="#0b0d14" /></mesh>
      <mesh position={[0, 0, HUB_FRONT + 0.1]}><boxGeometry args={[HUB_R * 1.42, 0.95, 0.05]} /><meshStandardMaterial color="#ffd45c" emissive="#a87a00" /></mesh>
      <mesh ref={(m) => { lights.current[0] = m; }} position={[HUB_R * 0.95, 0, HUB_FRONT + 0.2]}><sphereGeometry args={[0.35, 10, 8]} /><meshBasicMaterial color="#7cff8a" /></mesh>
      <mesh ref={(m) => { lights.current[1] = m; }} position={[-HUB_R * 0.95, 0, HUB_FRONT + 0.2]}><sphereGeometry args={[0.35, 10, 8]} /><meshBasicMaterial color="#ff5a4a" /></mesh>
      {modules.filter((_, i) => i % 3 === 1).map((a, i) => (
        <mesh key={`l${i}`} ref={(m) => { lights.current[2 + i] = m; }} position={[Math.cos(a) * (RING_R + 2.4), Math.sin(a) * (RING_R + 2.4), 2.7]}>
          <sphereGeometry args={[0.3, 8, 6]} /><meshBasicMaterial color="#ff5a4a" />
        </mesh>
      ))}
    </group>
  );
}
