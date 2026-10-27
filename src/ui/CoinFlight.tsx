import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../game/store';
import { UI } from '../assets';
import { GOLD, text } from '../theme';

type Flight = { id: number; amount: number; count: number };

/**
 * Coins fly from the answered question (left) to the rocket (right), connecting the two halves
 * of the screen. Then "+N" pops up by the rocket.
 */
export function CoinFlight({ from, to, u }: { from: { x: number; y: number }; to: { x: number; y: number }; u: number }) {
  const coinEvent = useGame((s) => s.coinEvent);
  const [flight, setFlight] = useState<Flight | null>(null);
  useEffect(() => {
    if (!coinEvent.id || coinEvent.amount <= 0) return;
    setFlight({ id: coinEvent.id, amount: coinEvent.amount, count: Math.min(9, 3 + Math.floor(coinEvent.amount / 8)) });
  }, [coinEvent.id]);
  if (!flight) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: flight.count }, (_, i) => (
        <FlyingCoin key={`${flight.id}-${i}`} from={from} to={to} delay={i * 45} size={26 * u} spread={i} />
      ))}
      <PlusPopup key={`p${flight.id}`} at={to} amount={flight.amount} u={u} />
    </View>
  );
}

function FlyingCoin({ from, to, delay, size, spread }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; size: number; spread: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, []);
  const jitter = (spread % 3 - 1) * 14;
  const lift = 90 + (spread % 4) * 18;
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const x = t.interpolate({ inputRange: steps, outputRange: steps.map((s) => from.x + (to.x - from.x) * s + jitter * Math.sin(Math.PI * s) - size / 2) });
  const y = t.interpolate({ inputRange: steps, outputRange: steps.map((s) => from.y + (to.y - from.y) * s - Math.sin(Math.PI * s) * lift - size / 2) });
  const opacity = t.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] });
  const rot = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + spread * 40}deg`] });
  return <Animated.Image source={UI.coin} style={{ position: 'absolute', width: size, height: size, opacity, transform: [{ translateX: x }, { translateY: y }, { rotate: rot }] }} />;
}

function PlusPopup({ at, amount, u }: { at: { x: number; y: number }; amount: number; u: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(620), Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true })]).start();
  }, []);
  const opacity = t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, -60 * u] });
  const scale = t.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.6, 1.25, 1, 1] });
  return (
    <Animated.View style={{ position: 'absolute', left: at.x - 60 * u, top: at.y - 80 * u, width: 120 * u, alignItems: 'center', opacity, transform: [{ translateY: ty }, { scale }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[text(30 * u, { color: GOLD }), styles.shadow]}>+{amount}</Text>
        <Image source={UI.coin} style={{ width: 26 * u, height: 26 * u }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: { textShadowColor: 'rgba(0,0,0,0.75)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
});
