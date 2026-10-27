import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { INK } from '../theme';

/** Deterministic wobble so borders look hand-drawn but don't flicker between renders. */
const wob = (i: number, seed: number) => Math.sin(i * 12.9898 + seed * 78.233) * 0.5;

/** Box with a scalloped "cut paper" border, like the prompt panel in the mock-up. */
export function WavyBox({ children, style, fill = '#f5eddb', seed = 1 }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; fill?: string; seed?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const { w, h } = size;
  let d = '';
  if (w > 0) {
    const step = 9, amp = 2.4, m = 4;
    const pts: string[] = [];
    let i = 0;
    for (let x = m; x <= w - m; x += step) pts.push(`${x},${m + (i++ % 2 ? amp : -amp) + wob(i, seed)}`);
    for (let y = m; y <= h - m; y += step) pts.push(`${w - m + (i++ % 2 ? amp : -amp) + wob(i, seed)},${y}`);
    for (let x = w - m; x >= m; x -= step) pts.push(`${x},${h - m + (i++ % 2 ? amp : -amp) + wob(i, seed)}`);
    for (let y = h - m; y >= m; y -= step) pts.push(`${m + (i++ % 2 ? amp : -amp) + wob(i, seed)},${y}`);
    d = `M${pts.join(' L')} Z`;
  }
  return (
    <View style={style} onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={d} fill={fill} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        </Svg>
      )}
      {children}
    </View>
  );
}

/** A slightly uneven pencil rule. */
export function SketchLine({ width, seed = 3, strokeWidth = 2 }: { width: number; seed?: number; strokeWidth?: number }) {
  const n = 8;
  const pts = Array.from({ length: n + 1 }, (_, i) => `${(i / n) * width},${4 + wob(i, seed) * 2.2}`);
  return (
    <Svg width={width} height={8}>
      <Path d={`M${pts.join(' L')}`} stroke={INK} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d={`M${width * 0.04},${5.5} L${width * 0.96},${5 + wob(99, seed)}`} stroke={INK} strokeWidth={1} opacity={0.5} fill="none" />
    </Svg>
  );
}

/** Pencil-outlined rectangle (for bars and buttons). */
export function SketchFrame({ width, height, radius = 5, seed = 5, fill = 'none' }: {
  width: number; height: number; radius?: number; seed?: number; fill?: string;
}) {
  const r = radius, j = (i: number) => wob(i, seed) * 1.2;
  const d = `M${r + j(1)},${1 + j(2)} L${width - r + j(3)},${1.5 + j(4)} Q${width - 1},${1} ${width - 1 + j(5)},${r}
    L${width - 1.5 + j(6)},${height - r} Q${width - 1},${height - 1} ${width - r},${height - 1 + j(7)}
    L${r + j(8)},${height - 1.5} Q${1},${height - 1} ${1 + j(9)},${height - r} L${1.5 + j(10)},${r} Q${1},${1} ${r + j(1)},${1 + j(2)} Z`;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Path d={d} stroke={INK} strokeWidth={2} fill={fill} strokeLinejoin="round" />
    </Svg>
  );
}
