import type { MoonField } from '../game/rules';

/**
 * The Moon's ground for the 3D walk, as a height (world units, about a centimetre each) at each
 * point of the field (x east, y north). Rolling hills, bowl-shaped craters with raised rims, and the
 * Moon's curve, so the ground drops away to a horizon instead of ending.
 */
export const MOON_CURVE_R = 30000;

export function moonHeight(field: MoonField, x: number, y: number): number {
  let h = Math.sin(x * 0.0011 + 1.3) * 70 + Math.sin(y * 0.0009 - 0.4) * 80
    + Math.sin((x + y) * 0.0023) * 28 + Math.sin((x - y * 0.6) * 0.0041 + 2) * 12;
  for (const c of field.craters) {
    const dx = x - c.x, dy = y - c.y;
    const d2 = (dx * dx + dy * dy) / (c.r * c.r);
    if (d2 > 2.4) continue;
    const d = Math.sqrt(d2);
    // a bowl inside, a rim just outside
    if (d < 1) h -= c.r * 0.2 * (1 - d2);
    h += c.r * 0.07 * Math.exp(-((d - 1) * (d - 1)) / 0.03);
  }
  // the landing site was picked flat
  const r2 = x * x + y * y;
  h *= Math.min(1, r2 / (500 * 500));
  return h - r2 / (2 * MOON_CURVE_R);
}

/** The slope's darkness in the ground's colour: crater floors and old lava plains are a little darker. */
export function moonShade(field: MoonField, x: number, y: number): number {
  let k = 0.82 + Math.sin(x * 0.0005 + 2) * Math.sin(y * 0.0004) * 0.1;
  for (const c of field.craters) {
    const d = Math.hypot(x - c.x, y - c.y) / c.r;
    if (d < 1) k -= 0.08 * (1 - d);
    else if (d < 1.4) k += 0.05 * (1.4 - d);
  }
  return Math.max(0.5, Math.min(1, k));
}
