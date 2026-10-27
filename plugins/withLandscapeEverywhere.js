/**
 * Keeps the game in landscape on every Android phone and tablet.
 *
 * - sensorLandscape: either landscape side (turn the device over and it follows).
 * - Android 16 ignores an app's orientation lock on large screens (600dp+, i.e. tablets) for apps
 *   targeting SDK 36. PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY opts back in, so tablets
 *   stay landscape too. (The game still lays out for portrait, for windows that are portrait anyway.)
 */
const { withAndroidManifest } = require('expo/config-plugins');

const OPT_OUT = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

module.exports = function withLandscapeEverywhere(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.property = (app.property ?? []).filter((p) => p.$['android:name'] !== OPT_OUT);
    app.property.push({ $: { 'android:name': OPT_OUT, 'android:value': 'true' } });
    for (const activity of app.activity ?? []) {
      if (activity.$['android:name'] === '.MainActivity') activity.$['android:screenOrientation'] = 'sensorLandscape';
    }
    return cfg;
  });
};
