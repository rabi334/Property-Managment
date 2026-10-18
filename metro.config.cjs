const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Force Metro to prioritize CommonJS versions of libraries (fixes import.meta)
config.resolver.conditionNames = ['require', 'browser', 'react-native'];

// 2. Fix for Windows path issues with ESM
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
