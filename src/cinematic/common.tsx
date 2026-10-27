import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '../scene/r3f';
import { Sprite } from '../scene/Sprite';
import { createInkLine } from '../scene/ink';

/** A sky that fades from `bottom` to `top` colour, always filling the view. Colours change through `colors.current`. */
export function SkyGradient({ colors }: { colors: React.RefObject<{ top: THREE.Color; bottom: THREE.Color }> }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(12).fill(1), 3));
    return g;
  }, []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const w = size.width / camera.zoom, h = size.height / camera.zoom;
    m.position.set(camera.position.x, camera.position.y, -95);
    m.scale.set(w + 40, h + 40, 1);
    const c = geometry.getAttribute('color') as THREE.BufferAttribute;
    const { top, bottom } = colors.current!;
    // plane vertices: 0,1 top; 2,3 bottom
    c.setXYZ(0, top.r, top.g, top.b); c.setXYZ(1, top.r, top.g, top.b);
    c.setXYZ(2, bottom.r, bottom.g, bottom.b); c.setXYZ(3, bottom.r, bottom.g, bottom.b);
    c.needsUpdate = true;
  });
  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshBasicMaterial vertexColors depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Stars around the camera (they show as the sky darkens: `opacity.current`). */
export function StarField({ opacity, count = 160 }: { opacity: React.RefObject<number>; count?: number }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const pts = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    let a = 99;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    const p: number[] = [];
    for (let i = 0; i < count; i++) p.push((r() - 0.5) * 4000, (r() - 0.5) * 3000, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, [count]);
  useFrame(() => {
    const m = pts.current;
    if (!m) return;
    m.position.set(camera.position.x * 0.9, camera.position.y * 0.9, -90);
    (m.material as THREE.PointsMaterial).opacity = opacity.current ?? 0;
    m.visible = (opacity.current ?? 0) > 0.02;
  });
  return (
    <points ref={pts} geometry={geometry}>
      <pointsMaterial color="#ffffff" size={2.2} sizeAttenuation={false} transparent opacity={0} depthWrite={false} />
    </points>
  );
}

/** A flat polygon with an ink outline. */
export function Poly({ pts, color, z = 0, outline = true, width = 4 }: { pts: number[]; color: string; z?: number; outline?: boolean; width?: number }) {
  const { fill, ink } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) shape.lineTo(pts[i], pts[i + 1]);
    shape.closePath();
    const n = pts.length / 2;
    let line: THREE.BufferGeometry | null = null;
    if (outline) {
      const l = createInkLine(n + 2);
      l.set([...pts, pts[0], pts[1], pts[2], pts[3]], n + 2, width);
      line = l.geometry;
    }
    return { fill: new THREE.ShapeGeometry(shape), ink: line };
  }, [pts.join(), outline, width]);
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={fill}><meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      {ink && <mesh geometry={ink} position={[0, 0, 0.01]}><meshBasicMaterial color="#1d1818" side={THREE.DoubleSide} toneMapped={false} /></mesh>}
    </group>
  );
}

/** An ink stroke along points. */
export function Stroke({ pts, color = '#1d1818', width = 4, z = 0 }: { pts: number[]; color?: string; width?: number; z?: number }) {
  const geometry = useMemo(() => {
    const l = createInkLine(pts.length / 2);
    l.set(pts, pts.length / 2, width);
    return l.geometry;
  }, [pts.join(), width]);
  return <mesh geometry={geometry} position={[0, 0, z]}><meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} /></mesh>;
}

export const rect = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1];
export const circlePts = (cx: number, cy: number, r: number, n = 28) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return out;
};

type Puff = { x: number; y: number; vx: number; vy: number; size: number; grow: number; age: number; life: number; alive: boolean };

/**
 * Smoke: a pool of soft puffs. `emit` (set each frame by the scene) says where, how many per second,
 * which way and how fast they're thrown; puffs grow, slow down and fade out.
 */
export type Emitter = { x: number; y: number; rate: number; spreadX: number; vx: number; vy: number; jitter: number; size: number; life: number; tint?: number };
export function Smoke({ texture, emitters, max = 70, z = 5 }: { texture: THREE.Texture; emitters: React.RefObject<Emitter[]>; max?: number; z?: number }) {
  const puffs = useRef<Puff[]>(Array.from({ length: max }, () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 1, grow: 1, age: 0, life: 1, alive: false })));
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const carry = useRef<number[]>([]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const list = emitters.current ?? [];
    list.forEach((e, k) => {
      carry.current[k] = (carry.current[k] ?? 0) + e.rate * dt;
      while (carry.current[k] >= 1) {
        carry.current[k] -= 1;
        const p = puffs.current.find((q) => !q.alive);
        if (!p) break;
        const side = Math.random() < 0.5 ? -1 : 1;
        Object.assign(p, {
          x: e.x + (Math.random() - 0.5) * e.spreadX, y: e.y,
          vx: e.vx * side * (0.5 + Math.random()) + (Math.random() - 0.5) * e.jitter,
          vy: e.vy * (0.5 + Math.random()) + (Math.random() - 0.5) * e.jitter * 0.4,
          size: e.size * (0.6 + Math.random() * 0.6), grow: e.size * 1.6, age: 0, life: e.life * (0.7 + Math.random() * 0.6), alive: true,
        });
      }
    });
    puffs.current.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      if (!p.alive) { m.visible = false; return; }
      p.age += dt;
      if (p.age > p.life) { p.alive = false; m.visible = false; return; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.2; p.vy *= 1 - dt * 0.8;
      const k = p.age / p.life;
      const s = p.size + p.grow * k;
      m.visible = true;
      m.position.set(p.x, p.y, z + i * 0.001);
      m.scale.set(s, s, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, k * 6) * (1 - k) * 0.9;
    });
  });
  return (
    <>
      {puffs.current.map((_, i) => (
        <Sprite key={i} ref={(m) => { refs.current[i] = m; }} texture={texture} width={1} height={1} visible={false} />
      ))}
    </>
  );
}
