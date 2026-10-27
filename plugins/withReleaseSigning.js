/**
 * Release builds for Google Play:
 * - signed with the SpaceBolt upload key when its details are in Gradle properties
 *   (~/.gradle/gradle.properties: SPACEBOLT_UPLOAD_STORE_FILE / _STORE_PASSWORD / _KEY_ALIAS /
 *   _KEY_PASSWORD; the key itself lives outside the project, never in git). Without them, release
 *   builds fall back to the debug key (fine for testing, not accepted by Play).
 * - native code for real phones only (ARM 64- and 32-bit), not the emulator-only x86 types.
 */
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const HAS_KEY = "project.hasProperty('SPACEBOLT_UPLOAD_STORE_FILE')";

module.exports = function withReleaseSigning(config) {
  config = withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes('SPACEBOLT_UPLOAD_STORE_FILE')) {
      g = g.replace(/signingConfigs \{\n/, `signingConfigs {
        release {
            if (${HAS_KEY}) {
                storeFile file(SPACEBOLT_UPLOAD_STORE_FILE)
                storePassword SPACEBOLT_UPLOAD_STORE_PASSWORD
                keyAlias SPACEBOLT_UPLOAD_KEY_ALIAS
                keyPassword SPACEBOLT_UPLOAD_KEY_PASSWORD
            }
        }
`);
      // the release build type: the upload key when present
      g = g.replace(/(release \{\n\s*\/\/ Caution! In production[^\n]*\n[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
        `$1signingConfig ${HAS_KEY} ? signingConfigs.release : signingConfigs.debug`);
    }
    cfg.modResults.contents = g;
    return cfg;
  });
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures'));
    cfg.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a' });
    return cfg;
  });
};
