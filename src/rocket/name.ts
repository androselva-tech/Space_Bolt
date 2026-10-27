import GLYPHS from './glyphs.json';
import { NAME_AREA } from './model';

/**
 * The rocket's name, painted along the upper body tube. Letters come from the logo font's outlines
 * (glyphs.json, from tools/make-art.mjs), so they draw the same way in SVG and in three.js.
 */
export type Cmd = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['C', number, number, number, number, number, number] | ['Z'];

const G = GLYPHS as unknown as { unitsPerEm: number; capHeight: number; glyphs: Record<string, { adv: number; cmds: Cmd[] }> };

/**
 * The name's outline in rocket coordinates: it reads from the bottom of the tube up, the tops of the
 * letters towards -x (so it reads left to right when the rocket lies with its nose to the right).
 */
export function nameCommands(text: string): Cmd[] {
  const chars = [...text.toUpperCase()].filter((c) => G.glyphs[c]);
  if (!chars.length) return [];
  const width = chars.reduce((w, c) => w + G.glyphs[c].adv, 0);
  const len = NAME_AREA.y1 - NAME_AREA.y0;
  const k = Math.min(NAME_AREA.height / G.capHeight, len / width);
  const y0 = NAME_AREA.y0 + (len - width * k) / 2;
  const half = (G.capHeight * k) / 2;
  // font point (gx, gy) → rocket (x, y)
  const X = (gy: number) => half - gy * k;
  const Y = (gx: number, at: number) => y0 + (at + gx) * k;
  const out: Cmd[] = [];
  let at = 0;
  for (const c of chars) {
    const g = G.glyphs[c];
    for (const cmd of g.cmds) {
      switch (cmd[0]) {
        case 'M': case 'L': out.push([cmd[0], X(cmd[2]), Y(cmd[1], at)]); break;
        case 'Q': out.push(['Q', X(cmd[2]), Y(cmd[1], at), X(cmd[4]), Y(cmd[3], at)]); break;
        case 'C': out.push(['C', X(cmd[2]), Y(cmd[1], at), X(cmd[4]), Y(cmd[3], at), X(cmd[6]), Y(cmd[5], at)]); break;
        default: out.push(['Z']);
      }
    }
    at += g.adv;
  }
  return out;
}

/** The outline as an SVG path (rocket coordinates). */
export function namePath(text: string): string {
  return nameCommands(text).map((c) => (c[0] === 'Z' ? 'Z' : `${c[0]}${c.slice(1).map((v) => (v as number).toFixed(1)).join(' ')}`)).join('');
}
