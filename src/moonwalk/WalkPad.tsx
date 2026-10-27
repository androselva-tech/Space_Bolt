import { useEffect, useMemo, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { PARTS } from '../rocket/model';
import { LIGHT, LIGHT_GOLD, LIGHT_MUTED, lit } from '../theme';
import { useWalk, walkInput } from './walkState';

/** How far (screen px) the stick moves for full speed. */
const STICK = 60;

/**
 * Over the Moon walk: a joystick wherever you touch (drag to walk in any direction), the keys on a
 * computer (W A S D or the arrows), the radar with every part still to find, and what's nearest.
 */
export function WalkPad({ u }: { u: number }) {
  const [stick, setStick] = useState<{ x0: number; y0: number; dx: number; dy: number } | null>(null);
  const pan = useMemo(() => {
    const free = () => {
      const s = gameStore.getState();
      return s.phase === 'moonwalk' && s.status === 'playing' && !s.walk?.target;
    };
    const move = (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      const k = len > STICK ? STICK / len : 1;
      walkInput.x = (dx * k) / STICK;
      walkInput.y = (-dy * k) / STICK;
      return { dx: dx * k, dy: dy * k };
    };
    const stop = () => { walkInput.x = 0; walkInput.y = 0; setStick(null); };
    return PanResponder.create({
      onStartShouldSetPanResponder: free,
      onMoveShouldSetPanResponder: free,
      onPanResponderGrant: (e) => setStick({ x0: e.nativeEvent.locationX, y0: e.nativeEvent.locationY, dx: 0, dy: 0 }),
      onPanResponderMove: (_, g) => setStick((s) => (s ? { ...s, ...move(g.dx, g.dy) } : s)),
      onPanResponderRelease: stop,
      onPanResponderTerminate: stop,
      onPanResponderTerminationRequest: () => false,
    });
  }, []);
  useWalkKeys();
  const d = 110 * u;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View testID="walk-pad" style={StyleSheet.absoluteFill} {...pan.panHandlers} accessibilityLabel="Walk: drag in any direction" />
      {stick && (
        <View pointerEvents="none" style={[styles.base, { left: stick.x0 - d / 2, top: stick.y0 - d / 2, width: d, height: d, borderRadius: d / 2 }]}>
          <View style={[styles.knob, { width: d * 0.42, height: d * 0.42, borderRadius: d, transform: [{ translateX: stick.dx * (d / 2 / STICK) * 0.7 }, { translateY: stick.dy * (d / 2 / STICK) * 0.7 }] }]} />
        </View>
      )}
      <Markers u={u} />
      <Radar u={u} />
    </View>
  );
}

/** Arrows at the edge of the view towards the parts out of sight, with how far each one is. */
function Markers({ u }: { u: number }) {
  const markers = useWalk((w) => w.markers);
  return (
    <>
      {markers.map((m) => (
        <View key={m.part} pointerEvents="none" style={{ position: 'absolute', left: m.x - 26 * u, top: m.y - 22 * u, width: 52 * u, alignItems: 'center' }}>
          <Text style={lit(26 * u, { color: LIGHT_GOLD, transform: [{ rotate: `${m.angle}rad` }], lineHeight: 28 * u })}>➤</Text>
          <Text style={lit(10 * u, { color: LIGHT_GOLD, letterSpacing: 0 })}>{Math.round(m.dist / 100)} m</Text>
        </View>
      ))}
    </>
  );
}

/** The radar: the base in the middle, you, and a dot for every part still lying out there. */
function Radar({ u }: { u: number }) {
  const walk = useGame((s) => s.walk);
  const me = useWalk((w) => w);
  if (!walk) return null;
  const size = 104 * u;
  const k = size / 2 / walk.field.radius;
  const at = (x: number, y: number) => ({ left: size / 2 + x * k, top: size / 2 - y * k });
  const left = walk.field.parts.filter((p) => !walk.found.includes(p.part));
  return (
    <View pointerEvents="none" style={[styles.radarBox, { right: 10 * u, top: 42 * u, gap: 3 * u }]}>
      <View style={[styles.radar, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.dot, { width: 8 * u, height: 8 * u, backgroundColor: LIGHT, ...center(at(0, 0), 8 * u) }]} />
        {left.map((p) => <View key={p.part} style={[styles.dot, { width: 9 * u, height: 9 * u, backgroundColor: LIGHT_GOLD, ...center(at(p.x, p.y), 9 * u) }]} />)}
        <View style={[styles.dot, { width: 10 * u, height: 10 * u, backgroundColor: '#7fd6ff', borderWidth: 1.5, borderColor: LIGHT, ...center(at(me.x, me.y), 10 * u) }]} />
      </View>
      <Text style={lit(11 * u, { color: LIGHT_MUTED, letterSpacing: 0.3, textAlign: 'center' })}>
        {walk.found.length}/{walk.field.parts.length} PARTS
      </Text>
      {me.nearest && (
        <Text testID="walk-nearest" style={lit(11 * u, { color: LIGHT_GOLD, letterSpacing: 0, textAlign: 'center', width: size + 30 * u })} numberOfLines={2}>
          {PARTS[me.nearest.part].name}{'\n'}{Math.round(me.nearest.dist / 100)} m
        </Text>
      )}
    </View>
  );
}
const center = (p: { left: number; top: number }, d: number) => ({ left: p.left - d / 2, top: p.top - d / 2 });

/** Web: W A S D or the arrow keys walk. */
function useWalkKeys() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const held = new Set<string>();
    const dir = (k: string) => ({ w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' } as Record<string, string>)[k];
    const apply = () => {
      walkInput.keys.x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      walkInput.keys.y = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => { const k = dir(e.key); if (!k) return; held.add(k); apply(); e.preventDefault(); };
    const up = (e: KeyboardEvent) => { const k = dir(e.key); if (!k) return; held.delete(k); apply(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      walkInput.keys.x = 0; walkInput.keys.y = 0;
    };
  }, []);
}

const styles = StyleSheet.create({
  base: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  knob: { backgroundColor: 'rgba(255,212,92,0.85)', borderWidth: 2, borderColor: LIGHT },
  radarBox: { position: 'absolute', alignItems: 'center' },
  radar: { backgroundColor: 'rgba(10,20,14,0.7)', borderWidth: 2, borderColor: 'rgba(142,224,124,0.7)', overflow: 'hidden' },
  dot: { position: 'absolute', borderRadius: 999 },
});
