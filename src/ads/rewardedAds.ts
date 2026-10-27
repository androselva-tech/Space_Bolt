import type { LevelPlayRewardedAd as RewardedAdInstance } from 'unity-levelplay-mediation';
import { LEVELPLAY, levelPlay, log, startLevelPlay, type AdAudience } from './levelplay';
import { startInterstitials } from './interstitialAds';

/**
 * "Watch an ad for a free 50/50": a Unity LevelPlay rewarded ad. Loaded once LevelPlay has
 * started, and again after each one is shown. Without the native module (Expo Go, before a
 * rebuild) or without an app key yet, the reward is simply granted. Web: rewardedAds.web.ts.
 */
let ad: RewardedAdInstance | null = null;
let loaded = false;
/** The ad being shown right now settles this when it closes or fails. */
let showing: { resolve: (r: RewardResult) => void; earned: boolean } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
/** A load is in flight: LevelPlay refuses a second one ("Load is already called"). */
let loading = false;

function load() {
  if (!ad || loading) return;
  loaded = false;
  loading = true;
  ad.loadAd().catch((e: unknown) => { loading = false; log(`rewarded load failed: ${String(e)}`); });
}

/**
 * Called from App.tsx once the player's age group is known (the age gate): start LevelPlay for
 * that audience, then preload a rewarded ad and the interstitial. Later calls do nothing.
 */
export async function initAds(audience: AdAudience): Promise<void> {
  const m = levelPlay();
  if (!m || ad || !(await startLevelPlay(audience))) return;
  log(`loading rewarded ${LEVELPLAY.rewarded || '(no unit yet)'}`);
  if (LEVELPLAY.rewarded) {
    ad = new m.LevelPlayRewardedAd(LEVELPLAY.rewarded);
    ad.setListener({
      onAdLoaded: () => { loading = false; loaded = true; log('rewarded ad loaded'); },
      onAdLoadFailed: (e) => {
        loading = false;
        log(`rewarded ad failed to load: ${e.errorMessage}`);
        clearTimeout(retryTimer);
        retryTimer = setTimeout(load, 30_000); // no fill or offline: try again later
      },
      onAdInfoChanged: () => {},
      onAdDisplayed: () => {},
      onAdDisplayFailed: (e) => {
        log(`rewarded ad failed to show: ${e.errorMessage}`);
        showing?.resolve('unavailable');
        showing = null;
        load();
      },
      onAdClicked: () => {},
      onAdRewarded: () => { if (showing) showing.earned = true; },
      onAdClosed: () => {
        showing?.resolve(showing.earned ? 'earned' : 'skipped');
        showing = null;
        load(); // ready for the next hint
      },
    });
    load();
  }
  startInterstitials();
}

export type RewardResult = 'earned' | 'skipped' | 'unavailable';

/** Shows the preloaded rewarded ad. 'earned' only when the player watched it through. */
export async function showRewardedAd(): Promise<RewardResult> {
  log(`free 50/50 tapped: ad ${!!ad}, loaded ${loaded}`);
  const m = levelPlay();
  // no ads in this build (or no keys yet): the free 50/50 is just free
  if (!m || !LEVELPLAY.appKey || !LEVELPLAY.rewarded) return 'earned';
  if (!ad || !loaded || !(await ad.isAdReady().catch(() => false))) {
    // not ready: make sure one is on its way (a load already in flight is left alone)
    if (ad && !loaded) load();
    return 'unavailable';
  }
  return new Promise<RewardResult>((resolve) => {
    showing = { resolve, earned: false };
    loaded = false;
    ad!.showAd().catch(() => {
      showing = null;
      load();
      resolve('unavailable');
    });
  });
}
