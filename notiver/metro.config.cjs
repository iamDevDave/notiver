const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
	/.*[\\/]node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/].*/,
	/.*[\\/]android[\\/]\.cxx[\\/].*/,
]);

module.exports = withNativeWind(config, { input: './global.css' });
