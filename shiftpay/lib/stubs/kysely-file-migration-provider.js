/**
 * Stub replacement for `kysely/dist/cjs/migration/file-migration-provider.js`.
 *
 * Why: Kysely's `FileMigrationProvider` uses a dynamic `await import(path)`
 * that Hermes' parser cannot statically analyse — the release JS bundle
 * fails with "Invalid expression encountered" on the transpiled
 * `yield import(...)` line. We never reach this code at runtime (we only
 * use Kysely as a compile-only SQL builder via lib/kdb.ts), so a stub
 * that throws if anyone actually constructs it is the cleanest fix.
 *
 * Wired via metro.config.js -> resolver.resolveRequest. If you ever
 * actually want a Node-style file migration provider in this app, replace
 * this stub with a custom React-Native-friendly implementation that does
 * NOT use dynamic import.
 */

class FileMigrationProvider {
  constructor() {
    throw new Error(
      "[ShiftPay] FileMigrationProvider is stubbed in this bundle. " +
        "Use the in-process migration runner in lib/db.ts instead."
    );
  }
}

module.exports = { FileMigrationProvider };
