import { Platform } from 'react-native';

/**
 * Unity LevelPlay: the ad keys, the privacy settings, and starting the SDK. The rewarded ad
 * (rewardedAds.ts) and the interstitial (interstitialAds.ts) share this.
 *
 * Setup (unity.com → LevelPlay dashboard): add SpaceBolt as an Android app and an iOS app, then
 * create a Rewarded and an Interstitial ad unit for each. Paste the app keys and ad unit ids
 * below. While a platform's app key is empty, ads are switched off there: the free 50/50 is simply
 * granted and no interstitials show, so every build still works.
 */
export const LEVELPLAY = Platform.select({
  android: { appKey: '28bafdc4d', rewarded: 'nrd2j8cojxk0d590', interstitial: 'vx26pt2r5e9ctcz3' },
  ios: { appKey: '', rewarded: '', interstitial: '' },
  default: { appKey: '', rewarded: '', interstitial: '' },
});

/**
 * COPPA: the app is "partially directed" to children (its LevelPlay setting): players say their
 * birth year once (the neutral age gate, src/ui/AgeGate.tsx). For a child (13 or under), ads are
 * child-directed: no personalised ads, no device id, no selling data. Older players get normal ads.
 * LevelPlay needs this before it starts, so ads start only once the player has answered.
 */
export type AdAudience = 'child' | 'general';

export type LevelPlayModule = typeof import('unity-levelplay-mediation');

let mod: LevelPlayModule | null | undefined;
/**
 * The native module exists only in a development or release build made after `npx expo prebuild`
 * (not in Expo Go, not on the web), and the import throws without it: load it lazily, and treat
 * "missing" as "no ads".
 */
export function levelPlay(): LevelPlayModule | null {
  if (mod !== undefined) return mod;
  try {
    mod = require('unity-levelplay-mediation') as LevelPlayModule;
  } catch {
    mod = null;
  }
  return mod;
}

/** Ad-testing builds (`--profile adtest`) log what the ads are doing, so a missing ad can be explained. */
export const AD_TEST = process.env.EXPO_PUBLIC_ADS_EVERY_STAGE === '1';

export function log(message: string) {
  if (__DEV__ || AD_TEST) console.log(`[SpaceBoltAds] ${message}`);
}

let started: Promise<boolean> | null = null;

/**
 * LevelPlay's integration test suite: checks each ad network's setup and shows its ads, with a
 * Live / Test switch for bidding networks. Turn it on for a run with
 *   EXPO_PUBLIC_AD_TEST_SUITE=1 npx expo run:android
 * The app then opens the suite right after LevelPlay starts and loads no ads of its own (LevelPlay
 * asks for no other ad calls before the suite). Never on in release builds.
 */
const TEST_SUITE = __DEV__ && process.env.EXPO_PUBLIC_AD_TEST_SUITE === '1';

/**
 * Start LevelPlay once: the privacy settings first (they must be set before init), then init.
 * Resolves true when ads can load (false in a test-suite run: see TEST_SUITE).
 */
export function startLevelPlay(audience: AdAudience = 'child'): Promise<boolean> {
  if (started) return started;
  started = (async () => {
    const m = levelPlay();
    if (!m || !LEVELPLAY.appKey) {
      log(LEVELPLAY.appKey ? 'LevelPlay native module missing (rebuild with npx expo prebuild)' : 'no LevelPlay app key yet: ads are off');
      return false;
    }
    const { LevelPlay, LevelPlayInitRequest } = m;
    try {
      if (audience === 'child') {
        await LevelPlay.setMetaData('is_child_directed', ['true']);
        await LevelPlay.setMetaData('is_deviceid_optout', ['true']);
        await LevelPlay.setMetaData('do_not_sell', ['true']);
        await LevelPlay.setConsent(false);
      } else {
        await LevelPlay.setMetaData('is_child_directed', ['false']);
      }
      if (TEST_SUITE) await LevelPlay.setMetaData('is_test_suite', ['enable']);
      log(`starting LevelPlay for a ${audience} player`);
      const ok = await new Promise<boolean>((resolve) => {
        LevelPlay.init(LevelPlayInitRequest.builder(LEVELPLAY.appKey).build(), {
          onInitSuccess: (c) => { log(`LevelPlay init ok: ${JSON.stringify(c)}`); resolve(true); },
          onInitFailed: (e) => { log(`LevelPlay init failed: ${JSON.stringify(e)}`); resolve(false); },
        }).catch((e: unknown) => { log(`LevelPlay init error: ${String(e)}`); resolve(false); });
      });
      if (ok) log('LevelPlay ready');
      if (ok && TEST_SUITE) {
        await LevelPlay.launchTestSuite();
        return false; // the suite is the ads for this run
      }
      return ok;
    } catch (e) {
      log(`LevelPlay start failed: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  })();
  return started;
}
