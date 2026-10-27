import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import brand from '../brand.json';

const LOGO = require('../../assets/splash-logo.png');
/** splash-logo.png's shape (width / height), written by tools/make-icons.mjs. */
const LOGO_ASPECT = brand.logoAspect;
const BAR = '#8ee07c';

/** Stars: [x, y, radius], as fractions of the screen (fixed, so the sky looks the same every launch). */
const STARS: Array<[number, number, number]> = [
  [0.27, 0.18, 0.004], [0.69, 0.08, 0.005], [0.89, 0.28, 0.006], [0.08, 0.45, 0.005], [0.16, 0.08, 0.003],
  [0.95, 0.62, 0.004], [0.58, 0.22, 0.003], [0.38, 0.06, 0.003], [0.04, 0.2, 0.003], [0.8, 0.5, 0.003],
];

/**
 * The launch screen: navy sky with a few stars, a dark planet's curve along the bottom, the SpaceBolt logo,
 * and a loading bar. Drawn live (not a picture), so it fits every screen shape. `progress` 0..1.
 */
export function Splash({ progress, onShown }: { progress: number; onShown?: () => void }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: progress, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress]);
  const onLayout = (e: LayoutChangeEvent) => {
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
    onShown?.();
  };

  const { w, h } = box;
  // the logo: as big as fits above the dark curve, never huge on a tablet
  const logoH = Math.min(h * 0.62, (w * 0.6) / LOGO_ASPECT, 560);
  const barW = Math.min(w * 0.22, 420);
  const unit = Math.min(w, h);
  return (
    <View style={styles.root} onLayout={onLayout}>
      {w > 0 && (
        <>
          <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
            {STARS.map(([x, y, r], i) => (
              <Circle key={i} cx={x * w} cy={y * h} r={Math.max(2, r * unit * 1.6)} fill="#ffffff" opacity={0.35} />
            ))}
            {/* two dark curves along the bottom, like a planet seen from orbit */}
            <Path d={`M0 ${h * 0.88} C ${w * 0.25} ${h * 0.82}, ${w * 0.55} ${h * 0.86}, ${w * 0.8} ${h * 0.84} S ${w} ${h * 0.84}, ${w} ${h * 0.84} L ${w} ${h} L 0 ${h} Z`} fill="#0c1d3a" />
            <Path d={`M0 ${h * 0.93} C ${w * 0.3} ${h * 0.9}, ${w * 0.6} ${h * 0.92}, ${w} ${h * 0.9} L ${w} ${h} L 0 ${h} Z`} fill="#09162d" />
          </Svg>
          <Image source={LOGO} style={{ width: logoH * LOGO_ASPECT, height: logoH, marginTop: -h * 0.06 }} resizeMode="contain" />
          <View style={[styles.track, { width: barW, height: Math.max(8, unit * 0.016), borderRadius: unit, bottom: h * 0.07 }]}>
            <Animated.View style={[styles.bar, { width: fill.interpolate({ inputRange: [0, 1], outputRange: [0, barW] }) }]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.splashBackground, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  track: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: BAR, borderRadius: 999 },
});
