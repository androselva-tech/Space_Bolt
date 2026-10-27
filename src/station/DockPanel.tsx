import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { DOCK } from '../game/rules';
import { LIGHT, LIGHT_MUTED, lit } from '../theme';
import { dockInput, useDock } from './dockState';

const OK = '#8ee07c';
const BAD = '#ffd45c';
const FAIL = '#ff7a6a';

/**
 * Over the docking view: the readouts along the top, the cockpit cross-hair and the port marker
 * in the middle, and the thrusters along the bottom: spin (left), the side thrusters (a pad) and
 * forward / brake (right). Then the result: docked, or what went wrong and a retry.
 */
export function DockPanel({ u }: { u: number }) {
  const docked = useGame((s) => s.docked);
  const result = useGame((s) => s.dockResult);
  useDockKeys();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Readouts u={u} />
      <Reticle u={u} />
      {!docked && !result && (
        <View style={[styles.controls, { bottom: 10 * u, paddingHorizontal: 12 * u }]} pointerEvents="box-none">
          <View style={[styles.row, { gap: 8 * u }]}>
            <Hold u={u} id="dock-spin-left" label="⟲" sub="SPIN" on={() => { dockInput.spin = -1; }} off={() => { dockInput.spin = 0; }} />
            <Hold u={u} id="dock-spin-right" label="⟳" sub="SPIN" on={() => { dockInput.spin = 1; }} off={() => { dockInput.spin = 0; }} />
          </View>
          <View style={{ alignItems: 'center', gap: 2 * u }}>
            <Hold u={u} small id="dock-up" label="▲" sub="" on={() => { dockInput.my = 1; }} off={() => { dockInput.my = 0; }} />
            <View style={[styles.row, { gap: 34 * u }]}>
              <Hold u={u} small id="dock-left" label="◀" sub="" on={() => { dockInput.mx = -1; }} off={() => { dockInput.mx = 0; }} />
              <Hold u={u} small id="dock-right" label="▶" sub="" on={() => { dockInput.mx = 1; }} off={() => { dockInput.mx = 0; }} />
            </View>
            <Hold u={u} small id="dock-down" label="▼" sub="" on={() => { dockInput.my = -1; }} off={() => { dockInput.my = 0; }} />
          </View>
          <View style={[styles.row, { gap: 8 * u }]}>
            <Hold u={u} id="dock-brake" label="−" sub="BRAKE" on={() => { dockInput.thrust = -1; }} off={() => { dockInput.thrust = 0; }} />
            <Hold u={u} id="dock-thrust" label="+" sub="FORWARD" on={() => { dockInput.thrust = 1; }} off={() => { dockInput.thrust = 0; }} />
          </View>
        </View>
      )}
      {result && <Result u={u} ok={result.ok} reason={result.reason} />}
    </View>
  );
}

function Readouts({ u }: { u: number }) {
  const d = useDock((x) => x);
  const rows: Array<[string, string, boolean]> = [
    ['SPIN', `${d.spinDiff > 0 ? '+' : ''}${d.spinDiff.toFixed(1)}°/s`, d.okSpin],
    ['ALIGN', `${d.align > 0 ? '+' : ''}${d.align}°`, d.okAlign],
    ['OFF CENTRE', `${d.offset.toFixed(1)} m`, d.okOffset],
    ['SPEED', `${d.speed.toFixed(1)} m/s`, d.okSpeed],
    ['RANGE', `${Math.round(d.range)} m`, true],
  ];
  return (
    <View style={[styles.readouts, { top: 44 * u, gap: 5 * u }]} pointerEvents="none">
      {rows.map(([k, v, ok]) => (
        <View key={k} style={[styles.readout, { paddingHorizontal: 7 * u, paddingVertical: 2 * u, borderRadius: 8 * u, borderColor: ok ? OK : BAD, minWidth: 64 * u }]}>
          <Text style={lit(9 * u, { color: LIGHT_MUTED, letterSpacing: 0.5 })}>{k}</Text>
          <Text testID={`dock-${k.toLowerCase().replace(/ /g, '-')}`} style={lit(14 * u, { color: ok ? OK : BAD, letterSpacing: 0 })}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

/** The cockpit cross-hair (fixed), and a diamond where the station's port is: bring them together. */
function Reticle({ u }: { u: number }) {
  const px = useDock((d) => d.portX), py = useDock((d) => d.portY);
  const centred = useDock((d) => d.okOffset && d.okAlign && d.okSpin);
  const c = centred ? OK : BAD;
  const d = 26 * u;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', left: '50%', top: '55%', marginLeft: -d, marginTop: -d, width: d * 2, height: d * 2, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: d * 2, height: 2, backgroundColor: c, opacity: 0.85 }} />
        <View style={{ position: 'absolute', width: 2, height: d * 2, backgroundColor: c, opacity: 0.85 }} />
        <View style={{ width: d, height: d, borderRadius: d, borderWidth: 2, borderColor: c }} />
      </View>
      <View style={{ position: 'absolute', left: `${px * 100}%`, top: `${py * 100}%`, marginLeft: -9 * u, marginTop: -9 * u, width: 18 * u, height: 18 * u, borderWidth: 2.5, borderColor: '#7fd6ff', transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

/** Docked, or what went wrong (and a heart lost) with a retry. */
function Result({ u, ok, reason }: { u: number; ok: boolean; reason: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
      <View style={[styles.result, { padding: 16 * u, borderRadius: 14 * u, borderColor: ok ? OK : FAIL, gap: 6 * u }]}>
        <Text testID={ok ? 'dock-success' : 'dock-failed'} style={lit(30 * u, { color: ok ? OK : FAIL, textAlign: 'center' })}>{ok ? 'DOCKED SUCCESSFULLY ✓' : 'DOCKING FAILED ✗'}</Text>
        <Text style={lit(15 * u, { textAlign: 'center', letterSpacing: 0 })}>{reason}</Text>
        {!ok && (
          <Pressable testID="btn-dock-retry" accessibilityRole="button" onPress={() => gameStore.getState().retryDock()}
            style={({ pressed }) => [styles.retry, { paddingHorizontal: 18 * u, paddingVertical: 8 * u, borderRadius: 20 * u, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Text style={lit(17 * u, { color: '#1d1818', textShadowRadius: 0 })}>↺ BACK OFF AND TRY AGAIN</Text>
          </Pressable>
        )}
        {!ok && <Text style={lit(11 * u, { color: LIGHT_MUTED, textAlign: 'center', letterSpacing: 0 })}>Touch at under {DOCK.speedTol} m/s, within {DOCK.offsetTol} m of the centre, spin matched and slot lined up.</Text>}
      </View>
    </View>
  );
}

/** A thruster button: fires while held down. */
function Hold({ u, id, label, sub, on, off, small }: { u: number; id: string; label: string; sub: string; on: () => void; off: () => void; small?: boolean }) {
  const d = (small ? 36 : 54) * u;
  return (
    <Pressable testID={id} accessibilityRole="button" accessibilityLabel={sub || id} onPressIn={on} onPressOut={off}
      style={({ pressed }) => [styles.hold, { width: d, height: d, borderRadius: d / 2, backgroundColor: pressed ? 'rgba(255,212,92,0.35)' : 'rgba(0,0,0,0.5)' }]}>
      <Text style={lit((small ? 15 : 22) * u, { lineHeight: (small ? 17 : 24) * u })}>{label}</Text>
      {sub ? <Text style={lit(8 * u, { color: LIGHT_MUTED, letterSpacing: 0.5 })}>{sub}</Text> : null}
    </Pressable>
  );
}

/** Web: A / D spin, W / S forward and brake, the arrow keys fire the side thrusters. */
function useDockKeys() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const map: Record<string, [keyof typeof dockInput, -1 | 1]> = {
      a: ['spin', -1], d: ['spin', 1], w: ['thrust', 1], s: ['thrust', -1],
      ArrowLeft: ['mx', -1], ArrowRight: ['mx', 1], ArrowUp: ['my', 1], ArrowDown: ['my', -1],
    };
    const down = (e: KeyboardEvent) => { const m = map[e.key]; if (!m) return; dockInput[m[0]] = m[1]; e.preventDefault(); };
    const up = (e: KeyboardEvent) => { const m = map[e.key]; if (m && dockInput[m[0]] === m[1]) dockInput[m[0]] = 0; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  readouts: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  readout: { borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  hold: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: LIGHT },
  result: { borderWidth: 3, backgroundColor: 'rgba(6,10,20,0.88)', alignItems: 'center', maxWidth: '88%' },
  retry: { backgroundColor: '#ffd45c', borderWidth: 2, borderColor: LIGHT, marginTop: 4 },
});
