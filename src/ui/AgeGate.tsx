import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { gameStore, useGame } from '../game/store';
import { CARD, INK, MUTED, text } from '../theme';
import { WavyBox } from './SketchShapes';
import { PaperButton } from './StageOverlays';

/** Players this age or younger get child-safe ads (COPPA's "under 13", counting a birthday not yet reached this year). */
export const CHILD_MAX_AGE = 13;
const OLDEST = 1930;

/**
 * The neutral age gate, asked once before the first game (and again only if changed in Profile).
 * It asks for a birth year with every year equally easy to pick and none chosen in advance, and
 * says nothing about what the answer changes, so it doesn't nudge anyone to an answer. Only the
 * result is kept (a child or not), never the year.
 */
export function AgeGate() {
  const ageGroup = useGame((s) => s.profile.ageGroup);
  const loaded = useGame((s) => s.loaded);
  const screen = useGame((s) => s.screen);
  const { width, height } = useWindowDimensions();
  const u = Math.max(0.7, Math.min(width / 900, height / 500, 1.3));
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: thisYear - OLDEST + 1 }, (_, i) => thisYear - i), [thisYear]);
  const [year, setYear] = useState<number | null>(null);
  if (!loaded || ageGroup !== null || screen !== 'map') return null;
  const done = () => {
    if (year === null) return;
    gameStore.getState().setAgeGroup(thisYear - year <= CHILD_MAX_AGE ? 'child' : 'general');
    setYear(null);
  };
  return (
    <View style={styles.scrim}>
      <WavyBox style={{ padding: 18 * u, width: Math.min(width - 32, 560 * u), maxHeight: height - 32, gap: 10 * u }} fill={CARD} seed={21}>
        <Text style={text(28 * u, { textAlign: 'center' })}>WHAT YEAR WERE YOU BORN?</Text>
        <Text style={text(14 * u, { textAlign: 'center', color: MUTED, letterSpacing: 0 })}>Tap your birth year, then OK.</Text>
        <ScrollView style={{ maxHeight: height * 0.45 }} contentContainerStyle={[styles.grid, { gap: 6 * u }]}>
          {years.map((y) => (
            <Pressable key={y} testID={`year-${y}`} accessibilityRole="button" accessibilityLabel={`${y}`} accessibilityState={{ selected: y === year }}
              onPress={() => setYear(y)}
              style={[styles.year, { width: 76 * u, paddingVertical: 6 * u, borderRadius: 8 * u }, y === year && styles.yearOn]}>
              <Text style={text(17 * u, { color: y === year ? CARD : INK, textAlign: 'center' })}>{y}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.row}>
          <PaperButton u={u} testID="btn-age-ok" label={year === null ? 'OK' : `OK • ${year}`} primary={year !== null} onPress={done} />
        </View>
      </WavyBox>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,14,0.7)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  year: { borderWidth: 2, borderColor: INK, backgroundColor: CARD },
  yearOn: { backgroundColor: INK },
  row: { flexDirection: 'row', justifyContent: 'center' },
});
