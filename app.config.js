/**
 * app.json plus sign-in (Firebase), which is switched on only once google-services.json lists this
 * app's package. Until then the build works as before and the game simply has no sign-in.
 *
 * To turn sign-in on: in the Firebase console (project fitness-52d79, shared with Motion) add an
 * Android app with package com.androselva1988.spacebolt and this build's SHA-1, then download
 * google-services.json into this folder and rebuild (npx expo prebuild && npx expo run:android).
 */
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.androselva1988.spacebolt';
const GOOGLE_SERVICES = path.join(__dirname, 'google-services.json');

function firebaseConfigured() {
  try {
    const json = JSON.parse(fs.readFileSync(GOOGLE_SERVICES, 'utf8'));
    return json.client.some((c) => c.client_info?.android_client_info?.package_name === PACKAGE);
  } catch {
    return false;
  }
}

/** The splash background: the navy at the edge of the splash artwork (tools/make-icons.mjs). */
const { splashBackground } = require('./src/brand.json');

module.exports = ({ config }) => {
  config.plugins = config.plugins.map((p) =>
    Array.isArray(p) && p[0] === 'expo-splash-screen' ? [p[0], { ...p[1], backgroundColor: splashBackground }] : p);
  const firebase = firebaseConfigured();
  if (firebase) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
    config.plugins = [...config.plugins, '@react-native-firebase/app', '@react-native-firebase/auth'];
  }
  config.extra = { ...config.extra, firebase };
  return config;
};
