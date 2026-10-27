import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { TASK_NAME, gameStore, orderFor, useGame, type QuizState, type Task } from '../game/store';
import { DOCK, EVENT_INFO, FAULTS, FIFTY_COST, GAUGE_INFO, MAX_LIVES, SYSTEMS, SYSTEM_ORDER, kmToGo, repairNeed, steerSpeed } from '../game/rules';
import { SUBJECT_INFO } from '../questions';
import { PARTS as ROCKET_PARTS } from '../rocket/model';
import { UI } from '../assets';
import { LIGHT, LIGHT_GOLD, LIGHT_MUTED, lit } from '../theme';
import { showRewardedAd } from '../ads/rewardedAds';

const FG = LIGHT;
const FG_MUTED = LIGHT_MUTED;
const OK = '#8ee07c';
const BAD = '#ff9b8c';
const COIN = LIGHT_GOLD;

/** The dark shade under the question panel: dark beneath the text, fading out over the scene. */
export function PanelShade({ dir, fadeFrom }: { dir: 'left' | 'bottom'; fadeFrom: number }) {
  const across = dir === 'left';
  const k = fadeFrom;
  const stops: Array<[number, number]> = [[0, 0.8], [k * 0.7, 0.74], [k, 0.62]];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    stops.push([k + (1 - k) * t, 0.62 * (1 - t) * (1 - t) * (1 - t * 0.35)]);
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id="panelShade" x1="0" y1={across ? '0' : '1'} x2={across ? '1' : '0'} y2="0">
          {stops.map(([o, a]) => <Stop key={o} offset={o.toFixed(3)} stopColor="#000" stopOpacity={a.toFixed(3)} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#panelShade)" />
    </Svg>
  );
}

/**
 * The left side of the play screen. Building: the question for the part being made (and how many
 * more right answers it needs). Paint shop: what to do. On the pad: the fuel, oxygen and crew
 * questions with their gauges. Flying: the rocket's gauges and how to steer.
 */
export function QuizPanel() {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const quiz = useGame((s) => s.quiz);
  const phase = useGame((s) => s.phase);
  const status = useGame((s) => s.status);
  const intro = useGame((s) => !!s.intro);
  const unit = Math.max(0.6, Math.min(box.w / 300, box.h / 420, 1.5));
  return (
    <View style={styles.panel} onLayout={onLayout}>
      {box.w === 0 || intro ? null : quiz && status === 'playing' ? (
        <QuestionView q={quiz} w={box.w} h={box.h} />
      ) : status === 'playing' && phase === 'fly' ? (
        <FlightGuide u={unit} />
      ) : status === 'playing' && phase === 'moonwalk' ? (
        <Guide u={unit} title="MOON WALK" lines={[
          'Drag anywhere on the Moon to walk that way (W A S D or the arrow keys on a computer).',
          'Beacons of light, the yellow arrows and the radar show where the shuttle parts are.',
          'Walk onto a part, then answer to pick it up.',
        ]} />
      ) : status === 'playing' && phase === 'dock' ? (
        <DockGuide u={unit} />
      ) : status === 'playing' && phase === 'build' ? (
        <BuildGuide u={unit} />
      ) : status === 'playing' && phase === 'paint' ? (
        <Guide u={unit} title="PAINT SHOP" lines={['Pick a body colour and a trim colour for the fins and nose.', 'Choose a pattern.', 'Type your rocket\'s name: it will be painted on the side!']} />
      ) : status === 'playing' && phase === 'fuel' ? (
        <PadGuide u={unit} />
      ) : (
        <Resting u={unit} />
      )}
    </View>
  );
}

// --- sizing ----------------------------------------------------------------------------------

/** Patrick Hand is narrow: an average character is about half the font size wide. */
const CHAR_W = 0.5;
const LINE_H = 1.22;
/** Height of the hint and continue buttons row (times the panel's scale). */
const HINT_H = 52;
const hintRowH = (u: number) => Math.max(56, HINT_H * u);
const lines = (s: string, fontSize: number, width: number) => {
  const perLine = Math.max(4, Math.floor(width / (fontSize * CHAR_W)));
  return Math.max(1, Math.ceil((s.length * 1.08) / perLine));
};

/** The biggest scale at which the header, question, answers and (once answered) the fact all fit. */
export function fitScale(q: QuizState, w: number, h: number): number {
  const pad = 12;
  const inner = w - pad * 2;
  const rec = q.quiz.record;
  const fits = (u: number) => {
    const fsQ = 17 * u, fsA = 15 * u, fsF = 13 * u;
    let y = pad * 2;
    y += 40 * u + 6; // the task header
    y += 20 * u + 6; // subject line
    y += Math.max(30 * u, lines(rec.text, fsQ, inner - 40 * u) * fsQ * LINE_H) + 8;
    const shown = q.done ? q.quiz.options.filter((_, i) => i === q.quiz.correct || i === q.picked) : q.quiz.options;
    if (rec.trueFalse && !q.done) y += fsA * LINE_H + 18 * u + 6;
    else for (const o of shown) y += lines(o, fsA, inner - 24 * u) * fsA * LINE_H + 16 * u + 6;
    y += q.done ? lines(rec.fact, fsF, inner - 20 * u) * fsF * LINE_H + 16 * u + hintRowH(u) + 12 : hintRowH(u) + 6;
    return y <= h;
  };
  let lo = 0.5, hi = 1.6;
  if (!fits(lo)) return lo;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid; else hi = mid;
  }
  return lo;
}


// --- the question ----------------------------------------------------------------------------

function QuestionView({ q, w, h }: { q: QuizState; w: number; h: number }) {
  const u = fitScale(q, w, h);
  const rec = q.quiz.record;
  const subject = rec.subject;
  const number = useGame((s) => s.questionNumber);
  const options = q.quiz.options.map((label, i) => ({ label, i }));
  const shown = q.done ? options.filter((o) => o.i === q.quiz.correct || o.i === q.picked) : options;
  return (
    <View style={[styles.inner, { padding: 12, gap: 6, justifyContent: 'center' }]}>
      <TaskHeader u={u} task={q.task} />
      <View style={[styles.row, { gap: 6 * u }]}>
        <View style={[styles.chip, { borderColor: SUBJECT_INFO[subject].color, paddingHorizontal: 6 * u }]}>
          <Text style={lit(12 * u, { color: SUBJECT_INFO[subject].color, letterSpacing: 0.5 })}>{SUBJECT_INFO[subject].name}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {q.quiz.revision && <Text style={lit(11 * u, { color: COIN, letterSpacing: 0 })}>REVISION</Text>}
        {q.quiz.boss && <Text style={lit(11 * u, { color: BAD, letterSpacing: 0 })}>BOSS</Text>}
        <Text style={lit(11 * u, { color: FG_MUTED, letterSpacing: 0 })}>Q{number}</Text>
      </View>
      <View style={[styles.row, { gap: 8 * u, alignItems: 'flex-start' }]}>
        <Text style={{ fontSize: 26 * u, lineHeight: 32 * u }}>{rec.picture}</Text>
        <Text testID="question-text" style={lit(17 * u, { flex: 1, lineHeight: 17 * u * LINE_H, letterSpacing: 0 })}>{rec.text}</Text>
      </View>
      <View style={rec.trueFalse && !q.done ? [styles.row, { gap: 8 * u }] : { gap: 6 }}>
        {shown.map((o) => <Answer key={o.i} u={u} q={q} i={o.i} label={o.label} wide={!(rec.trueFalse && !q.done)} />)}
      </View>
      {q.done ? <Fact u={u} q={q} /> : <Hints u={u} q={q} />}
    </View>
  );
}

/** What this question is for: the part being made (with its answer pips) or a gauge on the pad. */
function TaskHeader({ u, task }: { u: number; task: Task }) {
  const a = useGame((s) => s.assembly);
  const f = useGame((s) => s.fueling);
  const prep = useGame((s) => s.prep);
  const event = useGame((s) => s.event);
  const walk = useGame((s) => s.walk);
  const repair = useGame((s) => s.repair);
  const shield = useGame((s) => s.rocket.shield);
  const BUILD_ORDER = orderFor(useGame((s) => s.stage));
  const title = (text: string, color: string, pips: { got: number; need: number } | null, bar?: Array<boolean | null>) => (
    <View style={{ gap: 3 * u, height: 40 * u, justifyContent: 'center' }}>
      <View style={[styles.row, { gap: 6 * u }]}>
        <Text style={lit(15 * u, { color, letterSpacing: 0.3, flex: 1 })} numberOfLines={1}>{text}</Text>
        {pips && Array.from({ length: pips.need }, (_, i) => (
          <View key={i} style={{ width: 12 * u, height: 12 * u, borderRadius: 6 * u, borderWidth: 2, borderColor: color, backgroundColor: i < pips.got ? color : 'transparent' }} />
        ))}
      </View>
      {bar && (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {bar.map((on, i) => <View key={i} style={{ flex: 1, height: 5 * u, borderRadius: 3, backgroundColor: on ? OK : on === null ? COIN : 'rgba(255,255,255,0.2)' }} />)}
        </View>
      )}
    </View>
  );
  if (task.kind === 'prep') {
    const g = GAUGE_INFO[task.gauge];
    return title(`SYSTEMS CHECK: ${g.name}`, COIN, null, prep.plan.map((_, i) => (i < prep.asked ? true : i === prep.asked ? null : false)));
  }
  if (task.kind === 'event' && event) {
    const info = EVENT_INFO[event.kind];
    const asked = Array.from({ length: event.need }, (_, i) => (i < event.asked ? true : i === event.asked ? null : false));
    const head = event.kind === 'storm' ? title(`${info.icon} STORM: CHARGE SHIELDS (${shield})`, BAD, null, asked)
      : event.kind === 'flare' ? title(`${info.icon} SOLAR FLARE: SHIELDING ${event.got}/2`, BAD, null, asked)
      : event.kind === 'fault' ? title(`⚠️ ${FAULTS[event.fault ?? 'computer'].name}`, BAD, { got: event.got, need: event.need })
      : event.kind === 'fuelLeak' ? title(`${info.icon} FUEL LEAK: PATCH IT`, BAD, { got: event.got, need: event.need })
      : title(`${info.icon} ${info.name}`, event.kind === 'comms' || event.kind === 'rescue' ? COIN : BAD, null);
    return event.deadline ? <View style={{ gap: 2 * u }}>{head}<Countdown u={u} deadline={event.deadline} total={(event.timed ?? 15) * 1000} /></View> : head;
  }
  if (task.kind === 'collect' && walk) {
    return title(`FOUND: ${ROCKET_PARTS[task.part].name}`, COIN, { got: walk.got, need: walk.need },
      walk.field.parts.map((p) => (walk.found.includes(p.part) ? true : p.part === task.part ? null : false)));
  }
  if (task.kind === 'repair') {
    const sys = SYSTEMS[task.system];
    return title(`${sys.icon} REPAIR: ${sys.name}`, COIN, { got: repair.got[task.system], need: repairNeed(task.system) },
      SYSTEM_ORDER.map((id, i) => (i < repair.index ? true : i === repair.index ? null : false)));
  }
  if (task.kind === 'part') {
    const part = ROCKET_PARTS[task.part];
    return (
      <View style={{ gap: 3 * u, height: 40 * u, justifyContent: 'center' }}>
        <View style={[styles.row, { gap: 6 * u }]}>
          <Text style={lit(15 * u, { color: COIN, letterSpacing: 0.3 })} numberOfLines={1}>PART {a.index + 1}/{BUILD_ORDER.length}: {part.name}</Text>
          <View style={{ flex: 1 }} />
          {Array.from({ length: a.need }, (_, i) => (
            <View key={i} style={{ width: 12 * u, height: 12 * u, borderRadius: 6 * u, borderWidth: 2, borderColor: COIN, backgroundColor: i < a.got ? COIN : 'transparent' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {BUILD_ORDER.map((p, i) => (
            <View key={p} style={{ flex: 1, height: 5 * u, borderRadius: 3, backgroundColor: a.fitted[p]?.locked ? OK : i === a.index ? COIN : 'rgba(255,255,255,0.2)' }} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.row, { gap: 8 * u, height: 40 * u }]}>
      <MiniGauge u={u} label="FUEL" value={f.fuel / f.need.fuel} on={task.kind === 'fuel'} color="#f2c13d" />
      <MiniGauge u={u} label="OXYGEN" value={f.oxidizer / f.need.oxidizer} on={task.kind === 'oxidizer'} color="#9fe6ff" />
      <MiniGauge u={u} label="CREW" value={f.crew / f.need.crew} on={task.kind === 'crew'} color="#ff7a8a" />
    </View>
  );
}

/** The clock on a timed show stopper: a bar running down, red in the last few seconds. */
function Countdown({ u, deadline, total }: { u: number; deadline: number; total: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, deadline - now);
  const k = left / total;
  const urgent = left < 5000;
  return (
    <View style={[styles.row, { gap: 6 * u }]}>
      <Text testID="countdown-seconds" style={lit(14 * u, { color: urgent ? BAD : COIN, width: 34 * u, letterSpacing: 0 })}>{Math.ceil(left / 1000)}s</Text>
      <View style={{ flex: 1, height: 8 * u, borderRadius: 4 * u, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(k * 100)}%`, height: '100%', backgroundColor: urgent ? BAD : COIN }} />
      </View>
    </View>
  );
}

function MiniGauge({ u, label, value, on, color }: { u: number; label: string; value: number; on: boolean; color: string }) {
  return (
    <View style={{ flex: 1, gap: 2 * u, opacity: on ? 1 : 0.6 }}>
      <Text style={lit(11 * u, { color: on ? color : FG_MUTED, letterSpacing: 0.5 })}>{label}{value >= 1 ? ' ✓' : ''}</Text>
      <View style={{ height: 10 * u, borderRadius: 5 * u, borderWidth: on ? 1.5 : 0, borderColor: color, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}

function Answer({ u, q, i, label, wide }: { u: number; q: QuizState; i: number; label: string; wide: boolean }) {
  const removed = q.removed.includes(i);
  const right = q.done && i === q.quiz.correct;
  const wrongPick = q.done && i === q.picked && i !== q.quiz.correct;
  const border = right ? OK : wrongPick ? BAD : 'rgba(255,255,255,0.55)';
  const bg = right ? 'rgba(142,224,124,0.22)' : wrongPick ? 'rgba(255,155,140,0.2)' : 'rgba(255,255,255,0.08)';
  return (
    <Pressable
      testID={`answer-${i}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!!q.done || removed}
      onPress={() => gameStore.getState().answer(i)}
      style={({ pressed }) => [styles.answer, {
        flex: wide ? undefined : 1,
        borderColor: border, backgroundColor: bg, opacity: removed ? 0.25 : 1,
        paddingVertical: 7 * u, paddingHorizontal: 10 * u, borderRadius: 10 * u,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}
    >
      <Text style={lit(15 * u, { letterSpacing: 0, lineHeight: 15 * u * LINE_H, textAlign: wide ? 'left' : 'center', color: right ? OK : wrongPick ? BAD : FG, textDecorationLine: removed ? 'line-through' : 'none' })}>
        {right ? '✓ ' : wrongPick ? '✗ ' : ''}{label}
      </Text>
    </Pressable>
  );
}

function Hints({ u, q }: { u: number; q: QuizState }) {
  const wallet = useGame((s) => s.profile.wallet);
  const [busy, setBusy] = useState(false);
  if (q.quiz.record.trueFalse || q.removed.length) return <View style={{ height: hintRowH(u) }} />;
  const watch = async () => {
    if (busy) return;
    setBusy(true);
    const r = await showRewardedAd();
    setBusy(false);
    if (r === 'earned') gameStore.getState().freeFifty();
    else gameStore.getState().say(r === 'skipped' ? 'WATCH IT TO THE END' : 'NO AD RIGHT NOW', r === 'skipped' ? 'for the free 50/50' : 'Try again in a moment');
  };
  return (
    <View style={[styles.row, { gap: 8 * u, height: hintRowH(u) }]}>
      <SmallButton u={u} testID="hint-fifty" onPress={() => gameStore.getState().useFifty()} dim={wallet < FIFTY_COST}>
        <Text allowFontScaling={false} numberOfLines={1} style={lit(Math.max(17, 17 * u), { letterSpacing: 0 })}>50/50 · {FIFTY_COST}</Text>
        <Image source={UI.coin} style={{ width: Math.max(20, 20 * u), height: Math.max(20, 20 * u) }} />
      </SmallButton>
      <SmallButton u={u} testID="hint-ad" onPress={watch} dim={busy} promo>
        {/* the text shrinks to fit, and ignores the phone's big-font setting (the layout is sized for normal text) */}
        <View style={{ alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
          <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1}
            style={lit(Math.max(20, 21 * u), { letterSpacing: 0, color: '#1d1818', textShadowRadius: 0, lineHeight: Math.max(22, 23 * u) })}>▶ FREE 50/50</Text>
          <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1}
            style={lit(Math.max(12, 13 * u), { letterSpacing: 0, color: '#3a2c05', textShadowRadius: 0, lineHeight: Math.max(13, 14 * u) })}>watch a short ad</Text>
        </View>
      </SmallButton>
    </View>
  );
}

/** After answering: the verdict, the fact, and what happens next. */
function Fact({ u, q }: { u: number; q: QuizState }) {
  const a = useGame((s) => s.assembly);
  const right = q.done === 'right';
  const made = q.task.kind === 'part' && a.tray === q.task.part;
  const t = q.task;
  const label = t.kind === 'part'
    ? (made ? `${ROCKET_PARTS[t.part].name} MADE!` : right ? 'RIGHT!' : 'NOT QUITE.')
    : t.kind === 'fuel' || t.kind === 'oxidizer' || t.kind === 'crew'
      ? (right ? (t.kind === 'crew' ? 'CREW CHECK OK!' : `${TASK_NAME[t.kind]} +1`) : t.kind === 'crew' ? 'NOT CLEARED YET.' : 'LEAK!')
      : right ? 'RIGHT!' : 'NOT QUITE.';
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.fact, { padding: 8 * u, borderRadius: 10 * u, borderColor: right ? OK : COIN }]}>
        <Text style={lit(13 * u, { letterSpacing: 0, lineHeight: 13 * u * LINE_H })}>
          <Text style={{ color: right ? OK : COIN }}>{label}  </Text>
          {q.quiz.record.fact}
        </Text>
      </View>
      {made ? (
        <Text style={lit(15 * u, { color: COIN, letterSpacing: 0 })}>Now fit it on your rocket ➜</Text>
      ) : (
        <SmallButton u={u} testID="btn-continue" onPress={() => gameStore.getState().next()}>
          <Text style={lit(15 * u, { letterSpacing: 0.5 })}>CONTINUE ▶</Text>
        </SmallButton>
      )}
    </View>
  );
}

/** Every button in the question panel is at least 48 high (a thumb-sized target). `promo`: the gold "watch an ad" button. */
function SmallButton({ u, children, onPress, dim, testID, promo }: { u: number; children: ReactNode; onPress: () => void; dim?: boolean; testID?: string; promo?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.small, promo && styles.promo, { height: Math.max(52, 50 * u), borderRadius: Math.max(24, 23 * u), paddingHorizontal: 16 * u, opacity: dim ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

// --- between questions -------------------------------------------------------------------------

function Guide({ u, title, lines: rows, children }: { u: number; title: string; lines: string[]; children?: ReactNode }) {
  return (
    <View style={[styles.inner, { padding: 16 * u, justifyContent: 'center', gap: 10 * u }]}>
      <Text style={lit(28 * u, { textAlign: 'center' })}>{title}</Text>
      {rows.map((l, i) => (
        <View key={i} style={[styles.row, { gap: 10 * u, alignItems: 'flex-start' }]}>
          <Text style={lit(16 * u, { color: COIN, width: 18 * u })}>{i + 1}</Text>
          <Text style={lit(15 * u, { flex: 1, letterSpacing: 0 })}>{l}</Text>
        </View>
      ))}
      {children}
    </View>
  );
}

/** Building with no question up: the part is in the tray or being bolted on. */
function BuildGuide({ u }: { u: number }) {
  const a = useGame((s) => s.assembly);
  const BUILD_ORDER = orderFor(useGame((s) => s.stage));
  const feedback = useGame((s) => s.feedback);
  const part = a.tray ?? BUILD_ORDER.find((p) => a.fitted[p] && !a.fitted[p]!.locked) ?? BUILD_ORDER[Math.min(a.index, BUILD_ORDER.length - 1)];
  return (
    <Guide u={u} title={ROCKET_PARTS[part].name} lines={[
      a.tray ? `Drag it from the tray to its place on the ${BUILD_ORDER[0] === 'landingStruts' ? 'shuttle' : 'rocket'}. Check the prototype!` : 'Tap each bolt 3 times to tighten it.',
      ROCKET_PARTS[part].what + '.',
    ]}>
      {feedback && (
        <Text style={lit(15 * u, { textAlign: 'center', letterSpacing: 0, color: feedback.kind === 'wrong' ? BAD : feedback.kind === 'correct' ? OK : FG })}>
          {feedback.text}{feedback.sub ? `\n${feedback.sub}` : ''}
        </Text>
      )}
    </Guide>
  );
}

/** On the pad, all fuelled and crewed: the GO FOR LAUNCH button. */
function PadGuide({ u }: { u: number }) {
  const ready = useGame((s) => s.padReady);
  const name = useGame((s) => s.design.name);
  if (!ready) return <Resting u={u} />;
  return (
    <View style={[styles.inner, { padding: 16 * u, justifyContent: 'center', alignItems: 'center', gap: 14 * u }]}>
      <Text style={lit(28 * u, { textAlign: 'center', color: OK })}>ALL SYSTEMS GO!</Text>
      <Text style={lit(16 * u, { textAlign: 'center', letterSpacing: 0 })}>{name} is fuelled and the crew is aboard.</Text>
      <Pressable testID="btn-go-launch" accessibilityRole="button" onPress={() => gameStore.getState().goForLaunch()}
        style={({ pressed }) => [styles.go, { paddingHorizontal: 22 * u, paddingVertical: 10 * u, borderRadius: 26 * u, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
        <Text style={lit(20 * u, { color: '#1d1818', textShadowRadius: 0 })}>🚀 GO FOR LAUNCH</Text>
      </Pressable>
    </View>
  );
}

/** While flying: the rocket's gauges and the steering help. */
function FlightGuide({ u }: { u: number }) {
  const rocket = useGame((s) => s.rocket);
  const lives = useGame((s) => s.lives);
  const report = useGame((s) => s.report);
  const feedback = useGame((s) => s.feedback);
  const km = useGame((s) => (s.stage ? kmToGo(s.stage, s.progress) : null));
  const target = useGame((s) => (s.stage?.world === 'outbound' ? 'THE MOON' : 'EARTH'));
  const steer = Math.round((steerSpeed(rocket.engine) / steerSpeed(6)) * 100);
  return (
    <View style={[styles.inner, { padding: 14 * u, justifyContent: 'center', gap: 11 * u }]}>
      <View style={{ alignItems: 'center', gap: 2 * u }}>
        <Text style={lit(30 * u)}>FLY!</Text>
        {km !== null ? <Text testID="km-to-go" style={lit(14 * u, { color: COIN, letterSpacing: 0 })}>{km.toLocaleString()} KM TO {target}</Text>
          : report && <Text style={lit(13 * u, { color: FG_MUTED, letterSpacing: 0 })}>BUILD QUALITY {report.quality}% • {report.perfect} PERFECT PARTS</Text>}
      </View>
      <Gauge u={u} icon={UI.engine} label="STEERING" sub="from your build and tune-up" value={steer / 100} color="#ff8a4a" />
      <Gauge u={u} icon={UI.tank} label="FUEL" sub={rocket.fuel < 0.3 ? 'running low!' : 'enough to arrive'} value={rocket.fuel / Math.max(0.01, rocket.fuelMax)} color={rocket.fuel < 0.3 ? BAD : '#ffd45c'} />
      <View style={[styles.row, { gap: 10 * u }]}>
        <Image source={UI.shield} style={{ width: 26 * u, height: 26 * u }} />
        <Text style={lit(15 * u, { letterSpacing: 0 })}>{rocket.shield > 0 ? `${rocket.shield} SHIELD${rocket.shield === 1 ? '' : 'S'}` : 'NO SHIELD'}</Text>
        <View style={{ flex: 1 }} />
        {Array.from({ length: MAX_LIVES }, (_, i) => <Image key={i} source={i < lives ? UI.heart : UI.heartEmpty} style={{ width: 18 * u, height: 18 * u }} />)}
      </View>
      <View style={{ gap: 2 * u, alignItems: 'center' }}>
        <Text style={lit(16 * u)}>DRAG UP OR DOWN</Text>
        <Text style={lit(12 * u, { color: FG_MUTED, letterSpacing: 0, textAlign: 'center' })}>anywhere in space to steer • keys ↑ ↓ on a computer</Text>
      </View>
      {feedback ? (
        <Text style={lit(16 * u, { textAlign: 'center', color: feedback.kind === 'wrong' ? BAD : feedback.kind === 'correct' ? OK : FG })} numberOfLines={2}>
          {feedback.text}{feedback.sub ? `  ${feedback.sub}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

/** Docking: how to do it. The live readouts are over the docking view. */
function DockGuide({ u }: { u: number }) {
  const docked = useGame((s) => s.docked);
  const feedback = useGame((s) => s.feedback);
  return (
    <Guide u={u} title={docked ? 'DOCKED!' : 'DOCKING'} lines={docked ? ['Hard seal. The hatch is opening…'] : [
      'Roll with ⟲ ⟳ (A / D) until the station stops turning, and its slot lies flat.',
      'Keep the blue diamond in your cross-hair with the side thrusters ◀ ▲ ▶ ▼ (arrow keys). Nothing slows a drift in space: thrust back to stop!',
      `Close in with + (W), brake with − (S): touch at under ${DOCK.speedTol} m/s.`,
    ]}>
      {feedback && (
        <Text style={lit(15 * u, { textAlign: 'center', letterSpacing: 0, color: feedback.kind === 'wrong' ? BAD : feedback.kind === 'correct' ? OK : FG })}>
          {feedback.text}{feedback.sub ? `\n${feedback.sub}` : ''}
        </Text>
      )}
    </Guide>
  );
}

function Gauge({ u, icon, label, sub, value, color }: { u: number; icon: number; label: string; sub: string; value: number; color: string }) {
  return (
    <View style={[styles.row, { gap: 10 * u }]}>
      <Image source={icon} style={{ width: 26 * u, height: 26 * u }} />
      <View style={{ flex: 1, gap: 3 * u }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={lit(15 * u, { letterSpacing: 0 })}>{label}</Text>
          <Text style={lit(11 * u, { color: FG_MUTED, letterSpacing: 0 })}>{sub}</Text>
        </View>
        <View style={{ height: 10 * u, borderRadius: 5 * u, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: '100%', backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}

function Resting({ u }: { u: number }) {
  const status = useGame((s) => s.status);
  const feedback = useGame((s) => s.feedback);
  return (
    <View style={[styles.inner, { padding: 14 * u, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={{ gap: 10 * u, alignItems: 'center' }}>
        {feedback && <Text style={lit(22 * u, { textAlign: 'center', color: feedback.kind === 'wrong' ? BAD : feedback.kind === 'correct' ? OK : FG })}>{feedback.text}</Text>}
        {feedback?.sub ? <Text style={lit(15 * u, { textAlign: 'center', color: FG_MUTED, letterSpacing: 0 })}>{feedback.sub}</Text> : null}
        <Text style={lit(18 * u, { textAlign: 'center', color: FG_MUTED })}>
          {status === 'complete' ? 'STAGE COMPLETE!' : status === 'failed' ? 'OUT OF HEARTS' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  inner: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 1 },
  answer: { borderWidth: 2 },
  fact: { borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.35)' },
  promo: { backgroundColor: '#ffd45c', borderColor: '#fff4e6', borderWidth: 2.5, flexShrink: 1, flexGrow: 1, minWidth: 0 },
  small: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start' },
  go: { backgroundColor: '#8ee07c', borderWidth: 3, borderColor: LIGHT },
});
