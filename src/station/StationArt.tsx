import { useMemo } from 'react';
import * as THREE from 'three';
import { Poly, Stroke, circlePts, rect } from '../cinematic/common';

/** The station's size (world units): the wheel's radius, and the docking slot at the hub. */
export const STATION_R = 520;
export const PORT = { w: 150, h: 34 };

const HULL = '#d9dde3';
const SHADE = '#a9b0ba';
const PANEL = '#2f5aa8';

/**
 * The space station seen face-on: a wheel that spins for artificial gravity, with modules around
 * the rim, four spokes, solar panels, and the docking port at the hub. The port is a slot along
 * the x axis: a docking craft lines its collar up with it.
 */
export function Station() {
  const modules = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8), []);
  return (
    <group>
      {/* solar wings behind the wheel */}
      {[-1, 1].map((d) => (
        <group key={d} position={[0, d * (STATION_R + 150), -2]}>
          <Poly pts={rect(-260, -70, 260, 70)} color={PANEL} />
          {[-130, 0, 130].map((x) => <Stroke key={x} pts={[x, -70, x, 70]} width={3} color="#9fc2ff" />)}
          <Stroke pts={[-260, 0, 260, 0]} width={3} color="#9fc2ff" />
          <Poly pts={rect(-14, -d * 150, 14, -d * 70)} color={SHADE} />
        </group>
      ))}
      {/* the rim */}
      <mesh position={[0, 0, -1]}>
        <ringGeometry args={[STATION_R - 46, STATION_R + 46, 72]} />
        <meshBasicMaterial color={HULL} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Stroke pts={circlePts(0, 0, STATION_R + 46, 72).concat([STATION_R + 46, 0])} width={5} z={-0.9} />
      <Stroke pts={circlePts(0, 0, STATION_R - 46, 72).concat([STATION_R - 46, 0])} width={5} z={-0.9} />
      {modules.map((a, i) => (
        <group key={i} position={[Math.cos(a) * STATION_R, Math.sin(a) * STATION_R, -0.5]} rotation={[0, 0, a]}>
          <Poly pts={rect(-60, -70, 60, 70)} color={i % 2 ? HULL : '#e9e2cf'} />
          <Poly pts={rect(-10, -40, 10, 40)} color="#ffd45c" outline={false} z={0.05} />
        </group>
      ))}
      {/* spokes */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 2 + Math.PI / 4]}>
          <Poly pts={rect(100, -20, STATION_R - 40, 20)} color={SHADE} z={-0.8} />
        </group>
      ))}
      {/* the hub and its docking slot */}
      <Poly pts={circlePts(0, 0, 118, 40)} color={HULL} z={0} />
      <Poly pts={circlePts(0, 0, 92, 40)} color="#c3c9d2" z={0.05} outline={false} />
      <Poly pts={rect(-PORT.w / 2 - 8, -PORT.h / 2 - 8, PORT.w / 2 + 8, PORT.h / 2 + 8)} color="#ffd45c" z={0.1} />
      <Poly pts={rect(-PORT.w / 2, -PORT.h / 2, PORT.w / 2, PORT.h / 2)} color="#10131c" z={0.15} outline={false} />
      {/* marker lights at the ends of the slot */}
      <Poly pts={circlePts(PORT.w / 2 + 26, 0, 9, 14)} color="#7cff8a" z={0.2} />
      <Poly pts={circlePts(-PORT.w / 2 - 26, 0, 9, 14)} color="#ff5a4a" z={0.2} />
    </group>
  );
}
