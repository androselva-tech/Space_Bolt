import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { LIGHT, LIGHT_GOLD, lit } from '../theme';
import { movieStore, useMovie } from './movie';
import { PauseButton } from '../ui/PauseControl';
import { useReentry, type ChuteWindow } from './reentryState';

/**
 * Over the launch, landing and splashdown movies: cinema bars, the captions, a white flash for cuts, the
 * countdown and the IGNITION button, and (after the first landing) a way to skip.
 */
export function MovieOverlay({ u }: { u: number }) {
  const phase = useGame((s) => s.phase);
  const ignitedAt = useGame((s) => s.ignitedAt);
  const landings = useGame((s) => s.profile.stats.landings);
  const captionText = useMovie((m) => m.caption);
  const sub = useMovie((m) => m.sub);
  const at = useMovie((m) => m.at);
  const flash = useMovie((m) => m.flash);
  const [count, setCount] = useState<number | null>(null);

  // a new movie: clear the captions; the launch starts with a countdown from 10
  useEffect(() => {
    movieStore.setState({ caption: '', sub: '', at: Date.now(), flash: 0 });
    if (phase !== 'launch') return;
    setCount(10);
    const id = setInterval(() => setCount((c) => (c === null || c <= 0 || gameStore.getState().paused ? c : c - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [at]);

  const counting = phase === 'launch' && !ignitedAt;
  const store = gameStore.getState();
  const skip = () => (phase === 'launch' ? (store.ignite(), store.orbitReached()) : phase === 'splashdown' ? store.splashed() : store.landed());
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.bar, { top: 0, height: 34 * u }]} pointerEvents="none" />
      <View style={[styles.bar, { bottom: 0, height: 34 * u }]} pointerEvents="none" />
      {!counting && captionText ? (
        <Animated.View style={[styles.caption, { top: 42 * u, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]} pointerEvents="none">
          <Text testID="movie-caption" style={lit(30 * u, { textAlign: 'center' })}>{captionText}</Text>
          {sub ? <Text style={lit(16 * u, { textAlign: 'center', letterSpacing: 0, color: 'rgba(255,244,230,0.85)' })}>{sub}</Text> : null}
        </Animated.View>
      ) : null}
      {counting && count !== null && (
        <View style={[StyleSheet.absoluteFill, styles.center, { left: '50%' }]} pointerEvents="box-none">
          {count > 0 ? (
            <>
              <Text style={lit(18 * u, { color: LIGHT_GOLD, letterSpacing: 2 })}>T MINUS</Text>
              <Text testID="countdown" style={lit(110 * u, { lineHeight: 120 * u })}>{count}</Text>
              <Text style={lit(16 * u, { letterSpacing: 0, color: 'rgba(255,244,230,0.85)' })}>Get ready to press IGNITION</Text>
            </>
          ) : (
            <IgnitionButton u={u} />
          )}
        </View>
      )}
      {phase === 'splashdown' && <ChuteControls u={u} />}
      {flash > 0 && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', opacity: flash }]} />}
      <View style={{ position: 'absolute', top: 6 * u, left: 12 * u }}><PauseButton u={u} /></View>
      {landings > 0 && (
        <Pressable testID="btn-skip" accessibilityRole="button" onPress={skip} style={[styles.skip, { top: 6 * u, right: 12 * u, paddingHorizontal: 10 * u, paddingVertical: 3 * u, borderRadius: 8 * u }]}>
          <Text style={lit(13 * u)}>SKIP ▶▶</Text>
        </Pressable>
      )}
    </View>
  );
}

function IgnitionButton({ u }: { u: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }], alignItems: 'center', gap: 8 * u }}>
      <Pressable testID="btn-ignition" accessibilityRole="button" onPress={() => gameStore.getState().ignite()}
        style={({ pressed }) => [styles.ignite, { width: 170 * u, height: 170 * u, borderRadius: 85 * u, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <Text style={lit(30 * u, { textShadowRadius: 0 })}>IGNITION</Text>
        <Text style={{ fontSize: 34 * u }}>🔥</Text>
      </Pressable>
      <Text style={lit(16 * u)}>PRESS TO LAUNCH!</Text>
    </Animated.View>
  );
}

/**
 * The capsule's ride home: altitude and speed, and the two parachute buttons. Each lights up green
 * in its window; too early and Mission Control says wait; too late and the backup fires it.
 */
function ChuteControls({ u }: { u: number }) {
  const r = useReentry((x) => x);
  const chutes = useGame((s) => s.chutes);
  const fire = (kind: 'drogue' | 'mains', w: ChuteWindow) => {
    const s = gameStore.getState();
    if (w === 'open') s.deployChute(kind, 'ok');
    else if (w === 'wait') s.say(kind === 'drogue' ? 'TOO HIGH, TOO FAST!' : 'DROGUES FIRST, THEN WAIT', 'Fire when the button turns green');
  };
  const button = (kind: 'drogue' | 'mains', label: string, w: ChuteWindow) => {
    const fired = chutes[kind];
    const open = w === 'open';
    return (
      <Pressable testID={`btn-${kind}`} accessibilityRole="button" onPress={() => fire(kind, w)}
        style={({ pressed }) => [styles.chute, {
          paddingHorizontal: 14 * u, paddingVertical: 8 * u, borderRadius: 12 * u, minWidth: 150 * u,
          backgroundColor: fired ? 'rgba(0,0,0,0.5)' : open ? '#8ee07c' : 'rgba(0,0,0,0.55)',
          borderColor: fired === 'late' ? '#ff9b8c' : open || fired ? '#8ee07c' : 'rgba(255,255,255,0.45)',
          transform: [{ scale: pressed ? 0.95 : open ? 1.06 : 1 }],
        }]}>
        <Text style={lit(16 * u, { color: open && !fired ? '#1d1818' : LIGHT, textShadowRadius: open && !fired ? 0 : 3, textAlign: 'center' })}>
          {fired === 'ok' ? `✓ ${label}` : fired === 'late' ? `${label}: LATE` : `🪂 DEPLOY ${label}`}
        </Text>
        {!fired && <Text style={lit(10 * u, { color: open ? '#1d1818' : LIGHT_GOLD, textShadowRadius: 0, textAlign: 'center' })}>{open ? 'NOW!' : 'WAIT FOR GREEN'}</Text>}
      </Pressable>
    );
  };
  return (
    <View style={[styles.chuteBar, { bottom: 44 * u, gap: 12 * u }]} pointerEvents="box-none">
      <View style={{ alignItems: 'center', minWidth: 110 * u }}>
        <Text style={lit(11 * u, { color: LIGHT_GOLD })}>ALTITUDE</Text>
        <Text testID="reentry-altitude" style={lit(20 * u)}>{r.altitude.toLocaleString()} m</Text>
        <Text style={lit(11 * u, { color: LIGHT_GOLD })}>{r.speed.toLocaleString()} km/h</Text>
      </View>
      {button('drogue', 'DROGUES', r.drogue)}
      {button('mains', 'MAINS', r.mains)}
    </View>
  );
}

const styles = StyleSheet.create({
  chuteBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  chute: { borderWidth: 2.5, alignItems: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  caption: { position: 'absolute', left: 20, right: 20, alignItems: 'center', gap: 2 },
  center: { alignItems: 'center', justifyContent: 'center' },
  ignite: { backgroundColor: '#d8452f', borderWidth: 6, borderColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  skip: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.4)' },
});
