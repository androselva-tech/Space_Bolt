import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { gameStore, useGame } from '../game/store';
import { auth, useSession } from '../auth/session';
import { LEG_INFO, PARTS, PART_ORDER, UPGRADES, UPGRADE_MAX, WORLDS, stageInfo, upgradeCost, type UpgradeId, type WorldId } from '../game/rules';
import { SUBJECT_INFO, accuracyBySubject } from '../questions';
import { UI } from '../assets';
import { CARD, INK, LIGHT_GOLD, LIGHT_MUTED, MUTED, NIGHT, RED, lit, text } from '../theme';
import { WavyBox } from './SketchShapes';
import { PaperButton, Stars } from './StageOverlays';

const ACCENT: Record<WorldId, string> = { outbound: '#c9c3e8', homebound: '#5ab8ff' };
const TINT: Record<WorldId, string> = { outbound: 'rgba(60,60,90,0.45)', homebound: 'rgba(30,60,160,0.45)' };
/** Each page shows where that half of the trip is heading. */
const PLANET: Record<WorldId, number> = { outbound: UI.moon, homebound: UI.earth };

/** The mission map: a page per half of the trip (swipe or use the arrows), each a flight path through its 20 stages. */
export function MapScreen() {
  const win = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = size ?? win;
  const u = Math.max(0.7, Math.min(width / 900, height / 500, 1.4));
  const p = useGame((s) => s.profile);
  const totalStars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const store = gameStore.getState();
  const current = WORLDS.findIndex((w) => p.unlocked >= w.stages[0] && p.unlocked <= w.stages[1]);
  const [page, setPage] = useState(Math.max(0, current));
  const pager = useRef<ScrollView>(null);
  const headerH = 58 * u;
  const go = (i: number) => {
    const k = Math.max(0, Math.min(WORLDS.length - 1, i));
    pager.current?.scrollTo({ x: k * width, animated: true });
    setPage(k);
  };
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  const placed = useRef(false);
  useEffect(() => {
    placed.current = false;
    const id = setTimeout(() => {
      pager.current?.scrollTo({ x: page * width, animated: false });
      placed.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, [width]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <ScrollView
        key={width}
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: page * width, y: 0 }}
        onMomentumScrollEnd={(e) => placed.current && setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => {
          const k = Math.round(e.nativeEvent.contentOffset.x / width);
          if (placed.current && k !== page) setPage(k);
        }}
        scrollEventThrottle={100}
      >
        {WORLDS.map((w) => <WorldPage key={w.id} world={w} width={width} height={height} top={headerH} u={u} />)}
      </ScrollView>

      <View style={[styles.header, { height: headerH, paddingHorizontal: 14 * u, gap: 12 * u }]} pointerEvents="box-none">
        <Text style={lit(22 * u)} numberOfLines={1}>SPACE<Text style={{ color: LIGHT_GOLD }}>BOLT</Text></Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.row, { gap: 4 * u }]}>
          <Image source={UI.coin} style={{ width: 22 * u, height: 22 * u }} />
          <Text testID="map-wallet" style={lit(20 * u, { color: LIGHT_GOLD })}>{p.wallet.toLocaleString()}</Text>
        </View>
        <View style={[styles.row, { gap: 4 * u }]}>
          <Image source={UI.star} style={{ width: 22 * u, height: 22 * u }} />
          <Text style={lit(20 * u)}>{totalStars}</Text>
        </View>
        <PaperButton u={u * 0.85} label="HANGAR" onPress={() => store.setHangarOpen(true)} />
        <PaperButton u={u * 0.85} label="PROFILE" onPress={() => store.setProfileOpen(true)} />
        <PaperButton u={u * 0.85} testID="btn-start" label={p.unlocked > 1 ? `CONTINUE • ${p.unlocked}` : 'START'} primary onPress={() => store.startStage(p.unlocked)} />
      </View>

      <View style={[styles.dots, { bottom: 8 * u, gap: 10 * u }]} pointerEvents="box-none">
        <Arrow dir={-1} u={u} hidden={page === 0} onPress={() => go(page - 1)} />
        {WORLDS.map((w, i) => (
          <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.name} map`} onPress={() => go(i)} hitSlop={8}>
            <View style={{ width: (i === page ? 22 : 9) * u, height: 9 * u, borderRadius: 5 * u, backgroundColor: i === page ? ACCENT[w.id] : 'rgba(255,244,230,0.45)' }} />
          </Pressable>
        ))}
        <Arrow dir={1} u={u} hidden={page === WORLDS.length - 1} onPress={() => go(page + 1)} />
      </View>
    </View>
  );
}

function Arrow({ dir, u, onPress, hidden }: { dir: 1 | -1; u: number; onPress: () => void; hidden?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous mission' : 'Next mission'} onPress={onPress} disabled={hidden}
      style={[styles.arrow, { width: 34 * u, height: 34 * u, borderRadius: 17 * u, opacity: hidden ? 0 : 1 }]}>
      <Text style={lit(18 * u)}>{dir < 0 ? '‹' : '›'}</Text>
    </Pressable>
  );
}

/** The stage stops along a winding flight path: left to right along the bottom, then back along the top. */
function WorldPage({ world, width, height, top, u }: { world: (typeof WORLDS)[number]; width: number; height: number; top: number; u: number }) {
  const p = useGame((s) => s.profile);
  const locked = p.unlocked < world.stages[0];
  const pad = 50 * u;
  const usableH = height - top - 60 * u;
  const count = world.stages[1] - world.stages[0] + 1;
  const half = Math.ceil(count / 2);
  const pts: Array<[number, number]> = Array.from({ length: count }, (_, i) => {
    const row = i < half ? 0 : 1;
    const k = row === 0 ? i / (half - 1) : 1 - (i - half) / (count - half - 1);
    const x = pad + k * (width - pad * 2 - 30 * u);
    const y = top + usableH * (row === 0 ? 0.86 : 0.44) + Math.sin(k * Math.PI * 2) * usableH * 0.06;
    return [x, y];
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` C${x0 + (x1 - x0) / 2},${y0} ${x0 + (x1 - x0) / 2},${y1} ${x1},${y1}`;
  }
  const planet = Math.min(height * 0.62, width * 0.36);
  return (
    <View style={{ width, height }}>
      <Image source={UI.sky} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: TINT[world.id] }]} />
      <Image source={PLANET[world.id]} style={{ position: 'absolute', right: -planet * 0.25, top: top - planet * 0.2, width: planet, height: planet, opacity: 0.55 }} resizeMode="contain" />
      <View style={{ position: 'absolute', left: 16 * u, top: top + 4 * u, maxWidth: width * 0.5 }}>
        <Text style={lit(28 * u, { color: ACCENT[world.id] })}>{world.name}</Text>
        <Text style={lit(14 * u, { color: LIGHT_MUTED, letterSpacing: 0 })}>{world.tagline}</Text>
      </View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={d} stroke="rgba(255,255,255,0.55)" strokeWidth={3 * u} strokeDasharray={`${10 * u} ${9 * u}`} fill="none" />
      </Svg>
      {pts.map(([x, y], i) => <StageNode key={i} n={world.stages[0] + i} x={x} y={y} u={u} accent={ACCENT[world.id]} />)}
      {locked && (
        <View style={[StyleSheet.absoluteFill, styles.lockedScrim]} pointerEvents="none">
          <Text style={lit(22 * u)}>🔒 Finish {WORLDS.find((w) => w.stages[1] === world.stages[0] - 1)?.name} to unlock</Text>
        </View>
      )}
    </View>
  );
}

function StageNode({ n, x, y, u, accent }: { n: number; x: number; y: number; u: number; accent: string }) {
  const p = useGame((s) => s.profile);
  const info = stageInfo(n);
  const open = n <= p.unlocked;
  const stars = p.stars[n] ?? 0;
  const big = info.kind === 'boss';
  const r = (big ? 23 : 19) * u;
  const isNext = n === p.unlocked;
  return (
    <Pressable
      testID={`stage-${n}`}
      accessibilityRole="button"
      accessibilityLabel={`Stage ${n}${open ? '' : ', locked'}`}
      disabled={!open}
      onPress={() => gameStore.getState().startStage(n)}
      style={{ position: 'absolute', left: x - r, top: y - r, alignItems: 'center' }}
    >
      <View style={[styles.node, {
        width: r * 2, height: r * 2, borderRadius: r,
        backgroundColor: open ? (stars ? accent : CARD) : 'rgba(30,30,40,0.85)',
        borderColor: isNext ? '#ffd45c' : INK, borderWidth: isNext ? 4 : 2.5,
      }]}>
        <Text style={text((big ? 17 : 15) * u, { color: open ? INK : 'rgba(255,255,255,0.5)' })}>{open ? n : '🔒'}</Text>
      </View>
      <Text style={{ position: 'absolute', top: -10 * u, right: -12 * u, fontSize: 15 * u }}>{LEG_INFO[info.leg].icon}</Text>
      {open && stars > 0 && <View style={{ marginTop: 2 * u }}><Stars n={stars} size={13 * u} /></View>}
      {info.kind !== 'normal' && (
        <Text style={lit(10 * u, { color: info.kind === 'boss' ? '#ff9b8c' : '#ffd45c', marginTop: 1 })}>{info.kind === 'boss' ? LEG_INFO[info.leg].name : 'BONUS'}</Text>
      )}
    </Pressable>
  );
}

// --- hangar --------------------------------------------------------------------------------

/** Permanent rocket upgrades, bought with coins. */
export function HangarOverlay() {
  const open = useGame((s) => s.hangarOpen);
  const p = useGame((s) => s.profile);
  const { width, height } = useWindowDimensions();
  const u = Math.max(0.7, Math.min(width / 900, height / 500, 1.3));
  const [note, setNote] = useState<string | null>(null);
  if (!open) return null;
  const store = gameStore.getState();
  return (
    <View style={styles.scrim}>
      <WavyBox style={{ padding: 18 * u, width: Math.min(width - 32, 640 * u), maxHeight: height - 32 }} fill={CARD} seed={4}>
        <ScrollView>
          <Text style={text(30 * u, { textAlign: 'center' })}>HANGAR</Text>
          <Text style={text(14 * u, { textAlign: 'center', color: MUTED, letterSpacing: 0 })}>Upgrades stay on your rocket for every flight. You have {p.wallet.toLocaleString()} coins.</Text>
          <View style={{ gap: 8 * u, marginTop: 10 * u }}>
            {PART_ORDER.map((id) => {
              const up = UPGRADES[id as UpgradeId];
              const level = p.upgrades[id as UpgradeId] ?? 0;
              const maxed = level >= UPGRADE_MAX;
              const cost = upgradeCost(id as UpgradeId, level);
              return (
                <View key={id} style={[styles.row, styles.upgrade, { gap: 10 * u, padding: 8 * u }]}>
                  <Image source={UI[id]} style={{ width: 40 * u, height: 40 * u }} />
                  <View style={{ flex: 1 }}>
                    <Text style={text(17 * u)}>{up.name}</Text>
                    <Text style={text(13 * u, { color: MUTED, letterSpacing: 0 })}>{up.blurb}</Text>
                    <View style={[styles.row, { gap: 4 * u, marginTop: 3 * u }]}>
                      {Array.from({ length: UPGRADE_MAX }, (_, i) => (
                        <View key={i} style={{ width: 22 * u, height: 7 * u, borderRadius: 4 * u, backgroundColor: i < level ? PARTS[id].color : 'rgba(47,43,39,0.15)', borderWidth: 1, borderColor: INK }} />
                      ))}
                    </View>
                  </View>
                  {maxed ? <Text style={text(15 * u, { color: MUTED })}>MAX</Text> : (
                    <PaperButton u={u * 0.85} testID={`buy-${id}`} label={`BUY • ${cost}`} primary={p.wallet >= cost}
                      onPress={() => setNote(store.buyUpgrade(id as UpgradeId) ? `${up.name} level ${level + 1}!` : `You need ${cost - p.wallet} more coins`)} />
                  )}
                </View>
              );
            })}
          </View>
          {note && <Text style={text(15 * u, { textAlign: 'center', color: RED, marginTop: 8 * u, letterSpacing: 0 })}>{note}</Text>}
          <View style={[styles.row, { justifyContent: 'center', marginTop: 12 * u }]}>
            <PaperButton u={u} label="CLOSE" primary onPress={() => { setNote(null); store.setHangarOpen(false); }} />
          </View>
        </ScrollView>
      </WavyBox>
    </View>
  );
}

// --- profile -------------------------------------------------------------------------------

function Account({ u }: { u: number }) {
  const available = useSession((s) => s.available);
  const user = useSession((s) => s.user);
  const syncedAt = useSession((s) => s.syncedAt);
  const syncError = useSession((s) => s.syncError);
  const box = [styles.account, { padding: 10 * u, gap: 6 * u, marginVertical: 8 * u }];
  if (!available) {
    return (
      <View style={box}>
        <Text style={text(14 * u, { color: MUTED, letterSpacing: 0, textAlign: 'center' })}>
          {Platform.OS === 'web' ? 'Sign-in is available in the mobile app. Your progress is saved on this device.' : "Sign-in isn't set up in this build yet. Your progress is saved on this device."}
        </Text>
      </View>
    );
  }
  if (!user) {
    return (
      <View style={box}>
        <Text style={text(15 * u, { letterSpacing: 0, textAlign: 'center' })}>Optional: sign in to back up your progress and play on any device.</Text>
        <View style={[styles.row, { justifyContent: 'center', gap: 10 * u }]}>
          <PaperButton u={u * 0.9} label="SIGN IN" primary onPress={() => auth.open('login')} />
          <PaperButton u={u * 0.9} label="CREATE ACCOUNT" onPress={() => auth.open('signup')} />
        </View>
      </View>
    );
  }
  const when = syncedAt ? new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <View style={[box, styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
      <View style={{ flex: 1, minWidth: 180 * u }}>
        <Text style={text(16 * u)} numberOfLines={1}>{user.name || user.email}</Text>
        <Text style={text(13 * u, { color: syncError ? RED : MUTED, letterSpacing: 0 })}>
          {syncError ? "Couldn't reach the cloud. We'll keep trying." : when ? `Progress saved to the cloud • ${when}` : 'Saving progress to the cloud…'}
        </Text>
      </View>
      <PaperButton u={u * 0.85} label="SIGN OUT" onPress={auth.signOut} />
    </View>
  );
}


export function ProfileOverlay() {
  const open = useGame((s) => s.profileOpen);
  const p = useGame((s) => s.profile);
  const { width, height } = useWindowDimensions();
  const u = Math.max(0.7, Math.min(width / 900, height / 500, 1.3));
  const [confirm, setConfirm] = useState(false);
  if (!open) return null;
  const store = gameStore.getState();
  const st = p.stats;
  const world = WORLDS.slice().reverse().find((w) => p.unlocked >= w.stages[0]) ?? WORLDS[0];
  const rows: Array<[string, string]> = [
    ['QUESTIONS ANSWERED', st.answered.toLocaleString()],
    ['RIGHT ANSWERS', st.right.toLocaleString()],
    ['ACCURACY', `${st.answered ? ((st.right / st.answered) * 100).toFixed(1) : '0'}%`],
    ['BEST STREAK', `${st.bestStreak}`],
    ['ROCKET PARTS BUILT', st.partsBuilt.toLocaleString()],
    ['COINS EARNED', st.coinsEarned.toLocaleString()],
    ['MISSION', world.name],
    ['STAGES COMPLETED', `${Object.keys(p.stars).length}`],
    ['QUESTIONS TO REVISE', `${Object.keys(p.history.failed).length}`],
    ['PLAYER AGE', p.ageGroup === 'child' ? '13 or under' : p.ageGroup === 'general' ? '14 or over' : 'not set'],
  ];
  const subjects = accuracyBySubject(p.history);
  return (
    <View style={styles.scrim}>
      <WavyBox style={{ padding: 18 * u, width: Math.min(width - 32, 620 * u), maxHeight: height - 32 }} fill={CARD} seed={5}>
        <ScrollView>
          <Text style={text(30 * u, { textAlign: 'center' })}>PROFILE</Text>
          <Account u={u} />
          {rows.map(([k, v]) => (
            <View key={k} style={styles.statRow}>
              <Text style={text(16 * u)}>{k}</Text>
              <Text style={text(16 * u)}>{v}</Text>
            </View>
          ))}
          {subjects.length > 0 && <Text style={text(18 * u, { marginTop: 10 * u })}>RECENT ACCURACY BY SUBJECT</Text>}
          {subjects.map((r) => {
            const info = SUBJECT_INFO[r.subject];
            return (
              <View key={r.subject} style={[styles.row, { gap: 8 * u, marginTop: 3 * u }]}>
                <Text style={text(13 * u, { width: 110 * u, letterSpacing: 0 })}>{info.name}</Text>
                <View style={{ flex: 1, height: 10 * u, backgroundColor: '#e2d8c3', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${(r.ok / r.total) * 100}%`, height: '100%', backgroundColor: info.color }} />
                </View>
                <Text style={text(13 * u, { width: 44 * u, textAlign: 'right' })}>{Math.round((r.ok / r.total) * 100)}%</Text>
              </View>
            );
          })}
          <Text style={text(12 * u, { color: MUTED, letterSpacing: 0, marginTop: 8 * u })}>
            Players 13 or under see only child-safe ads. A changed age applies the next time the app starts.
          </Text>
          <View style={[styles.row, { justifyContent: 'center', gap: 12, marginTop: 14 * u, flexWrap: 'wrap' }]}>
            <PaperButton u={u} testID="btn-change-age" label="CHANGE AGE" onPress={() => { store.setAgeGroup(null); store.setProfileOpen(false); }} />
            <PaperButton u={u} label={confirm ? 'YES, RESET' : 'RESET PROGRESS'} onPress={() => {
              if (!confirm) return setConfirm(true);
              store.resetProgress();
              setConfirm(false);
            }} />
            <PaperButton u={u} label="CLOSE" primary onPress={() => { setConfirm(false); store.setProfileOpen(false); }} />
          </View>
        </ScrollView>
      </WavyBox>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center' },
  arrow: { backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1.5, borderColor: 'rgba(255,244,230,0.5)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  node: { alignItems: 'center', justifyContent: 'center' },
  lockedScrim: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  account: { borderWidth: 1.5, borderColor: 'rgba(47,43,39,0.25)', borderRadius: 10, backgroundColor: 'rgba(255,250,240,0.7)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: 'rgba(47,43,39,0.2)', paddingVertical: 3 },
  upgrade: { borderWidth: 1.5, borderColor: 'rgba(47,43,39,0.25)', borderRadius: 10, backgroundColor: 'rgba(255,250,240,0.7)' },
});
