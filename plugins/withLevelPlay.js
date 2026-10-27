/**
 * Unity LevelPlay (unity-levelplay-mediation) native setup, applied at `npx expo prebuild`:
 *
 * Android
 * - the Google Play services libraries LevelPlay needs (its README: app/build.gradle).
 * - childDirected: removes the advertising-ID permission the ads-identifier library adds, as
 *   Google Play's Families policy expects of apps only for children. SpaceBolt is "partially
 *   directed" (a mixed audience, with an age gate), so it keeps the permission and tells LevelPlay
 *   not to use the id for children instead (src/ads/levelplay.ts).
 *
 * iOS
 * - NSAllowsArbitraryLoads (some mediated networks still call over http; LevelPlay's own calls
 *   are encrypted), without the web-content exception LevelPlay says conflicts with it.
 * - SKAdNetworkItems: LevelPlay's own id plus any given in `skAdNetworkIds` (from the LevelPlay
 *   SKAdNetwork IDs manager, for each ad network you turn on).
 * - No tracking (ATT) prompt: a children's app must not track.
 *
 * Options: { childDirected?: boolean (default true: only for children), skAdNetworkIds?: string[] }
 */
const { withAppBuildGradle, withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

const PLAY_SERVICES = [
  "implementation 'com.google.android.gms:play-services-appset:16.0.2'",
  "implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'",
  "implementation 'com.google.android.gms:play-services-basement:18.3.0'",
];
const LEVELPLAY_SKAN = 'su67r6k2v3.skadnetwork';
const AD_ID = 'com.google.android.gms.permission.AD_ID';

function withPlayServices(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    const missing = PLAY_SERVICES.filter((line) => !gradle.includes(line));
    if (missing.length) {
      gradle = gradle.replace(/\ndependencies\s*\{/, (m) => `${m}\n    // Unity LevelPlay (plugins/withLevelPlay.js)\n${missing.map((l) => `    ${l}`).join('\n')}`);
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
}

function withoutAdId(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';
    const perms = (manifest['uses-permission'] ?? []).filter((p) => p.$['android:name'] !== AD_ID);
    perms.push({ $: { 'android:name': AD_ID, 'tools:node': 'remove' } });
    manifest['uses-permission'] = perms;
    return cfg;
  });
}

function withIosAds(config, skAdNetworkIds) {
  return withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    const ats = { ...(plist.NSAppTransportSecurity ?? {}) };
    delete ats.NSAllowsArbitraryLoadsInWebContent;
    ats.NSAllowsArbitraryLoads = true;
    plist.NSAppTransportSecurity = ats;
    const ids = new Set((plist.SKAdNetworkItems ?? []).map((i) => i.SKAdNetworkIdentifier));
    for (const id of [LEVELPLAY_SKAN, ...skAdNetworkIds]) ids.add(id.toLowerCase());
    plist.SKAdNetworkItems = [...ids].map((id) => ({ SKAdNetworkIdentifier: id }));
    delete plist.NSUserTrackingUsageDescription;
    return cfg;
  });
}

module.exports = function withLevelPlay(config, options = {}) {
  const { childDirected = true, skAdNetworkIds = [] } = options;
  config = withPlayServices(config);
  if (childDirected) config = withoutAdId(config);
  return withIosAds(config, skAdNetworkIds);
};
