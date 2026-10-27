import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../game/store';
import { SYSTEMS, SYSTEM_ORDER, repairNeed } from '../game/rules';
import { LIGHT_GOLD, LIGHT_MUTED, lit } from '../theme';

const OK = '#8ee07c';
const BAD = '#ff7a6a';

/**
 * Inside the space station: the ship's systems on a repair board. Each one shows its fault and a
 * red light until enough right answers fix it; the one being worked on is outlined in gold.
 */
export function RepairBay({ u }: { u: number }) {
  const repair = useGame((s) => s.repair);
  const feedback = useGame((s) => s.feedback);
  const fixed = SYSTEM_ORDER.filter((id) => repair.got[id] >= repairNeed(id)).length;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { paddingTop: 50 * u, paddingHorizontal: 14 * u, paddingBottom: 12 * u, gap: 8 * u }]}>
      <Text style={lit(18 * u, { color: LIGHT_GOLD, textAlign: 'center' })}>STATION REPAIR BAY • {fixed}/{SYSTEM_ORDER.length} FIXED</Text>
      <View style={[styles.grid, { gap: 8 * u }]}>
        {SYSTEM_ORDER.map((id, i) => {
          const sys = SYSTEMS[id];
          const need = repairNeed(id);
          const done = repair.got[id] >= need;
          const now = i === repair.index;
          return (
            <View key={id} testID={`system-${id}`} style={[styles.card, {
              padding: 8 * u, borderRadius: 10 * u, gap: 3 * u,
              borderColor: done ? OK : now ? LIGHT_GOLD : 'rgba(255,255,255,0.25)', borderWidth: now ? 3 : 1.5,
            }]}>
              <View style={[styles.row, { gap: 6 * u }]}>
                <Text style={{ fontSize: 22 * u }}>{sys.icon}</Text>
                <Text style={lit(14 * u, { flex: 1, letterSpacing: 0.3 })} numberOfLines={1}>{sys.name}</Text>
                <View style={{ width: 12 * u, height: 12 * u, borderRadius: 6 * u, backgroundColor: done ? OK : BAD }} />
              </View>
              <Text style={lit(11 * u, { color: done ? OK : LIGHT_MUTED, letterSpacing: 0 })} numberOfLines={1}>{done ? 'WORKING' : sys.what}</Text>
              <View style={[styles.row, { gap: 3 * u }]}>
                {Array.from({ length: need }, (_, k) => (
                  <View key={k} style={{ flex: 1, height: 5 * u, borderRadius: 3, backgroundColor: k < repair.got[id] ? OK : 'rgba(255,255,255,0.2)' }} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      {feedback && (
        <Text style={lit(14 * u, { textAlign: 'center', letterSpacing: 0, color: feedback.kind === 'wrong' ? BAD : feedback.kind === 'correct' ? OK : LIGHT_MUTED })} numberOfLines={2}>
          {feedback.text}{feedback.sub ? `  ${feedback.sub}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#14202e' },
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center' },
  card: { width: '31%', minWidth: 120, backgroundColor: 'rgba(0,0,0,0.35)' },
});
