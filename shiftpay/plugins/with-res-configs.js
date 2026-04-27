/**
 * Expo config plugin — restricts the Android resource bundle to the
 * locales ShiftPay actually ships (`en`, `nb`, `sv`, `da`).
 *
 * Why: React Native and AndroidX ship translated strings for ~70
 * locales. Each adds 5-30 KB of resources to the APK. We only display
 * UI in 4 languages, so the rest is dead weight. Setting `resConfigs`
 * in `defaultConfig` filters them out at build time — typical saving
 * is 2-5 MB on a 49 MB APK.
 *
 * Idempotent: bails out if the marker comment is already present, so
 * repeated `expo prebuild` runs don't duplicate the block.
 */

const { withAppBuildGradle } = require("expo/config-plugins");

const RES_CONFIGS_BLOCK = `
        // ShiftPay Pass 7: ship only the locales we actually translate.
        // RN/AndroidX bundle ~70 locales by default; this strips the rest.
        resConfigs "en", "nb", "sv", "da"`;

const MARKER = "ShiftPay Pass 7: ship only the locales";

function injectResConfigs(contents) {
  if (contents.includes(MARKER)) return contents;

  // Insert before the closing brace of `defaultConfig { ... }`.
  // Anchor on `versionName` followed by the next blank line + closing
  // `}`, so we don't accidentally land inside a nested block.
  const defaultConfigRegex = /(defaultConfig \{[\s\S]*?versionName\s+"[^"]*")(\s*\n)/;
  if (!defaultConfigRegex.test(contents)) {
    throw new Error(
      "[with-res-configs] could not find versionName line inside defaultConfig — build.gradle structure changed?"
    );
  }
  return contents.replace(defaultConfigRegex, `$1\n${RES_CONFIGS_BLOCK}$2`);
}

module.exports = function withResConfigs(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = injectResConfigs(cfg.modResults.contents);
    return cfg;
  });
};
