import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { MAX_NAME, NAME_IDEAS, PAINTS, PAINT_NAMES, PATTERNS, type Pattern } from '../rocket/model';
import { RocketSide } from '../rocket/RocketSvg';
import { FONT, LIGHT, LIGHT_GOLD, LIGHT_MUTED, lit } from '../theme';

const PATTERN_NAME: Record<Pattern, string> = { plain: 'PLAIN', bands: 'BANDS', checker: 'CHECKS', flames: 'FLAMES' };

/**
 * The paint shop, after the rocket is built: pick the body colour, the trim colour (fins, nose cone,
 * transition and pattern), a pattern, and paint the rocket's name on its side. A spray of paint sweeps
 * over the rocket with every change.
 */
export function PaintShop({ u }: { u: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const design = useGame((s) => s.design);
  const spray = useRef(new Animated.Value(1)).current;
  const sprayed = () => {
    spray.setValue(0);
    Animated.timing(spray, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  };
  useEffect(sprayed, [design.body, design.trim, design.pattern]);
  const set = (d: Parameters<ReturnType<typeof gameStore.getState>['setDesign']>[0]) => gameStore.getState().setDesign(d);
  const W = box.w, H = box.h;
  const rocketW = Math.min(W * 0.9, (H * 0.36) * (980 / 320));
  const sw = Math.max(22, Math.min(30 * u, (W - 120 * u) / PAINTS.length - 6));
  const mist = spray.interpolate({ inputRange: [0, 1], outputRange: [-rocketW * 0.6, rocketW * 1.1] });
  const mistOpacity = spray.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.65, 0.65, 0] });
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} onLayout={onLayout}>
      {W > 0 && (
        <ScrollView contentContainerStyle={{ paddingTop: 48 * u, paddingBottom: 12 * u, alignItems: 'center', gap: 8 * u }}>
          <Text style={lit(18 * u, { color: LIGHT_GOLD })}>PAINT SHOP</Text>
          <View style={{ width: rocketW, overflow: 'hidden' }}>
            <RocketSide design={design} width={rocketW} />
            <Animated.View pointerEvents="none" style={[styles.mist, { width: rocketW * 0.35, opacity: mistOpacity, transform: [{ translateX: mist }] }]} />
          </View>
          <Row u={u} label="BODY">
            {PAINTS.map((c) => <Swatch key={c} color={c} size={sw} on={design.body === c} onPress={() => set({ body: c })} label={`Body ${PAINT_NAMES[c]}`} testID={`paint-body-${PAINT_NAMES[c].toLowerCase()}`} />)}
          </Row>
          <Row u={u} label="TRIM">
            {PAINTS.map((c) => <Swatch key={c} color={c} size={sw} on={design.trim === c} onPress={() => set({ trim: c })} label={`Trim ${PAINT_NAMES[c]}`} testID={`paint-trim-${PAINT_NAMES[c].toLowerCase()}`} />)}
          </Row>
          <Row u={u} label="PATTERN">
            {PATTERNS.map((p) => (
              <Chip key={p} u={u} on={design.pattern === p} onPress={() => set({ pattern: p })} label={PATTERN_NAME[p]} />
            ))}
          </Row>
          <Row u={u} label="NAME">
            <TextInput
              testID="rocket-name"
              value={design.name}
              onChangeText={(t) => set({ name: t })}
              maxLength={MAX_NAME}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="NAME YOUR ROCKET"
              placeholderTextColor={LIGHT_MUTED}
              style={[styles.input, { fontFamily: FONT, fontSize: 17 * u, paddingHorizontal: 10 * u, height: 34 * u, width: Math.min(200 * u, W * 0.4) }]}
            />
            {NAME_IDEAS.slice(0, 3).map((n) => <Chip key={n} u={u} on={false} onPress={() => set({ name: n })} label={n} small />)}
          </Row>
          <Pressable testID="btn-paint-done" accessibilityRole="button" onPress={() => gameStore.getState().paintDone()}
            style={({ pressed }) => [styles.done, { paddingHorizontal: 26 * u, paddingVertical: 8 * u, borderRadius: 24 * u, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Text style={lit(19 * u, { color: '#1d1818', textShadowRadius: 0 })}>DONE: TO THE LAUNCH PAD ➜</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Row({ u, label, children }: { u: number; label: string; children: React.ReactNode }) {
  return (
    <View style={[styles.row, { gap: 6 * u, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 8 * u }]}>
      <Text style={lit(12 * u, { color: LIGHT_MUTED, width: 62 * u, letterSpacing: 0.5 })}>{label}</Text>
      {children}
    </View>
  );
}

function Swatch({ color, size, on, onPress, label, testID }: { color: string; size: number; on: boolean; onPress: () => void; label: string; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: on ? 3 : 1.5, borderColor: on ? LIGHT_GOLD : 'rgba(255,255,255,0.5)' }} />
  );
}

function Chip({ u, on, onPress, label, small }: { u: number; on: boolean; onPress: () => void; label: string; small?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={[styles.chip, { paddingHorizontal: 10 * u, paddingVertical: 4 * u, borderRadius: 14 * u, borderColor: on ? LIGHT_GOLD : 'rgba(255,255,255,0.5)', backgroundColor: on ? 'rgba(255,212,92,0.18)' : 'rgba(255,255,255,0.06)' }]}>
      <Text style={lit((small ? 12 : 14) * u, { color: on ? LIGHT_GOLD : LIGHT, letterSpacing: 0 })}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#1a1530' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { borderWidth: 1.5 },
  input: { color: LIGHT, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  done: { backgroundColor: '#8ee07c', borderWidth: 3, borderColor: LIGHT, marginTop: 4 },
  mist: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 999 },
});
