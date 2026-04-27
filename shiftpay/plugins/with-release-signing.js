/**
 * Expo config plugin — wires the release signing config into the
 * generated android/app/build.gradle so it survives `expo prebuild --clean`.
 *
 * Why a plugin: android/ is gitignored. Hand-edits to build.gradle vanish
 * on the next prebuild, taking the keystore wiring with them and silently
 * regenerating an unsigned APK. With this plugin in app.json, prebuild
 * regenerates the file with the same env-var-driven signingConfig every
 * time.
 *
 * The plugin only injects the gradle SHAPE (env-var lookups). Actual
 * keystore + passwords stay in env vars at build time, never in source
 * control:
 *
 *   SHIFTPAY_KEYSTORE_PATH
 *   SHIFTPAY_KEYSTORE_PASSWORD
 *   SHIFTPAY_KEY_ALIAS
 *   SHIFTPAY_KEY_PASSWORD
 *
 * If those env vars are unset (e.g. local dev), the release build falls
 * back to signingConfigs.debug — same behaviour as before this plugin.
 */

const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING_CONFIG_BLOCK = `
        release {
            if (System.getenv("SHIFTPAY_KEYSTORE_PATH")) {
                storeFile file(System.getenv("SHIFTPAY_KEYSTORE_PATH"))
                storePassword System.getenv("SHIFTPAY_KEYSTORE_PASSWORD")
                keyAlias System.getenv("SHIFTPAY_KEY_ALIAS")
                keyPassword System.getenv("SHIFTPAY_KEY_PASSWORD")
            }
        }`;

const RELEASE_SIGNING_REFERENCE =
  'signingConfig System.getenv("SHIFTPAY_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug';

function injectSigningConfig(contents) {
  // Idempotency: bail out early if our marker is already present so the
  // plugin can be re-applied (e.g. by prebuild --no-clean) without
  // duplicating blocks.
  if (contents.includes("SHIFTPAY_KEYSTORE_PATH")) {
    return contents;
  }

  // 1. Append a `release { ... }` config inside `signingConfigs { debug { ... } }`.
  //    The default Expo template only ships `debug`; we add our `release`
  //    sibling at the end of the signingConfigs block.
  const signingConfigsRegex = /signingConfigs \{\s*debug \{[\s\S]*?\}\s*\}/;
  const signingConfigsMatch = contents.match(signingConfigsRegex);
  if (!signingConfigsMatch) {
    throw new Error(
      "[with-release-signing] could not find `signingConfigs { debug { ... } }` block in build.gradle"
    );
  }
  const updatedSigningConfigs = signingConfigsMatch[0].replace(
    /\}\s*$/,
    `${SIGNING_CONFIG_BLOCK}\n    }`
  );
  let next = contents.replace(signingConfigsMatch[0], updatedSigningConfigs);

  // 2. Switch buildTypes.release.signingConfig from the default
  //    `signingConfigs.debug` to our env-var-driven choice.
  const releaseDefaultSigningRegex =
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  next = next.replace(releaseDefaultSigningRegex, `$1${RELEASE_SIGNING_REFERENCE}`);

  return next;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = injectSigningConfig(cfg.modResults.contents);
    return cfg;
  });
};
