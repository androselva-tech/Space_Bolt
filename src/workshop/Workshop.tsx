import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';
import { BOLT_TURNS, gameStore, orderFor, useGame } from '../game/store';
import { PARTS, VIEW, vehicleOf, viewBox, type PartId } from '../rocket/model';
import { PartSvg, RocketSide } from '../rocket/RocketSvg';
import { LIGHT, LIGHT_GOLD, LIGHT_MUTED, lit } from '../theme';

const BLUEPRINT = '#0f2445';
const GRID = 'rgba(127,214,255,0.12)';
const OK = '#8ee07c';

/** A part's box in its craft's workshop view (the rocket on its side, the shuttle upright). */
const sideBox = viewBox;

/**
 * The workshop, over the flight area while building: the rocket on its stand on a blueprint, the
 * part just made waiting in the tray, and the prototype to build it like. Answer questions to make
 * each part, drag it to its place, then tap each bolt until it's tight. A blueprint ghost shows
 * every part still to come.
 */
export function Workshop({ u }: { u: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const root = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
    root.current?.measureInWindow((x, y) => { origin.current = { x, y }; });
  };
  const a = useGame((s) => s.assembly);
  const design = useGame((s) => s.design);
  const stage = useGame((s) => s.stage);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const order = orderFor(stage);
  const vehicle = vehicleOf(order[0]);
  const V = VIEW[vehicle];

  const { w: W, h: H } = box;
  const trayH = Math.max(84, H * 0.27);
  const top = 50 * u;
  const s = Math.min((W * 0.92) / V.w, (H - trayH - top - 16 * u) / V.h);
  const ox = (W - V.w * s) / 2;
  const oy = top + (H - trayH - top - V.h * s) / 2;
  const ghosts = true;
  const fitted = order.filter((p) => a.fitted[p]);
  const current = order[a.index] as PartId | undefined;
  const loose = fitted.find((p) => !a.fitted[p]!.locked);

  // dev builds: where a part belongs on screen (page coordinates), for automated play-testing
  if (__DEV__) (globalThis as { __partTarget?: unknown }).__partTarget = (part: PartId) => {
    const pb = sideBox(part);
    return { x: origin.current.x + ox + (pb.X + pb.W / 2) * s, y: origin.current.y + oy + (pb.Y + pb.H / 2) * s };
  };

  const drop = (x: number, y: number) => {
    const part = a.tray;
    if (!part || x < 0) return;
    const b = sideBox(part);
    const cx = ox + (b.X + b.W / 2) * s, cy = oy + (b.Y + b.H / 2) * s;
    const size = Math.max(b.W, b.H) * s;
    const tol = Math.max(ghosts ? 44 : 28, size * (ghosts ? 0.32 : 0.2));
    const store = gameStore.getState();
    if (Math.hypot(x - cx, y - cy) <= tol) store.placePart(part);
    else if (y < H - trayH) store.misfit(part);
  };

  return (
    <View ref={root} style={[StyleSheet.absoluteFill, styles.root]} onLayout={onLayout}>
      {W > 0 && (
        <>
          <Grid w={W} h={H} />
          <Header u={u} top={top} />
          <Svg width={W} height={H - trayH} style={StyleSheet.absoluteFill} pointerEvents="none">
            <G transform={`translate(${ox} ${oy}) scale(${s})`}>
              {vehicle === 'rocket' ? <Stand /> : <Line x1={20} y1={612} x2={700} y2={612} stroke="rgba(127,214,255,0.45)" strokeWidth={8} />}
              <G transform={V.matrix}>
                {ghosts && order.filter((p) => !a.fitted[p]).map((p) => (
                  <G key={p} opacity={p === current ? 1 : 0.45}><PartSvg id={p} design={design} ghost scale={s} /></G>
                ))}
                {[...fitted].sort((p, q) => PARTS[p].z - PARTS[q].z).map((p) => <PartSvg key={p} id={p} design={design} scale={s} />)}
              </G>
            </G>
          </Svg>
          {loose && <Bolts part={loose} ox={ox} oy={oy} s={s} u={u} />}
          <View style={[styles.tray, { height: trayH, paddingHorizontal: 10 * u, gap: 10 * u }]}>
            <View style={[styles.row, { flex: 1, gap: 10 * u }]}>
              {a.tray ? (
                <TrayPart part={a.tray} size={trayH - 22 * u} u={u} dragging={!!drag} origin={origin}
                  onMove={(x, y) => setDrag({ x, y })} onDrop={(x, y) => { setDrag(null); drop(x, y); }} />
              ) : (
                <Text style={lit(14 * u, { color: LIGHT_MUTED, letterSpacing: 0, flex: 1, textAlign: 'center' })}>
                  {loose ? 'Tap each bolt until it is tight' : current ? `Answer the questions to make the ${PARTS[current].name.toLowerCase()}` : 'All parts on!'}
                </Text>
              )}
            </View>
            <Prototype u={u} w={Math.min(W * (vehicle === 'rocket' ? 0.34 : 0.2), 210 * u)} />
          </View>
          {drag && a.tray && <Dragged part={a.tray} x={drag.x} y={drag.y} s={s} />}
        </>
      )}
    </View>
  );
}

function Grid({ w, h }: { w: number; h: number }) {
  const step = 28;
  const lines = [];
  for (let x = step; x < w; x += step) lines.push(<Line key={`x${x}`} x1={x} y1={0} x2={x} y2={h} stroke={GRID} strokeWidth={1} />);
  for (let y = step; y < h; y += step) lines.push(<Line key={`y${y}`} x1={0} y1={y} x2={w} y2={y} stroke={GRID} strokeWidth={1} />);
  return <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">{lines}</Svg>;
}

/** Two trestles under the rocket (side-view units). */
function Stand() {
  const c = 'rgba(127,214,255,0.45)';
  const y = 300;
  return (
    <G>
      <Path d={`M190,${y + 30} L230,${y - 70} L270,${y + 30}`} stroke={c} strokeWidth={8} fill="none" />
      <Path d={`M560,${y + 30} L600,${y - 70} L640,${y + 30}`} stroke={c} strokeWidth={8} fill="none" />
      <Line x1={150} y1={y - 70} x2={690} y2={y - 70} stroke={c} strokeWidth={8} />
    </G>
  );
}

/** What to do now, and the latest message (a misfit hint, PERFECT FIT, LOCKED IN) for a few seconds. */
function Header({ u, top }: { u: number; top: number }) {
  const a = useGame((s) => s.assembly);
  const feedback = useGame((s) => s.feedback);
  const [shown, setShown] = useState<typeof feedback>(null);
  useEffect(() => {
    setShown(feedback);
    const id = setTimeout(() => setShown(null), 3500);
    return () => clearTimeout(id);
  }, [feedback?.id]);
  const order = orderFor(useGame((s) => s.stage));
  const loose = order.find((p) => a.fitted[p] && !a.fitted[p]!.locked);
  const current = order[a.index] as PartId | undefined;
  const text = loose ? `BOLT ON THE ${PARTS[loose].name}: TAP EACH BOLT ${BOLT_TURNS} TIMES`
    : a.tray ? `DRAG THE ${PARTS[a.tray].name} TO ITS PLACE`
    : current ? `PART ${a.index + 1} OF ${order.length}: ${PARTS[current].name}`
    : 'ROCKET BUILT!';
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center' }} pointerEvents="none">
      <Text testID="workshop-step" style={lit(15 * u, { color: LIGHT_GOLD, letterSpacing: 0.5, textAlign: 'center' })}>{text}</Text>
      {shown && (
        <Text style={lit(13 * u, { color: shown.kind === 'wrong' ? '#ff9b8c' : shown.kind === 'correct' ? OK : LIGHT, letterSpacing: 0, textAlign: 'center', marginTop: 2 * u, paddingHorizontal: 12 * u })} numberOfLines={2}>
          {shown.text}{shown.sub ? `  ${shown.sub}` : ''}
        </Text>
      )}
    </View>
  );
}

/** The bolt holes of the part just fitted. */
function Bolts({ part, ox, oy, s, u }: { part: PartId; ox: number; oy: number; s: number; u: number }) {
  const f = useGame((st) => st.assembly.fitted[part]);
  if (!f || f.locked) return null;
  return (
    <>
      {PARTS[part].bolts.map(([bx, by], k) => {
        const [vx, vy] = VIEW[vehicleOf(part)].toView(bx, by);
        return <Bolt key={k} part={part} k={k} turns={f.bolts[k]} x={ox + vx * s} y={oy + vy * s} u={u} />;
      })}
    </>
  );
}

/** A bolt hole: tap once to put the bolt in, then tap to turn it until it's tight. */
function Bolt({ part, k, turns, x, y, u }: { part: PartId; k: number; turns: number; x: number; y: number; u: number }) {
  const d = 22 * u;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const tight = turns >= BOLT_TURNS;
  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  return (
    <Pressable
      testID={`bolt-${part}-${k}`}
      accessibilityRole="button"
      accessibilityLabel={`Bolt ${k + 1}: ${turns === 0 ? 'empty' : tight ? 'tight' : `${turns} of ${BOLT_TURNS} turns`}`}
      hitSlop={10}
      onPress={() => gameStore.getState().turnBolt(part, k)}
      style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d }}
    >
      {turns === 0 ? (
        <>
          <Animated.View style={[styles.boltRing, { width: d, height: d, borderRadius: d / 2, transform: [{ scale: ring }] }]} />
          <View style={[styles.hole, { width: d * 0.6, height: d * 0.6, borderRadius: d, left: d * 0.2, top: d * 0.2 }]} />
        </>
      ) : (
        <View style={[styles.head, { width: d, height: d, borderRadius: d / 2, backgroundColor: tight ? '#b9e6b0' : '#c7ccd4', transform: [{ rotate: `${turns * 60}deg` }] }]}>
          <View style={{ width: d * 0.7, height: 3, backgroundColor: '#3b3f46', borderRadius: 2 }} />
          <View style={{ position: 'absolute', width: 3, height: d * 0.7, backgroundColor: '#3b3f46', borderRadius: 2 }} />
        </View>
      )}
    </Pressable>
  );
}

/** A part drawn on its own, fitted to a box. */
function PartAlone({ part, width, height }: { part: PartId; width: number; height: number }) {
  const design = useGame((s) => s.design);
  const b = sideBox(part);
  const pad = 8;
  return (
    <Svg width={width} height={height} viewBox={`${b.X - pad} ${b.Y - pad} ${b.W + pad * 2} ${b.H + pad * 2}`}>
      <G transform={VIEW[vehicleOf(part)].matrix}><PartSvg id={part} design={design} scale={width / (b.W + pad * 2)} /></G>
    </Svg>
  );
}

/** The part just made, waiting in the tray: drag it up to the rocket. */
function TrayPart({ part, size, u, dragging, origin, onMove, onDrop }: {
  part: PartId; size: number; u: number; dragging: boolean; origin: React.RefObject<{ x: number; y: number }>;
  onMove: (x: number, y: number) => void; onDrop: (x: number, y: number) => void;
}) {
  const cb = useRef({ onMove, onDrop });
  cb.current = { onMove, onDrop };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, g) => cb.current.onMove(g.x0 - origin.current.x, g.y0 - origin.current.y),
    onPanResponderMove: (_, g) => cb.current.onMove(g.moveX - origin.current.x, g.moveY - origin.current.y),
    onPanResponderRelease: (_, g) => cb.current.onDrop(g.moveX - origin.current.x, g.moveY - origin.current.y),
    onPanResponderTerminate: () => cb.current.onDrop(-1, -1),
    onPanResponderTerminationRequest: () => false,
  }), []);
  const b = sideBox(part);
  const w = Math.min(size * 2.2, 220 * u), h = size * 0.7;
  const k = Math.min(w / b.W, h / b.H);
  return (
    <View testID="tray-part" style={[styles.trayItem, { height: size, paddingHorizontal: 10 * u, opacity: dragging ? 0.3 : 1, borderRadius: 10 * u }]} {...pan.panHandlers}>
      <PartAlone part={part} width={b.W * k + 16} height={b.H * k + 16} />
      <Text style={lit(11 * u, { letterSpacing: 0, textAlign: 'center' })} numberOfLines={1}>{PARTS[part].name} • DRAG ME</Text>
    </View>
  );
}

/** The part under the finger, at full size so it lines up with its place. */
function Dragged({ part, x, y, s }: { part: PartId; x: number; y: number; s: number }) {
  const b = sideBox(part);
  const w = (b.W + 16) * s, h = (b.H + 16) * s;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: 0.92 }}>
      <PartAlone part={part} width={w} height={h} />
    </View>
  );
}

/** The picture to build from: the finished rocket. */
function Prototype({ u, w }: { u: number; w: number }) {
  const design = useGame((s) => s.design);
  const vehicle = vehicleOf(orderFor(useGame((s) => s.stage))[0]);
  return (
    <View style={[styles.proto, { width: w, padding: 6 * u, borderRadius: 10 * u }]} pointerEvents="none">
      <Text style={lit(10 * u, { color: LIGHT_MUTED, letterSpacing: 1 })}>{vehicle === 'rocket' ? 'PROTOTYPE' : 'LUNAR SHUTTLE'}</Text>
      <RocketSide design={design} width={w - 12 * u} vehicle={vehicle} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BLUEPRINT },
  row: { flexDirection: 'row', alignItems: 'center' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderTopWidth: 1.5, borderColor: 'rgba(127,214,255,0.35)' },
  trayItem: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: LIGHT_GOLD, backgroundColor: 'rgba(255,255,255,0.06)', gap: 2 },
  proto: { marginLeft: 'auto', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(127,214,255,0.4)' },
  boltRing: { position: 'absolute', borderWidth: 2.5, borderColor: LIGHT_GOLD },
  hole: { position: 'absolute', backgroundColor: '#05070d', borderWidth: 1.5, borderColor: '#8a93a3' },
  head: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1d1818' },
  launch: { backgroundColor: OK, borderWidth: 3, borderColor: LIGHT },
});
