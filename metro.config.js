const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Keep the asset generator (and its node_modules) out of the app bundle.
config.resolver.blockList = [/\/tools\/.*/];

// three's CJS entry (used by @react-three/fiber/native's `require('three')`) calls
// `process.emitWarning`, which doesn't exist in React Native and crashes at startup.
// Always resolve `three` to the ESM build so there's also a single THREE instance.
const threeModule = path.join(__dirname, 'node_modules/three/build/three.module.js');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeModule };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
