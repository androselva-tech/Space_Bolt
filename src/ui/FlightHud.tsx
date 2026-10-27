import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../game/store';
import { DOCK, LEG_INFO, MAX_LIVES, SYSTEM_ORDER, WORLDS, repairNeed } from '../game/rules';
import { dockStore } from '../station/dockState';
import { orderFor } from '../game/store';
import { UI } from '../assets';
import { LIGHT_GOLD, lit } from '../theme';
import { PauseButton } from './PauseControl';

const STEP: Record<string, string> = {
  build: 'WORKSHOP', paint: 'PAINT SHOP', fuel: 'LAUNCH PAD', prep: 'SYSTEMS CHECK', fly: 'JOURNEY',
  moonwalk: 'MOON WALK', dock: 'DOCKING', repair: 'REPAIRS',
};

/** Over the stage: hearts, coins, where we are in the mission, its progress, and the way back to the map. */
export function FlightHud({ u, onMap }: { u: number; onMap: () => void }) {
  const lives = useGame((s) => s.lives);
  const wallet = useGame((s) => s.profile.wallet);
  const stage = useGame((s) => s.stage);
  const phase = useGame((s) => s.phase);
  const shield = useGame((s) => s.rocket.shield);
  const progress = useGame((s) => {
    if (s.phase === 'build') { const o = orderFor(s.stage); return o.filter((p) => s.assembly.fitted[p]?.locked).length / o.length; }
    if (s.phase === 'fuel') {
      const f = s.fueling;
      return (Math.min(f.fuel, f.need.fuel) + Math.min(f.oxidizer, f.need.oxidizer) + Math.min(f.crew, f.need.crew)) / (f.need.fuel + f.need.oxidizer + f.need.crew);
    }
    if (s.phase === 'prep') return s.prep.asked / Math.max(1, s.prep.plan.length);
    if (s.phase === 'moonwalk' && s.walk) return s.walk.found.length / s.walk.field.parts.length;
    if (s.phase === 'repair') return SYSTEM_ORDER.filter((id) => s.repair.got[id] >= repairNeed(id)).length / SYSTEM_ORDER.length;
    if (s.phase === 'dock') return s.docked ? 1 : 1 - dockStore.getState().range / DOCK.start;
    return s.phase === 'fly' ? s.progress : 1;
  });
  if (!stage) return null;
  const world = WORLDS.find((w) => w.id === stage.world)!;
  return (
    <View style={[styles.top, { padding: 10 * u, gap: 10 * u }]} pointerEvents="box-none">
      <View style={[styles.row, { gap: 3 * u }]}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <Image key={i} source={i < lives ? UI.heart : UI.heartEmpty} style={{ width: 20 * u, height: 20 * u, opacity: i < lives ? 1 : 0.5 }} />
        ))}
        {phase === 'fly' && shield > 0 && (
          <View style={[styles.row, { marginLeft: 6 * u, gap: 2 * u }]}>
            <Image source={UI.shield} style={{ width: 20 * u, height: 20 * u }} />
            <Text style={lit(15 * u)}>{shield}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, alignItems: 'center', gap: 3 * u }}>
        <Text style={lit(13 * u, { letterSpacing: 0.5 })} numberOfLines={1}>{world.name} • STAGE {stage.n}: {LEG_INFO[stage.leg].name}{STEP[phase] && STEP[phase] !== LEG_INFO[stage.leg].name ? ` • ${STEP[phase]}` : ''}</Text>
        <View style={[styles.track, { height: 7 * u, borderRadius: 4 * u, width: '80%' }]}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: '#8ee07c', borderRadius: 4 * u }} />
        </View>
      </View>
      <View style={[styles.row, { gap: 4 * u }]}>
        <Image source={UI.coin} style={{ width: 20 * u, height: 20 * u }} />
        <Text testID="wallet" style={lit(16 * u, { color: LIGHT_GOLD })}>{wallet}</Text>
      </View>
      <PauseButton u={u} />
      <Pressable testID="btn-map" accessibilityRole="button" onPress={onMap} style={[styles.mapBtn, { paddingHorizontal: Math.max(16, 16 * u), minHeight: Math.max(48, 44 * u), minWidth: Math.max(64, 60 * u), justifyContent: 'center', alignItems: 'center', borderRadius: 10 * u }]}>
        <Text style={lit(Math.max(19, 20 * u))}>MAP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  track: { backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  mapBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.3)' },
});
