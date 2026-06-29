const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const currentBlockList = config.resolver.blockList;

config.resolver.blockList = [
  ...(Array.isArray(currentBlockList)
    ? currentBlockList
    : currentBlockList
      ? [currentBlockList]
      : []),
  /node_modules_stale_[^/\\]+[/\\].*/
];

module.exports = config;
