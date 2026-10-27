import { memo } from 'react';
import Svg, { G, Path, Polygon, Polyline } from 'react-native-svg';
import { DRAW_ORDER, PARTS, VIEW, decals, palette, vehicleOf, type PartId, type RocketDesign, type Shape, type Vehicle } from './model';
import { namePath } from './name';

const INK = '#1d1818';

/** A part's shapes with the paint job's pattern laid over its tube (under the shading). */
export function partShapes(id: PartId, design: RocketDesign): Shape[] {
  const base = PARTS[id].shapes;
  const extra = decals(design, id);
  return extra.length ? [base[0], ...extra, ...base.slice(1)] : base;
}

/** Light paint gets a dark name; dark paint a light one. */
export function nameColor(body: string) {
  const n = parseInt(body.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#1d1818' : '#fdf8ee';
}

const pts = (p: number[]) => {
  let s = '';
  for (let i = 0; i < p.length; i += 2) s += `${p[i].toFixed(1)},${p[i + 1].toFixed(1)} `;
  return s;
};

function ShapeSvg({ shape, colors, ghost, scale }: { shape: Shape; colors: Record<string, string>; ghost?: boolean; scale: number }) {
  const sw = 5 / Math.max(0.3, scale) * Math.min(1, scale * 1.4);
  if (shape.kind === 'line') {
    if (ghost) return null;
    return <Polyline points={pts(shape.pts)} stroke={colors[shape.color]} strokeWidth={shape.width} fill="none" strokeLinecap="round" />;
  }
  if (ghost) {
    return shape.outline === false ? null : (
      <Polygon points={pts(shape.pts)} fill="rgba(127,214,255,0.16)" stroke="rgba(190,236,255,0.85)" strokeWidth={sw * 0.6} strokeDasharray={`${8 / scale} ${6 / scale}`} />
    );
  }
  return <Polygon points={pts(shape.pts)} fill={colors[shape.fill]} stroke={shape.outline === false ? 'none' : INK} strokeWidth={sw} strokeLinejoin="round" />;
}

/** One part (or its blueprint ghost), in rocket coordinates; place it with a parent transform. */
export const PartSvg = memo(function PartSvg({ id, design, ghost, scale = 1 }: { id: PartId; design: RocketDesign; ghost?: boolean; scale?: number }) {
  const colors = palette(design) as unknown as Record<string, string>;
  return (
    <G>
      {partShapes(id, design).map((s, i) => <ShapeSvg key={i} shape={s} colors={colors} ghost={ghost} scale={scale} />)}
      {!ghost && id === 'upperTube' && design.name.trim() ? <Path d={namePath(design.name)} fill={nameColor(design.body)} stroke={INK} strokeWidth={1.2 / scale} /> : null}
    </G>
  );
});

/**
 * The side view used in the workshop and paint shop: the rocket lying on its side, nose to the
 * right. Rocket (x, y) → view (X, Y) = (y + 20, x + 160): 980 x 320 units.
 */
export const SIDE = { w: 980, h: 320, dx: 20, dy: 160 };
export const sideMatrix = `matrix(0 1 1 0 ${SIDE.dx} ${SIDE.dy})`;

/** The whole craft (or the parts given) as the workshop shows it, in a box of the given width. */
export function RocketSide({ parts, ghosts = [], design, width, vehicle = 'rocket' }: { parts?: PartId[]; ghosts?: PartId[]; design: RocketDesign; width: number; vehicle?: Vehicle }) {
  const V = VIEW[vehicle];
  const scale = width / V.w;
  const show = parts ?? DRAW_ORDER.filter((p) => vehicleOf(p) === vehicle);
  return (
    <Svg width={width} height={V.h * scale} viewBox={`0 0 ${V.w} ${V.h}`}>
      <G transform={V.matrix}>
        {DRAW_ORDER.filter((p) => ghosts.includes(p) && !show.includes(p)).map((p) => <PartSvg key={`g${p}`} id={p} design={design} ghost scale={scale} />)}
        {DRAW_ORDER.filter((p) => show.includes(p)).map((p) => <PartSvg key={p} id={p} design={design} scale={scale} />)}
      </G>
    </Svg>
  );
}
