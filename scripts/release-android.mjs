/**
 * Production build for Google Play, with the version code raised automatically:
 *   npm run release:android
 * 1. android.versionCode in app.json goes up by one (Play refuses a code it has already seen)
 * 2. the Android project is regenerated (npx expo prebuild) and the signed bundle is built
 * 3. the bundle is copied to dist/spacebolt-v<version>-<versionCode>.aab
 * If the build fails, the version code goes back to what it was.
 *
 * (Building in Expo's cloud instead — `eas build -p android --profile production` — keeps its own
 * auto-incremented version code, like the Motion app; see eas.json.)
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_JSON = join(ROOT, 'app.json');
const app = JSON.parse(readFileSync(APP_JSON, 'utf8'));
// the higher of this file's code and Expo's cloud one (eas.json keeps a remote, auto-incremented code)
let remote = 0;
try {
  remote = JSON.parse(execSync('eas build:version:get -p android --json --non-interactive', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString()).versionCode ?? 0;
} catch { /* offline, or not logged in to Expo: use the local code */ }
const previous = Math.max(app.expo.android.versionCode ?? 1, Number(remote) || 0);
const versionCode = previous + 1;
const version = app.expo.version;

const save = (code) => {
  app.expo.android.versionCode = code;
  writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n');
};
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ANDROID_HOME: process.env.ANDROID_HOME ?? '/opt/homebrew/share/android-commandlinetools' } });

console.log(`SpaceBolt ${version}: version code ${previous} -> ${versionCode}`);
save(versionCode);
try {
  run('npx expo prebuild --platform android --no-install');
  run('./gradlew bundleRelease', join(ROOT, 'android'));
} catch (e) {
  save(previous);
  console.error(`\nBuild failed; version code put back to ${previous}.`);
  process.exit(1);
}
const aab = join(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab');
if (!existsSync(aab)) {
  save(previous);
  console.error('No bundle was produced; version code put back.');
  process.exit(1);
}
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const out = join(ROOT, 'dist', `spacebolt-v${version}-${versionCode}.aab`);
copyFileSync(aab, out);
console.log(`\nReady for Google Play: ${out}`);
