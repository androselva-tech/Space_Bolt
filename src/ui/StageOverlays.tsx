import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gameStore, useGame } from '../game/store';
import {
  DOCK, EVENT_INFO, HAZARD_INFO, STAGE_COUNT, SYSTEM_ORDER, WORLDS, fuelNeed, partAnswers, prepPlan, repairNeed, stageEvents, stormQuestions, walkParts,
  type HazardType, type StageInfo,
} from '../game/rules';
import { BUILD_ORDER, SHUTTLE_ORDER, PARTS as ROCKET_PARTS } from '../rocket/model';
import { UI } from '../assets';
import { CARD, INK, MUTED, RED, text } from '../theme';
import { WavyBox } from './SketchShapes';
import { maybeShowInterstitial } from '../ads/interstitialAds';

/** `large`: the big, easy-to-hit version used in popups (at least 52 high, 24 text). */
export function PaperButton({ label, onPress, primary, u = 1, testID, large }: { label: string; onPress: () => void; primary?: boolean; u?: number; testID?: string; large?: boolean }) {
  return (
    <Pressable
      testID={testID ?? `btn-${label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, large
        ? { paddingHorizontal: Math.max(26, 26 * u), minHeight: Math.max(52, 48 * u), justifyContent: 'center' as const, minWidth: Math.max(110, 100 * u) }
        : { paddingHorizontal: 18 * u, paddingVertical: 6 * u },
        { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <Text style={text(large ? Math.max(24, 26 * u) : 18 * u, { color: primary ? CARD : INK, textAlign: 'center' })}>{label}</Text>
    </Pressable>
  );
}

/** The text and picture size in the stage popups: bigger than the game screen's, so it reads on a phone. */
const POP = 1.4;
const popSize = (u: number, n: number) => Math.max(n * 0.9, n * u * POP);

export function Stars({ n, size }: { n: number; size: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.1 }}>
      {[0, 1, 2].map((i) => <Image key={i} source={i < n ? UI.star : UI.starEmpty} style={{ width: size, height: size }} />)}
    </View>
  );
}

const HAZARD_ART: Record<HazardType, number> = {
  meteor: UI.rock, asteroid: UI.bigRock, boulder: UI.bigRock, comet: UI.rock, debris: UI.junkSatellite, panel: UI.junkPanel,
};

/** The steps of a stage, for its round card. */
function stepsFor(stage: StageInfo): Array<[string, string]> {
  const need = fuelNeed(stage);
  const fuel: [string, string] = ['FUEL', `${need.fuel + need.oxidizer + need.crew} right answers`];
  const check: [string, string] = ['CHECK', `${prepPlan(stage).length} systems questions`];
  switch (stage.leg) {
    case 'earthLaunch': {
      const partQs = BUILD_ORDER.reduce((n, p) => n + partAnswers(stage, ROCKET_PARTS[p].major), 0);
      return [['BUILD', `${BUILD_ORDER.length} parts • ${partQs} right answers`], ['PAINT', 'colours and a name'], fuel, ['LAUNCH', 'IGNITION!'], ['ORBIT', 'fly around Earth']];
    }
    case 'moonLaunch': return [['BUILD', `the Lunar Shuttle: ${SHUTTLE_ORDER.length} parts you found`], fuel, ['LIFTOFF', 'the struts stay behind'], ['ORBIT', 'around the Moon']];
    case 'moonwalk': {
      const parts = walkParts(stage);
      return [['WALK', 'any direction'], ['FIND', `${parts.length} rocket parts`], ['ANSWER', `${parts.reduce((n, p) => n + partAnswers(stage, ROCKET_PARTS[p].major), 0)} right answers`], ['CARRY', 'back for the rebuild']];
    }
    case 'storm': return [check, ['FLY', 'into deep space'], ['STORM', `${stormQuestions(stage)} questions charge shields`], ['DODGE', 'find the gaps in the rocks']];
    case 'fault': return [check, ['FLY', 'into deep space'], ['FIX', 'failures with logic'], ['SURVIVE', `${stageEvents(stage).length} emergencies`]];
    case 'moonLanding': return [check, ['FLY', 'the last stretch'], ['LAND', 'slowly, on the Moon'], ['FLAG', 'the first steps']];
    case 'transfer': return [['FLY', 'to the space station'], ['BURNS', `${stageEvents(stage).length} questions`], ['ARRIVE', 'at the station']];
    case 'dock': return [['MATCH', 'the station\'s spin'], ['CENTRE', 'on the docking port'], ['CLOSE IN', `slower than ${DOCK.speedTol} m/s`], ['SEAL', 'docked!']];
    case 'repair': return [['REPAIR', `${SYSTEM_ORDER.length} systems`], ['ANSWER', `${SYSTEM_ORDER.reduce((n, id) => n + repairNeed(id), 0)} right answers`], ['READY', 'for the ride home']];
    case 'reentry': return [['UNDOCK', 'the crew capsule'], ['RE-ENTRY', 'through the fire'], ['CHUTES', 'you fire them'], ['SPLASH', 'down in the sea']];
    default: return [check, ['FLY', 'into deep space'], ['SURVIVE', `${stageEvents(stage).length} emergencies`], ['ARRIVE', 'at the checkpoint']];
  }
}

/** Before each flight: the parts to build and the hazards on the coming course (new ones first). GO starts the questions. */
function RoundCard({ u }: { u: number }) {
  const intro = useGame((s) => s.intro);
  const stage = useGame((s) => s.stage);
  if (!intro || !stage) return null;
  const steps = stepsFor(stage);
  // what's coming: the show stoppers first (new ones on top), then the hazards
  type Row = { key: string; name: string; how: string; isNew: boolean; art?: number; icon?: string };
  // keys say which list a row is from: the emergency "debris" and the hazard "debris" both exist
  const events: Row[] = intro.events.map((k) => ({ key: `event-${k}`, name: EVENT_INFO[k].name, how: EVENT_INFO[k].how, isNew: intro.freshEvents.includes(k), icon: EVENT_INFO[k].icon }));
  const hazards: Row[] = intro.hazards.map((h) => ({ key: `hazard-${h}`, name: HAZARD_INFO[h].name, how: HAZARD_INFO[h].how, isNew: intro.fresh.includes(h), art: HAZARD_ART[h] }));
  const rows = [...events.filter((r) => r.isNew), ...hazards.filter((r) => r.isNew), ...events.filter((r) => !r.isNew), ...hazards.filter((r) => !r.isNew)];
  const f = (n: number) => popSize(u, n);
  return (
    <View style={styles.scrim}>
      <WavyBox style={[styles.card, { padding: f(14), gap: f(6), maxHeight: '96%' }]} fill={CARD} seed={9}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ alignItems: 'center', gap: f(5) }} showsVerticalScrollIndicator={false}>
          <Text style={text(f(26), { textAlign: 'center' })}>{intro.title}</Text>
          <Text style={text(f(15), { color: MUTED, letterSpacing: 0, textAlign: 'center' })}>{intro.sub}</Text>
          <View style={{ flexDirection: 'row', gap: f(8), marginTop: f(4), flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map(([k, v], i) => (
              <View key={k} style={{ alignItems: 'center', width: f(92) }}>
                <Text style={text(f(16), { color: RED })}>{i + 1}. {k}</Text>
                <Text style={text(f(12), { letterSpacing: 0, textAlign: 'center', color: MUTED })}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: f(4), gap: f(6), alignSelf: 'stretch' }}>
            {rows.slice(0, 4).map((row) => (
              <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: f(10) }}>
                <View style={[styles.hazIcon, { width: f(50), height: f(40), borderRadius: f(8), borderColor: row.isNew ? RED : 'rgba(47,43,39,0.25)' }]}>
                  {row.art ? <Image source={row.art} style={{ width: f(44), height: f(34) }} resizeMode="contain" /> : <Text style={{ fontSize: f(24) }}>{row.icon}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={text(f(17))}>
                    {row.isNew ? <Text style={{ color: RED }}>NEW: </Text> : null}{row.name}
                  </Text>
                  <Text style={text(f(13), { color: MUTED, letterSpacing: 0 })}>{row.how}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.btnRow}>
          <PaperButton u={u} large label="GO!" primary onPress={() => gameStore.getState().dismissIntro()} />
        </View>
      </WavyBox>
    </View>
  );
}

/** After a mission's last stage: where the journey goes next. */
function NextWorld({ u, n }: { u: number; n: number }) {
  const next = WORLDS.find((w) => w.stages[0] === n + 1);
  return next ? <Text style={text(popSize(u, 17), { color: RED, marginTop: 8 * u, textAlign: 'center', letterSpacing: 0 })}>Next mission: {next.name}. {next.tagline}.</Text> : null;
}

/** The round card, MISSION COMPLETE and OUT OF HEARTS. */
export function StageOverlays({ u }: { u: number }) {
  const status = useGame((s) => s.status);
  const stage = useGame((s) => s.stage);
  const st = useGame((s) => s.stageStats);
  const intro = useGame((s) => s.intro);
  const report = useGame((s) => s.report);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (status === 'playing') return;
    const id = setTimeout(() => setVisible(true), status === 'complete' ? 900 : 600);
    return () => clearTimeout(id);
  }, [status]);
  if (status === 'playing' && intro) return <RoundCard u={u} />;
  if (!visible || !stage) return null;
  const store = gameStore.getState();

  if (status === 'failed') {
    return (
      <View style={styles.scrim}>
        <WavyBox style={[styles.card, { padding: popSize(u, 20) }]} fill={CARD} seed={8}>
          <Text style={text(popSize(u, 32), { color: RED, textAlign: 'center' })}>OUT OF HEARTS</Text>
          <Text style={text(popSize(u, 17), { textAlign: 'center', letterSpacing: 0, marginVertical: 10 * u })}>
            Your coins are safe. More right answers mean more shields and hearts: try again!
          </Text>
          <View style={styles.btnRow}>
            <PaperButton u={u} large label="MAP" onPress={store.openMap} />
            <PaperButton u={u} large label="TRY AGAIN" primary onPress={() => store.startStage(stage.n)} />
          </View>
        </WavyBox>
      </View>
    );
  }

  const accuracy = Math.round((st.right / Math.max(1, st.right + st.wrong)) * 100);
  const rows: Array<[string, string]> = [
    ['RIGHT ANSWERS', `${st.right} of ${st.right + st.wrong}`],
    ['ACCURACY', `${accuracy}%`],
    ...(report ? [[stage.leg === 'earthLaunch' || stage.leg === 'moonLaunch' ? 'BUILD QUALITY' : 'SYSTEMS CHECK', `${report.quality}%`] as [string, string]] : []),
    ['COINS EARNED', `${st.coins}`],
    ...(stage.leg === 'moonwalk' ? [] : [['HITS', `${st.hits + st.bumps}`] as [string, string], ['SHIELD SAVES', `${st.blocked}`] as [string, string]]),
  ];
  const last = stage.n >= STAGE_COUNT;
  return (
    <View style={styles.scrim}>
      <WavyBox style={[styles.card, { padding: popSize(u, 14), alignItems: 'center', maxHeight: '96%' }]} fill={CARD} seed={7}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <Text style={text(popSize(u, 30))}>{last ? 'MISSION ACCOMPLISHED!' : 'STAGE COMPLETE!'}</Text>
          <View style={{ marginVertical: 6 * u }}><Stars n={st.stars} size={popSize(u, 40)} /></View>
          {rows.map(([k, v]) => (
            <View key={k} style={[styles.statRow, { width: popSize(u, 270) }]}>
              <Text style={text(popSize(u, 18))}>{k}</Text>
              <Text style={text(popSize(u, 18))}>{v}</Text>
            </View>
          ))}
          {!last && stage.local === 20 && <NextWorld u={u} n={stage.n} />}
          {last && <Text style={text(popSize(u, 17), { color: MUTED, marginTop: 8 * u, textAlign: 'center', letterSpacing: 0 })}>You flew to the Moon and back: 768,800 km, every one of them earned with your answers!</Text>}
        </ScrollView>
        <View style={styles.btnRow}>
          <PaperButton u={u} large label="MAP" onPress={() => { maybeShowInterstitial(); store.openMap(); }} />
          {!last && <PaperButton u={u} large label="NEXT STAGE" primary onPress={() => { maybeShowInterstitial(); store.startStage(stage.n + 1); }} />}
        </View>
      </WavyBox>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,12,24,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { minWidth: 300, maxWidth: '94%' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: 'rgba(47,43,39,0.2)', paddingVertical: 2 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12 },
  btn: { borderWidth: 2.5, borderColor: INK, borderRadius: 8, backgroundColor: CARD },
  btnPrimary: { backgroundColor: INK },
  hazIcon: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,10,30,0.88)' },
});
