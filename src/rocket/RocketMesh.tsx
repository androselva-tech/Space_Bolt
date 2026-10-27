import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '../scene/r3f';
import { createInkLine } from '../scene/ink';
import { DRAW_ORDER, LEG_HINGE, PARTS, palette, type PartId, type RocketDesign } from './model';
import { nameCommands } from './name';
import { nameColor, partShapes } from './RocketSvg';

const INK = '#1d1818';
const INK_W = 5;

type Piece = { geometry: THREE.BufferGeometry; color: string; z: number; ink?: boolean };

/** Flat geometry for one part (and its outline ribbons), in rocket coordinates. */
function buildPart(id: PartId, design: RocketDesign, z0: number): { main: Piece[]; legL: Piece[]; legR: Piece[] } {
  const colors = palette(design) as unknown as Record<string, string>;
  const main: Piece[] = [], legL: Piece[] = [], legR: Piece[] = [];
  partShapes(id, design).forEach((s, i) => {
    // landing legs: shapes 1 and 3 are the left leg and foot, 2 and 4 the right ones (they swing out)
    const target = id === 'landingLegs' && i > 0 ? (i % 2 === 1 ? legL : legR) : main;
    const z = z0 + i * 0.02;
    if (s.kind === 'line') {
      const ink = createInkLine(s.pts.length / 2);
      ink.set(s.pts, s.pts.length / 2, s.width);
      target.push({ geometry: ink.geometry, color: colors[s.color], z: z + 0.01 });
      return;
    }
    const shape = new THREE.Shape();
    shape.moveTo(s.pts[0], s.pts[1]);
    for (let k = 2; k < s.pts.length; k += 2) shape.lineTo(s.pts[k], s.pts[k + 1]);
    shape.closePath();
    target.push({ geometry: new THREE.ShapeGeometry(shape), color: colors[s.fill], z });
    if (s.outline !== false) {
      const n = s.pts.length / 2;
      const loop = [...s.pts, s.pts[0], s.pts[1], s.pts[2], s.pts[3]];
      const ink = createInkLine(n + 2);
      ink.set(loop, n + 2, INK_W);
      target.push({ geometry: ink.geometry, color: INK, z: z + 0.015, ink: true });
    }
  });
  if (id === 'upperTube' && design.name.trim()) {
    const path = new THREE.ShapePath();
    for (const c of nameCommands(design.name)) {
      if (c[0] === 'M') path.moveTo(c[1], c[2]);
      else if (c[0] === 'L') path.lineTo(c[1], c[2]);
      else if (c[0] === 'Q') path.quadraticCurveTo(c[1], c[2], c[3], c[4]);
      else if (c[0] === 'C') path.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    }
    const shapes = path.toShapes();
    main.push({ geometry: new THREE.ShapeGeometry(shapes, 6), color: nameColor(design.body), z: z0 + 0.3 });
  }
  return { main, legL, legR };
}

/**
 * The rocket (or some of its parts) as flat three.js meshes, upright in rocket coordinates.
 * `legs` (0 folded … 1 out) swings the landing legs out and down for touchdown.
 */
export function RocketMesh({ design, parts, legs }: { design: RocketDesign; parts: readonly PartId[]; legs?: React.RefObject<number> }) {
  const built = useMemo(() => {
    const out: Array<{ id: PartId; main: Piece[]; legL: Piece[]; legR: Piece[] }> = [];
    DRAW_ORDER.forEach((id, k) => {
      if (parts.includes(id)) out.push({ id, ...buildPart(id, design, k * 0.4) });
    });
    return out;
  }, [design.name, design.body, design.trim, design.pattern, parts.join()]);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = legs?.current ?? 0;
    // each leg swings out from its hinge and slides down a little, so the feet reach below the engine
    if (left.current) { left.current.rotation.z = -0.55 * k; left.current.position.y = -90 * k; }
    if (right.current) { right.current.rotation.z = 0.55 * k; right.current.position.y = -90 * k; }
  });
  const mesh = (p: Piece, i: number) => (
    <mesh key={i} geometry={p.geometry} position={[0, 0, p.z]}>
      <meshBasicMaterial color={p.color} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
  const leg = (pieces: Piece[], side: -1 | 1, ref: React.RefObject<THREE.Group | null>) => (
    // pivot at the hinge: the group sits at the hinge, its contents shifted back
    <group position={[side * LEG_HINGE.x, LEG_HINGE.y, 0]}>
      <group ref={ref}>
        <group position={[-side * LEG_HINGE.x, -LEG_HINGE.y, 0]}>{pieces.map(mesh)}</group>
      </group>
    </group>
  );
  return (
    <group>
      {built.map((b) => (
        <group key={b.id}>
          {b.main.map(mesh)}
          {b.legL.length > 0 && leg(b.legL, -1, left)}
          {b.legR.length > 0 && leg(b.legR, 1, right)}
        </group>
      ))}
    </group>
  );
}

/** Rocket parts that are in the upper stage, in a stable order (for memo keys). */
export const UPPER_STAGE: PartId[] = DRAW_ORDER.filter((p) => PARTS[p].stage === 'upper');
export const BOOSTER_STAGE: PartId[] = DRAW_ORDER.filter((p) => PARTS[p].stage === 'booster');
