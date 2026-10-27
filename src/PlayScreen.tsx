import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from './scene/r3f';
import { FlightScene, flight, viewZoom } from './flight/FlightScene';
import { LaunchScene } from './cinematic/LaunchScene';
import { LandingScene } from './cinematic/LandingScene';
import { SplashdownScene } from './cinematic/SplashdownScene';
import { MoonWalk3D } from './moonwalk/MoonWalk3D';
import { WalkPad } from './moonwalk/WalkPad';
import { Dock3D } from './station/Dock3D';
import { DockPanel } from './station/DockPanel';
import { RepairBay } from './station/RepairBay';
import { MovieOverlay } from './cinematic/MovieOverlay';
import { QuizPanel, PanelShade } from './ui/QuizPanel';
import { FlightHud } from './ui/FlightHud';
import { CoinFlight } from './ui/CoinFlight';
import { StageOverlays } from './ui/StageOverlays';
import { PauseOverlay } from './ui/PauseControl';
import { Workshop } from './workshop/Workshop';
import { PaintShop } from './workshop/PaintShop';
import { NIGHT } from './theme';
import { gameStore, useGame } from './game/store';
import { CEIL, FLOOR } from './game/rules';

const FULL = { x: 0, y: 0, w: 1, h: 1 };

/**
 * The play screen. Questions float over the left side; the right side (the "stage") shows the
 * workshop, the paint shop, the launch pad, the journey, the Moon walk, the docking or the repair
 * bay. The launch, landing and splashdown movies take the whole screen. On a portrait screen the
 * stage is the top half and the questions sit below.
 */
export function PlayScreen() {
  const win = useWindowDimensions();
  const root = useRef<View>(null);
  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const { width, height } = box ?? win;
  const portrait = height > width * 1.1;
  const phase = useGame((s) => s.phase);
  const paused = useGame((s) => !!s.event);
  const movie = phase === 'launch' || phase === 'landing' || phase === 'splashdown';

  const adv = movie ? { x: 0, y: 0, w: width, h: height }
    : portrait ? { x: 0, y: 0, w: width, h: height * 0.5 }
    : { x: width * PANEL, y: 0, w: width * (1 - PANEL), h: height };
  const stage = useMemo(() => ({ x: adv.x / width, y: adv.y / height, w: adv.w / width, h: adv.h / height }), [portrait, width, height, movie]);
  const zoom = viewZoom(adv.w, adv.h);
  const to = { x: adv.x + adv.w * 0.5, y: adv.y + adv.h * 0.45 };
  const from = portrait ? { x: width / 2, y: height * 0.75 } : { x: width * PANEL * 0.5, y: height * 0.55 };
  const u = Math.max(0.65, Math.min(adv.w / 800, adv.h / 520, 1.4));
  const mu = Math.max(0.65, Math.min(width / 900, height / 520, 1.4));

  useSteerKeys();

  return (
    <View style={styles.root} ref={root} onLayout={() => root.current?.measureInWindow((x, y, w, h) => setBox({ x, y, width: w, height: h }))}>
      {/* the Moon walk is a real 3D scene, with its own perspective camera and lighting */}
      {phase === 'moonwalk' ? (
        <Canvas key="moon3d" camera={{ fov: 50, near: 5, far: 40000, position: [0, 500, 900] }} style={StyleSheet.absoluteFill}
          onCreated={(st) => { if (__DEV__) (globalThis as { __three?: unknown }).__three = st; }}>
          <MoonWalk3D stage={stage} />
        </Canvas>
      ) : phase === 'dock' ? (
        <Canvas key="dock3d" camera={{ fov: 55, near: 0.5, far: 8000, position: [0, 0, 0] }} style={StyleSheet.absoluteFill}
          onCreated={(st) => { if (__DEV__) (globalThis as { __three?: unknown }).__three = st; }}>
          <Dock3D stage={stage} />
        </Canvas>
      ) : (
      <Canvas orthographic flat linear camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 500 }} style={StyleSheet.absoluteFill}
        onCreated={(st) => { if (__DEV__) (globalThis as { __three?: unknown }).__three = st; }}>
        {(phase === 'fly' || phase === 'prep') && <FlightScene onReady={() => {}} stage={stage} />}
        {(phase === 'fuel' || phase === 'launch') && <LaunchScene stage={phase === 'launch' ? FULL : stage} />}
        {phase === 'landing' && <LandingScene />}
        {phase === 'splashdown' && <SplashdownScene />}
      </Canvas>
      )}
      {!movie && (
        <>
          <View pointerEvents="none" style={portrait ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.5 / SHADE_FADE } : { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * PANEL / SHADE_FADE }}>
            <PanelShade dir={portrait ? 'bottom' : 'left'} fadeFrom={SHADE_FADE} />
          </View>
          <View style={portrait ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.5 } : { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * PANEL }}>
            <QuizPanel />
          </View>
          <View style={{ position: 'absolute', left: adv.x, top: adv.y, width: adv.w, height: adv.h }} pointerEvents="box-none">
            {phase === 'fly' && !paused && <SteerPad zoom={zoom} />}
            {phase === 'build' && <Workshop u={u} />}
            {phase === 'paint' && <PaintShop u={u} />}
            {phase === 'moonwalk' && <WalkPad u={u} />}
            {phase === 'dock' && <DockPanel u={u} />}
            {phase === 'repair' && <RepairBay u={u} />}
            <FlightHud u={u} onMap={() => gameStore.getState().openMap()} />
          </View>
          <CoinFlight from={from} to={to} u={u} />
        </>
      )}
      {movie && <MovieOverlay u={mu} />}
      <StageOverlays u={u} />
      <PauseOverlay u={mu} />
    </View>
  );
}

/** The question panel's share of the screen (landscape). */
const PANEL = 0.38;
const SHADE_FADE = 0.7;

const styles = StyleSheet.create({
  // no text selection while dragging parts with a mouse (web)
  root: { flex: 1, backgroundColor: NIGHT, ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : {}) },
});

/** Steering: drag anywhere in the flight area (like a trackpad); let go and the rocket holds its height. */
function SteerPad({ zoom }: { zoom: number }) {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pan = useMemo(() => {
    let baseY = 0;
    let y0 = 0;
    const store = () => gameStore.getState();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => store().phase === 'fly',
      onMoveShouldSetPanResponder: () => store().phase === 'fly',
      onPanResponderGrant: (_, g) => { baseY = flight.y; y0 = g.y0; store().setSteerY(baseY); },
      onPanResponderMove: (_, g) => {
        const y = baseY - ((g.moveY - y0) / Math.max(0.2, zoomRef.current)) * 1.25;
        store().setSteerY(Math.max(FLOOR, Math.min(CEIL, y)));
      },
      onPanResponderRelease: () => store().setSteerY(null),
      onPanResponderTerminate: () => store().setSteerY(null),
      onPanResponderTerminationRequest: () => false,
    });
  }, []);
  return <View testID="steer-pad" style={StyleSheet.absoluteFill} {...pan.panHandlers} accessibilityLabel="Steering: drag up or down to steer the rocket" />;
}

/** Web (testing on a computer): ↑ / W climbs, ↓ / S dives. */
function useSteerKeys() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const s = () => gameStore.getState();
    const held = new Set<string>();
    const apply = () => s().setSteerDir(held.has('up') && !held.has('down') ? 1 : held.has('down') && !held.has('up') ? -1 : 0);
    const key = (e: KeyboardEvent) => (e.key === 'ArrowUp' || e.key === 'w' ? 'up' : e.key === 'ArrowDown' || e.key === 's' ? 'down' : null);
    const down = (e: KeyboardEvent) => { const k = key(e); if (!k) return; held.add(k); apply(); e.preventDefault(); };
    const up = (e: KeyboardEvent) => { const k = key(e); if (!k) return; held.delete(k); apply(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
}
