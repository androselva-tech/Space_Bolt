import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { useTextures } from '../scene/useTextures';
import { TEXTURES } from '../assets';
import { gameStore, useGame } from '../game/store';
import { PICKUP_R, WALK_SPEED, rng, type MoonField } from '../game/rules';
import { partBox, type PartId, type RocketDesign } from '../rocket/model';
import { RocketMesh, UPPER_STAGE } from '../rocket/RocketMesh';
import { moonHeight, moonShade } from './terrain';
import { walkInput, walkStore, type Marker } from './walkState';

type Tex = Record<keyof typeof TEXTURES, THREE.Texture>;
export type StageRect = { x: number; y: number; w: number; h: number };

/** How far the ground runs in each direction (it curves away below the horizon long before). */
const EXTENT = 9000;
const GRID = 240;
/** The astronaut's footprint for bumping into boulders, and the camera's place behind and above them. */
const BODY_R = 26;
const CAM_BACK = 760;
const CAM_UP = 430;
/** How big a part stands on the ground. */
const PART_SIZE = 170;

type Run = {
  x: number; y: number; h: number; vx: number; vy: number; face: number; t: number;
  hop: number; lastStep: number; stuck: number; readAt: number; cam: THREE.Vector3; ready: boolean;
};

export function MoonWalk3D({ stage }: { stage: StageRect }) {
  return (
    <Suspense fallback={null}>
      <Walk stage={stage} />
    </Suspense>
  );
}

/**
 * The Moon walk in 3D. Rolling grey ground full of craters runs to a curved horizon under a black
 * sky with the Earth hanging in it; the low Sun throws hard light. The astronaut bounds along in
 * one-sixth gravity, leaving footprints and puffs of dust; the camera follows from behind. The
 * shuttle's parts lie out there, each under a tall beacon of light; arrows at the edge of the view
 * point to the ones out of sight.
 */
function Walk({ stage }: { stage: StageRect }) {
  const tex = useTextures(TEXTURES) as Tex;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const field = useGame((s) => s.walk?.field) as MoonField;
  const found = useGame((s) => s.walk?.found ?? []);
  const design = useGame((s) => s.design);
  const height = (x: number, y: number) => moonHeight(field, x, y);
  const run = useRef<Run>({ x: 0, y: -260, h: 0, vx: 0, vy: 0, face: 0, t: 0, hop: 0, lastStep: 0, stuck: 0, readAt: 0, cam: new THREE.Vector3(), ready: false });
  const astro = useRef<THREE.Group>(null);
  const limbs = { legL: useRef<THREE.Group>(null), legR: useRef<THREE.Group>(null), armL: useRef<THREE.Group>(null), armR: useRef<THREE.Group>(null) };
  const partRefs = useRef<Array<THREE.Group | null>>([]);
  const beaconRefs = useRef<Array<THREE.Mesh | null>>([]);
  const prints = useRef<Array<THREE.Mesh | null>>([]);
  const printAt = useRef(0);
  const dust = useRef<Array<THREE.Sprite | null>>([]);
  const dustAge = useRef<number[]>(Array(14).fill(9));
  const lander = useRef<THREE.Group>(null);
  useEffect(() => {
    if (__DEV__) (globalThis as { __walk?: unknown }).__walk = run;
    return () => { walkInput.x = 0; walkInput.y = 0; };
  }, []);

  // the ground: a grid denser near the middle, lifted by the terrain, shaded and textured
  const ground = useMemo(() => {
    const n = GRID + 1;
    const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), col = new Float32Array(n * n * 3);
    const idx: number[] = [];
    const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.75) * EXTENT;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const fx = warp((i / GRID) * 2 - 1), fy = warp((j / GRID) * 2 - 1);
      pos[k * 3] = fx; pos[k * 3 + 1] = height(fx, fy); pos[k * 3 + 2] = -fy;
      uv[k * 2] = fx / 420; uv[k * 2 + 1] = fy / 420;
      const c = moonShade(field, fx, fy);
      col[k * 3] = c; col[k * 3 + 1] = c; col[k * 3 + 2] = c * 1.02;
      if (i < GRID && j < GRID) idx.push(k, k + 1, k + n, k + 1, k + n + 1, k + n);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [field]);
  const groundTex = useMemo(() => {
    const t = tex.moonGround.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [tex]);
  const earthTex = useMemo(() => { const t = tex.earth.clone(); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }, [tex]);

  // boulders: lumpy rocks, half sunk in the dust
  const rocks = useMemo(() => field.boulders.map((b, i) => {
    const r = rng(900 + i);
    // a round rock with a few big lumps (smooth noise over the sphere, so no crystal facets)
    const g = new THREE.IcosahedronGeometry(1, 3);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const bumps = Array.from({ length: 5 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, 0.15 + r() * 0.25]);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      let s = 1;
      for (const [bx, by, bz, a] of bumps) s += a * Math.max(0, x * bx + y * by + z * bz) ** 2 * 0.5;
      s += Math.sin(x * 7 + i) * Math.sin(z * 6) * 0.04;
      p.setXYZ(k, x * s, y * s * 0.72, z * s);
    }
    g.computeVertexNormals();
    return { g, x: b.x, y: b.y, r: b.r, h: height(b.x, b.y), rot: r() * 6 };
  }), [field]);

  const stars = useMemo(() => {
    const r = rng(31);
    const p: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const a = r() * Math.PI * 2, e = 0.02 + r() * 1.5;
      p.push(Math.cos(a) * Math.cos(e) * 20000, Math.sin(e) * 20000, Math.sin(a) * Math.cos(e) * 20000);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);

  const legsOut = useRef(1);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = gameStore.getState();
    const w = s.walk;
    const r = run.current;
    if (!w) return;
    const W = size.width, H = size.height;
    // the stage area is the centre of the view (the question panel covers the rest)
    const scx = (stage.x + stage.w / 2) * W, scy = (stage.y + stage.h * 0.58) * H;
    camera.setViewOffset(W, H, -(scx - W / 2), -(scy - H / 2), W, H);
    camera.updateProjectionMatrix();

    const live = !s.paused;
    if (live) r.t += dt;
    const free = live && s.phase === 'moonwalk' && s.status === 'playing' && !w.target && !s.quiz;
    const left = field.parts.filter((p) => !w.found.includes(p.part));
    const nearest = left.reduce<{ part: PartId; x: number; y: number; d: number } | null>((best, p) => {
      const d = Math.hypot(p.x - r.x, p.y - r.y);
      return !best || d < best.d ? { ...p, d } : best;
    }, null);

    // --- where to go: the stick or the keys (up = away from the camera), or the dev autopilot
    let ix = walkInput.x + walkInput.keys.x, iy = walkInput.y + walkInput.keys.y;
    if (__DEV__ && (globalThis as { __autopilot?: boolean }).__autopilot && nearest) {
      ix = nearest.x - r.x; iy = nearest.y - r.y;
      const len = Math.hypot(ix, iy) || 1;
      ix /= len; iy /= len;
      for (const b of field.boulders) {
        const bx = b.x - r.x, by = b.y - r.y;
        const along = bx * ix + by * iy, side = bx * iy - by * ix;
        if (along > 0 && along < b.r + 200 && Math.abs(side) < b.r + BODY_R + 30) {
          const turn = side > 0 ? -1 : 1;
          [ix, iy] = [ix * 0.4 + -iy * turn, iy * 0.4 + ix * turn];
          break;
        }
      }
      if (r.stuck > 0.6) [ix, iy] = [-iy, ix];
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    const want = free ? WALK_SPEED : 0;
    r.vx += (ix * want - r.vx) * Math.min(1, dt * 4);
    r.vy += (iy * want - r.vy) * Math.min(1, dt * 4);
    const px = r.x, py = r.y;
    if (live) {
      // uphill is slow going, downhill a little quicker
      const step = Math.hypot(r.vx, r.vy) * dt;
      const h0 = height(r.x, r.y);
      const ahead = step > 0.01 ? height(r.x + (r.vx * dt) / step * 40, r.y + (r.vy * dt) / step * 40) : h0;
      const slope = Math.max(0.35, Math.min(1.25, 1 - ((ahead - h0) / 40) * 1.6));
      r.x += r.vx * dt * slope; r.y += r.vy * dt * slope;
      for (const b of field.boulders) {
        const dx = r.x - b.x, dy = r.y - b.y, d = Math.hypot(dx, dy), min = b.r * 0.95 + BODY_R;
        if (d < min && d > 0.001) { r.x = b.x + (dx / d) * min; r.y = b.y + (dy / d) * min; }
      }
      const fromMid = Math.hypot(r.x, r.y);
      if (fromMid > field.radius) { r.x *= field.radius / fromMid; r.y *= field.radius / fromMid; }
    }
    const moved = Math.hypot(r.x - px, r.y - py);
    const speed = live ? moved / Math.max(dt, 0.001) : 0;
    r.stuck = free && len > 0.3 && speed < WALK_SPEED * 0.2 ? r.stuck + dt : Math.max(0, r.stuck - dt * 2);
    const moving = speed > 30;
    // the model faces +z; turn it to the way it's going (world direction: x east, -z north)
    if (moving) r.face = Math.atan2(r.vx, -r.vy);

    // the low-gravity lope: long, slow bounds; footprints and a puff of dust at each landing
    if (moving) r.hop += dt * 2.2;
    else r.hop += (Math.round(r.hop) - r.hop) * Math.min(1, dt * 6);
    const lift = Math.abs(Math.sin(r.hop * Math.PI)) * 34;
    r.h = height(r.x, r.y);
    if (moving && Math.floor(r.hop) !== r.lastStep) {
      r.lastStep = Math.floor(r.hop);
      const k = printAt.current++ % prints.current.length;
      const fp = prints.current[k];
      if (fp) {
        const side = r.lastStep % 2 ? 1 : -1;
        const ox = Math.cos(r.face) * 12 * side, oy = Math.sin(r.face) * 12 * side;
        fp.visible = true;
        fp.position.set(r.x + ox, r.h + 1.2, -(r.y + oy));
        fp.rotation.set(-Math.PI / 2, 0, -r.face);
      }
      const d = dustAge.current.findIndex((a) => a > 1.2);
      if (d >= 0) {
        dustAge.current[d] = 0;
        dust.current[d]?.position.set(r.x, r.h + 10, -r.y);
      }
    }
    dust.current.forEach((sp, i) => {
      if (!sp) return;
      const a = (dustAge.current[i] += live ? dt : 0);
      sp.visible = a < 1.2;
      if (!sp.visible) return;
      sp.scale.setScalar(30 + a * 90);
      sp.position.y += dt * 14;
      (sp.material as THREE.SpriteMaterial).opacity = 0.45 * (1 - a / 1.2);
    });

    // picking a part up: walk onto it
    if (free && nearest && nearest.d < PICKUP_R) s.reachPart(nearest.part);

    // --- the astronaut ----------------------------------------------------------------------------
    const a = astro.current;
    if (a) {
      a.position.set(r.x, r.h + lift, -r.y);
      a.rotation.y += (((r.face - a.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 8);
      const swing = moving ? Math.sin(r.hop * Math.PI * 2) * 0.55 : 0;
      if (limbs.legL.current) limbs.legL.current.rotation.x = swing;
      if (limbs.legR.current) limbs.legR.current.rotation.x = -swing;
      if (limbs.armL.current) limbs.armL.current.rotation.x = -swing * 0.8;
      if (limbs.armR.current) limbs.armR.current.rotation.x = swing * 0.8;
    }

    // --- the camera follows from behind and above, never inside a hill ---------------------------
    const target = new THREE.Vector3(r.x, r.h + CAM_UP, -r.y + CAM_BACK);
    target.y = Math.max(target.y, height(r.x, r.y - CAM_BACK) + 160);
    if (!r.ready) { r.cam.copy(target); r.ready = true; }
    r.cam.lerp(target, Math.min(1, dt * 3));
    camera.position.copy(r.cam);
    camera.lookAt(r.x, r.h + 150, -r.y - 420);

    // parts face the camera, their beacons pulse
    field.parts.forEach((p, i) => {
      const g = partRefs.current[i];
      const gone = w.found.includes(p.part);
      if (g) {
        g.visible = !gone;
        g.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z + p.y);
      }
      const b = beaconRefs.current[i];
      if (b) {
        b.visible = !gone;
        (b.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(r.t * 3 + i) * 0.06;
      }
    });
    if (lander.current) lander.current.rotation.y = Math.atan2(camera.position.x, camera.position.z);

    // --- readouts for the overlay: position, nearest part, arrows to the parts out of sight -----------
    if (r.t - r.readAt > 0.12) {
      r.readAt = r.t;
      const markers: Marker[] = [];
      const sw = stage.w * W, sh = stage.h * H;
      for (const p of left) {
        const v = new THREE.Vector3(p.x, height(p.x, p.y) + 80, -p.y).project(camera);
        // camera space: behind the camera the projection flips
        const behind = v.z > 1;
        let sx = (v.x * 0.5 + 0.5) * W - stage.x * W, sy = (-v.y * 0.5 + 0.5) * H - stage.y * H;
        if (behind) { sx = sw - sx; sy = sh; }
        const on = !behind && sx > 30 && sx < sw - 30 && sy > 60 && sy < sh - 30;
        if (on) continue;
        const cx = sw / 2, cy = sh / 2;
        const ang = Math.atan2(sy - cy, sx - cx);
        const k = Math.min((sw / 2 - 34) / Math.max(1, Math.abs(Math.cos(ang)) * 1000), (sh / 2 - 44) / Math.max(1, Math.abs(Math.sin(ang)) * 1000)) * 1000;
        markers.push({ part: p.part, x: cx + Math.cos(ang) * k, y: cy + Math.sin(ang) * k, angle: ang, dist: Math.hypot(p.x - r.x, p.y - r.y) });
      }
      walkStore.setState({ x: Math.round(r.x), y: Math.round(r.y), nearest: nearest ? { part: nearest.part, dist: Math.round(nearest.d) } : null, markers });
    }
  });

  const flagH = height(260, 60);
  return (
    <>
      <color attach="background" args={['#000002']} />
      <ambientLight intensity={0.16} />
      <hemisphereLight args={['#9fb8ff', '#000000', 0.22]} />
      <directionalLight position={[-3000, 1500, 1200]} intensity={3.2} color="#fff4e2" />
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={0.9} depthWrite={false} />
      </points>
      <sprite position={[3600, 2300, -16000]} scale={[2200, 2200, 1]}>
        <spriteMaterial map={earthTex} depthWrite={false} />
      </sprite>
      <sprite position={[-16000, 1800, -9000]} scale={[2600, 2600, 1]}>
        <spriteMaterial map={tex.glow} color="#fff3d0" transparent opacity={0.9} depthWrite={false} />
      </sprite>
      <mesh geometry={ground}>
        <meshStandardMaterial map={groundTex} vertexColors roughness={1} metalness={0} />
      </mesh>
      {rocks.map((b, i) => (
        <mesh key={i} geometry={b.g} position={[b.x, b.h - b.r * 0.25, -b.y]} scale={[b.r, b.r, b.r]} rotation={[0, b.rot, 0]}>
          <meshStandardMaterial color="#8f8c88" roughness={1} />
        </mesh>
      ))}
      {/* the old lander from Earth, where we came down, and our flag */}
      <group position={[-40, height(-40, 40), -40]}>
        <group ref={lander}>
          <group scale={[0.42, 0.42, 1]} position={[0, -304 * 0.42, 0]}>
            <RocketMesh design={design} parts={UPPER_STAGE} legs={legsOut} />
          </group>
        </group>
      </group>
      <group position={[260, flagH, -60]}>
        <mesh position={[0, 110, 0]}><cylinderGeometry args={[2.5, 2.5, 220, 8]} /><meshStandardMaterial color="#d8dce2" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[48, 190, 0]}><planeGeometry args={[96, 56]} /><meshStandardMaterial color={design.trim} side={THREE.DoubleSide} /></mesh>
        <mesh position={[40, 196, 0.5]}><planeGeometry args={[60, 18]} /><meshStandardMaterial color={design.body} side={THREE.DoubleSide} /></mesh>
      </group>
      {/* the parts, each under a beacon */}
      {field.parts.map((p, i) => {
        const h = height(p.x, p.y);
        return (
          <group key={p.part}>
            <group ref={(g) => { partRefs.current[i] = g; }} position={[p.x, h, -p.y]} visible={!found.includes(p.part)}>
              <PartStanding part={p.part} design={design} />
            </group>
            <mesh ref={(m) => { beaconRefs.current[i] = m; }} position={[p.x, h + 700, -p.y]}>
              <cylinderGeometry args={[16, 30, 1400, 16, 1, true]} />
              <meshBasicMaterial color="#ffd45c" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[p.x, h + 2, -p.y]} rotation={[-Math.PI / 2, 0, 0]} visible={!found.includes(p.part)}>
              <ringGeometry args={[PICKUP_R * 0.85, PICKUP_R, 40]} />
              <meshBasicMaterial color="#ffd45c" transparent opacity={0.7} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: 160 }, (_, i) => (
        <mesh key={i} ref={(m) => { prints.current[i] = m; }} visible={false}>
          <circleGeometry args={[9, 10]} />
          <meshBasicMaterial color="#3c3c40" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <sprite key={i} ref={(sp) => { dust.current[i] = sp; }} visible={false}>
          <spriteMaterial map={tex.smoke} color="#b9b9bd" transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
      <Astronaut ref={astro} limbs={limbs} />
    </>
  );
}

/** A part standing on the ground (it turns to face the camera), fitted into a box PART_SIZE tall. */
function PartStanding({ part, design }: { part: PartId; design: RocketDesign }) {
  const b = useMemo(() => partBox(part), [part]);
  const k = PART_SIZE / Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const parts = useMemo(() => [part], [part]);
  return (
    <group scale={[k, k, k]} position={[0, 4, 0]}>
      <group position={[-(b.x0 + b.x1) / 2, -b.y0, 0]}>
        <RocketMesh design={design} parts={parts} />
      </group>
    </group>
  );
}

type Limbs = { legL: React.RefObject<THREE.Group | null>; legR: React.RefObject<THREE.Group | null>; armL: React.RefObject<THREE.Group | null>; armR: React.RefObject<THREE.Group | null> };

/** The astronaut: white suit, gold visor, life-support backpack; legs and arms swing as they lope. */
function Astronaut({ ref, limbs }: { ref: React.RefObject<THREE.Group | null>; limbs: Limbs }) {
  const suit = <meshStandardMaterial color="#f2f0ea" roughness={0.75} />;
  const grey = <meshStandardMaterial color="#9a9ca3" roughness={0.6} />;
  const boot = <meshStandardMaterial color="#55575d" roughness={0.9} />;
  const limb = (side: number, arm: boolean, r: React.RefObject<THREE.Group | null>) => (
    <group ref={r} position={[side * (arm ? 34 : 13), arm ? 142 : 78, 0]}>
      <mesh position={[0, arm ? -30 : -36, 0]}>
        <capsuleGeometry args={[arm ? 9 : 12, arm ? 44 : 50, 4, 10]} />
        {suit}
      </mesh>
      {!arm && <mesh position={[0, -74, 6]}><boxGeometry args={[22, 12, 32]} />{boot}</mesh>}
      {arm && <mesh position={[0, -62, 0]}><sphereGeometry args={[9, 10, 8]} />{grey}</mesh>}
    </group>
  );
  return (
    <group ref={ref}>
      {limb(-1, false, limbs.legL)}{limb(1, false, limbs.legR)}
      <mesh position={[0, 112, 0]}><capsuleGeometry args={[30, 44, 6, 14]} />{suit}</mesh>
      <mesh position={[0, 122, -30]}><boxGeometry args={[52, 64, 26]} />{grey}</mesh>
      <mesh position={[0, 108, 28]}><boxGeometry args={[30, 20, 8]} />{grey}</mesh>
      {limb(-1, true, limbs.armL)}{limb(1, true, limbs.armR)}
      <mesh position={[0, 172, 0]}><sphereGeometry args={[27, 20, 16]} />{suit}</mesh>
      <mesh position={[0, 172, 12]} scale={[1, 0.85, 0.75]}>
        <sphereGeometry args={[22, 20, 16]} />
        <meshStandardMaterial color="#d9a521" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}
