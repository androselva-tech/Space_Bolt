import type { LevelPlayInterstitialAd as InterstitialAdInstance } from 'unity-levelplay-mediation';
import { AD_TEST, LEVELPLAY, levelPlay, log } from './levelplay';

/**
 * Full-screen Unity LevelPlay ads between stages, at a natural break: when the player leaves a
 * finished stage (NEXT STAGE or MAP on the stage-complete card), never during play. Kept rare:
 * none in the first stages, then at most one every 3 stages finished and every 3 minutes.
 *
 * Started by rewardedAds.initAds once LevelPlay is running.
 */

/**
 * Ad-testing builds (`eas build --profile adtest`, which sets EXPO_PUBLIC_ADS_EVERY_STAGE) show
 * one after every finished stage, so the ads can be checked without a long play session.
 */
/** No ads before the player has finished this many stages (in this app session). */
const FREE_STAGES = AD_TEST ? 0 : 3;
const EVERY_N_STAGES = AD_TEST ? 1 : 3;
const MIN_MS_BETWEEN = AD_TEST ? 0 : 3 * 60 * 1000;

let ad: InterstitialAdInstance | null = null;
let loaded = false;
let stagesFinished = 0;
let sinceLast = 0;
let lastShownAt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/** A load is in flight: LevelPlay refuses a second one ("Load is already called"). */
let loading = false;

function load() {
  if (!ad || loading) return;
  loaded = false;
  loading = true;
  ad.loadAd().catch((e: unknown) => { loading = false; log(`interstitial load failed: ${String(e)}`); });
}

/** Called by initAds once LevelPlay is up. */
export function startInterstitials() {
  const m = levelPlay();
  if (!m || !LEVELPLAY.interstitial || ad) { log(`interstitials not started (module ${!!m}, unit ${!!LEVELPLAY.interstitial}, already ${!!ad})`); return; }
  log(`loading interstitial ${LEVELPLAY.interstitial}`);
  ad = new m.LevelPlayInterstitialAd(LEVELPLAY.interstitial);
  ad.setListener({
    onAdLoaded: () => { loading = false; loaded = true; log('interstitial loaded'); },
    onAdLoadFailed: (e) => {
      loading = false;
      log(`interstitial failed to load: ${e.errorMessage}`);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(load, 30_000); // no fill or offline: try again later
    },
    onAdInfoChanged: () => {},
    onAdDisplayed: () => {},
    onAdDisplayFailed: (e) => { log(`interstitial failed to show: ${e.errorMessage}`); load(); },
    onAdClicked: () => {},
    // ready again well before the next break
    onAdClosed: () => load(),
  });
  load();
}

/** A stage was finished: maybe show an ad as the player moves on (see the rules above). */
export function maybeShowInterstitial() {
  stagesFinished += 1;
  sinceLast += 1;
  log(`stage finished #${stagesFinished}: free ${FREE_STAGES}, every ${EVERY_N_STAGES}, ad ${!!ad}, loaded ${loaded}`);
  if (stagesFinished <= FREE_STAGES || sinceLast < EVERY_N_STAGES) return;
  if (Date.now() - lastShownAt < MIN_MS_BETWEEN || !ad || !loaded) { log('no interstitial this time (not loaded yet, or shown too recently)'); return; }
  log('showing interstitial');
  const current = ad;
  loaded = false;
  lastShownAt = Date.now();
  sinceLast = 0;
  current.showAd().catch((e: unknown) => {
    log(`interstitial show failed: ${String(e)}`);
    load();
  });
}
