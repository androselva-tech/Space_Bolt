import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { CARD, MUTED, text, lit } from '../theme';
import { WavyBox } from './SketchShapes';
import { PaperButton } from './StageOverlays';

/** The pause / play button: everything stops (the flight, the clocks, the movies) until play is pressed. */
export function PauseButton({ u }: { u: number }) {
  const paused = useGame((s) => s.paused);
  const playing = useGame((s) => s.status === 'playing');
  if (!playing) return null;
  return (
    <Pressable testID={paused ? 'btn-play' : 'btn-pause'} accessibilityRole="button" accessibilityLabel={paused ? 'Play' : 'Pause'}
      onPress={() => gameStore.getState().togglePause()}
      style={({ pressed }) => [styles.btn, { width: Math.max(56, 50 * u), height: Math.max(48, 44 * u), borderRadius: 10 * u, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Text style={lit(Math.max(22, 22 * u), { letterSpacing: 0 })}>{paused ? '▶' : '❚❚'}</Text>
    </Pressable>
  );
}

/** While paused: the whole screen dims, with play and the way back to the map. P or Esc on a computer. */
export function PauseOverlay({ u }: { u: number }) {
  const paused = useGame((s) => s.paused);
  usePauseKeys();
  if (!paused) return null;
  const store = gameStore.getState();
  return (
    <View style={styles.scrim}>
      <WavyBox style={{ padding: 20 * u, alignItems: 'center', minWidth: 280 }} fill={CARD} seed={12}>
        <Text style={text(Math.max(40, 42 * u))}>PAUSED</Text>
        <Text style={text(Math.max(17, 18 * u), { color: MUTED, letterSpacing: 0, marginTop: 4 * u, textAlign: 'center' })}>Everything is on hold: the flight, the clocks, the movies.</Text>
        <View style={[styles.row, { gap: 14 * u, marginTop: 16 * u }]}>
          <PaperButton u={u} large label="MAP" onPress={() => store.openMap()} />
          <PaperButton u={u} large testID="btn-resume" label="▶ PLAY" primary onPress={() => store.togglePause()} />
        </View>
      </WavyBox>
    </View>
  );
}

function usePauseKeys() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { gameStore.getState().togglePause(); e.preventDefault(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.35)' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,14,0.62)', alignItems: 'center', justifyContent: 'center' },
});
