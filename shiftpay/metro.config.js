const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Kysely's FileMigrationProvider uses a dynamic `await import(path)` that
// Hermes' parser rejects in the release bundle. We never use it at
// runtime (Kysely is compile-only — see lib/kdb.ts), so resolve any
// reference to it onto a small stub instead.
//
// Note: kysely/index.js reaches the offending file via a RELATIVE require
// (`./migration/file-migration-provider.js`), so a moduleName regex misses
// it. We let upstream resolution run, then redirect based on the resolved
// file path. Any other Kysely import path is left untouched.
const KYSELY_FILE_MIGRATION_REGEX =
  /kysely[\\/]dist[\\/](cjs|esm)[\\/]migration[\\/]file-migration-provider/;
const KYSELY_FILE_MIGRATION_STUB = path.resolve(
  __dirname,
  "lib/stubs/kysely-file-migration-provider.js"
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (
    resolved &&
    resolved.type === "sourceFile" &&
    typeof resolved.filePath === "string" &&
    KYSELY_FILE_MIGRATION_REGEX.test(resolved.filePath)
  ) {
    return { type: "sourceFile", filePath: KYSELY_FILE_MIGRATION_STUB };
  }
  return resolved;
};

module.exports = withNativeWind(config, { input: "./global.css" });
