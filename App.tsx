import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { gameStore, useGame } from './src/game/store';
import { HangarOverlay, MapScreen, ProfileOverlay } from './src/ui/MapScreen';
import { PlayScreen } from './src/PlayScreen';
import { NIGHT } from './src/theme';
import { initAds } from './src/ads/rewardedAds';
import { auth, sessionStore, startSession } from './src/auth/session';
import { AuthSheet } from './src/ui/AuthSheet';
import { Splash } from './src/ui/Splash';
import { AgeGate } from './src/ui/AgeGate';

// the system splash stays up until our own splash (the full SpaceBolt logo) is on screen
SplashScreen.preventAutoHideAsync().catch(() => {});
/** The logo stays at least this long, so it's seen and not just flashed. */
const SPLASH_MS = 1600;

// web dev builds: expose the store for automated play-testing
if (__DEV__ && typeof window !== 'undefined') {
  (window as unknown as { __game: typeof gameStore }).__game = gameStore;
  (window as unknown as { __auth: unknown }).__auth = { sessionStore, auth };
}

/** SpaceBolt: answer science questions on the left to build a rocket, then fly it on the right. */
export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: NIGHT }}>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  useKeepAwake();
  // tablets keep the navigation bar / home indicator along the bottom edge, and the app draws edge-to-edge
  const insets = useSafeAreaInsets();
  const [fontsReady, fontError] = useFonts({ PatrickHand_400Regular });
  const loaded = useGame((s) => s.loaded);
  const screen = useGame((s) => s.screen);
  const [elapsed, setElapsed] = useState(0);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    gameStore.getState().load().then(startSession); // sign-in (optional) once the device save is in
  }, []);
  // ads start once the player has answered the age gate (child-safe ads for children); best-effort,
  // they never block the game
  const ageGroup = useGame((s) => s.profile.ageGroup);
  useEffect(() => {
    if (ageGroup) initAds(ageGroup);
  }, [ageGroup]);
  // the splash's clock: ticks only while the splash is up (it re-renders the app)
  useEffect(() => {
    if (splashDone) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [splashDone]);

  // the loading bar: fonts, the saved game, and the logo's minimum time on screen
  const fonts = !!(fontsReady || fontError);
  const progress = 0.1 + (fonts ? 0.3 : 0) + (loaded ? 0.3 : 0) + 0.3 * Math.min(1, elapsed / SPLASH_MS);
  const allReady = fonts && loaded && elapsed >= SPLASH_MS;
  useEffect(() => {
    if (!allReady || splashDone) return;
    const id = setTimeout(() => setSplashDone(true), 400); // let the bar finish filling
    return () => clearTimeout(id);
  }, [allReady, splashDone]);

  if (!splashDone) return <Splash progress={allReady ? 1 : Math.min(progress, 0.95)} onShown={() => SplashScreen.hideAsync().catch(() => {})} />;
  return (
    <View style={{ flex: 1, backgroundColor: NIGHT, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
      <StatusBar hidden />
      {screen === 'map' ? <MapScreen /> : <PlayScreen />}
      <AgeGate />
      <ProfileOverlay />
      <HangarOverlay />
      <AuthSheet />
    </View>
  );
}


