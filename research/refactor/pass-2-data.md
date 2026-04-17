# Pass 2 — Data Layer Architecture (expo-sqlite, 2026)

> Researched: 2026-04-16 | Sources consulted: 20+ | Confidence: High
> Target: ShiftPay (`shiftpay/lib/db.ts`) — Expo SDK 54, local-only, hand-written SQL

## TL;DR

**Keep hand-written SQL + expo-sqlite. Add three things: a `user_version`-based migration runner, a Kysely query-builder wrapper for type safety at the query-call site, and a proper connection-lifecycle contract that replaces the current stale-retry shim.** A full ORM (Drizzle) is tempting — but Drizzle's migration story on Expo requires Metro/Babel plugin surgery (`inline-import`, `.sql` resolver extension) and bundles pre-generated SQL as JS strings. For a single-user, single-database app with 3 tables and ~100–10 000 rows of data, the cost-benefit is marginal. Kysely gives ~95% of Drizzle's type safety with zero runtime (pure type-level query builder), and leaves raw SQL readable in git diffs.

**Recommendation (by confidence):**

1. **Fix first:** replace `withDb()` retry-once hack with a proper connection contract (see §4).
2. **Ship before Pass-3:** proper versioned migrations (§5), `:memory:` test harness (§6), JSON export (§8).
3. **Adopt gradually:** Kysely type-safe queries (§3) — migrate one function at a time.
4. **Defer:** SQLCipher (§9), cloud sync (§7 provides the hooks without the engine), ORM migration.

---

## 1. expo-sqlite SDK 54 API — what matters now

Expo SDK 54 consolidated the `expo-sqlite/next` API into the main module. The current surface is coherent but has several sharp edges that the existing `db.ts` already walks into.

### Sync vs async opening

| API | Blocks JS thread | When to use |
|-----|------------------|-------------|
| `openDatabaseSync(name, opts?)` | Yes | Tiny reads at startup, SQLiteProvider, SSR-style paths |
| `openDatabaseAsync(name, opts?)` | No | Everything else — production writes, migrations |

ShiftPay currently uses `openDatabaseAsync`, which is correct. The Expo docs are explicit: *"Running heavy tasks with the synchronous function can block the JavaScript thread and affect performance."*

### Prepared statements

`prepareAsync(sql)` returns a `SQLiteStatement` with `executeAsync(params)`, `getFirstAsync()`, `getAllAsync()`, and `finalizeAsync()`. Using `runAsync()` / `getAllAsync()` directly on the database (as `db.ts` does) is a *shortcut* — each call implicitly prepares, executes, and finalizes a statement. For ShiftPay's scale this is fine; for loops inserting >100 rows, switching to an explicit prepared statement reused across iterations gives 3–10× speedup.

Current pattern in `insertScheduleWithShifts()`:

```ts
// O(n) prepare+finalize per shift — fine up to ~50 shifts, wasteful at 500+
for (const s of validShifts) {
  await database.runAsync("INSERT INTO shifts ... VALUES (?, ?, ?, ...)", [...]);
}
```

Better pattern:

```ts
const stmt = await database.prepareAsync(
  "INSERT INTO shifts (id, schedule_id, date, start_time, end_time, shift_type, status, overtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', 0, ?)"
);
try {
  for (const s of validShifts) {
    await stmt.executeAsync([generateId(), scheduleId, s.date, s.start_time, s.end_time, s.shift_type, createdAt]);
  }
} finally {
  await stmt.finalizeAsync();
}
```

Always wrap in `try/finally` — orphaned statements *are* auto-finalized when the DB closes, but Expo's own guidance calls manual finalization a best practice, and orphaned statements are implicated in the "closing database with active prepared statement" error (issue #36821).

### withTransactionAsync vs withExclusiveTransactionAsync — **gotcha**

`withTransactionAsync` has a documented footgun: *"Any query that runs while the transaction is active will be included in the transaction, including query statements that are outside of the scope function."* Translation: if another part of the app fires a query while your transaction is open, that query silently joins your transaction and rolls back with it.

`withExclusiveTransactionAsync` fixes this. It takes a callback that receives a *transaction handle*, and **only queries on that handle** are inside the transaction. Everything else is forced to wait (or error with "database is locked").

**ShiftPay action:** audit every `withTransactionAsync` call. `insertScheduleWithShifts` and `deleteSchedule` are the two current uses. Both are on user-initiated flows where concurrent writes are unlikely but possible (notifications can fire a confirm-shift write during import). Migrate to `withExclusiveTransactionAsync`.

### Connection pooling surprise

Default behaviour: two `openDatabaseAsync("shiftpay.db")` calls return *the same underlying connection*. Calling `closeAsync()` on either handle closes the connection for both. Pass `useNewConnection: true` to get an independent connection with ref-counted behaviour (issue #33677).

ShiftPay already uses a singleton `db` variable, so pooling isn't biting us — but if we ever add a worker or background task that opens the DB, it will.

---

## 2. Migration systems — hand-rolled vs ORM

### Options compared

| Option | Bundle cost | Type safety | Migration ergonomics | Lock-in | Verdict for ShiftPay |
|--------|-------------|-------------|----------------------|---------|----------------------|
| **Hand-rolled + `user_version`** | 0 KB | None (raw SQL) | Manual up-fn per version | None | ✅ Simplest, recommended base |
| **Drizzle ORM + drizzle-kit** | ~30 KB + generated `.sql` strings bundled as JS | Excellent (schema → types) | Auto-generated SQL diffs, `useMigrations` hook | High (schema DSL) | ⚠️ Overkill for 3 tables |
| **Kysely (query builder only)** | ~15 KB, pure types | Excellent (100% TS) | None built-in — bring your own migration runner | Low (it's just typed SQL) | ✅ Add on top of hand-rolled |
| **WatermelonDB** | ~50 KB + reactive overhead | Decent | Schema migrations built-in, observer pattern | Very high | ❌ Wrong tool for non-reactive domain |
| **libSQL / Turso embedded** | ~200 KB+ native | Via Drizzle | Server-backed; branchable DBs | High, beta in RN | ❌ Not for local-first MVP |

### Drizzle specifics (if we did adopt it)

Setup cost is real, not hypothetical:

1. `babel.config.js` → add `["inline-import", { "extensions": [".sql"] }]`
2. `metro.config.js` → `config.resolver.sourceExts.push('sql')`
3. `drizzle.config.ts` → `dialect: 'sqlite', driver: 'expo'`
4. Schema file in DSL: `sqliteTable("shifts", { id: text("id").primaryKey(), ... })`
5. `npx drizzle-kit generate` → produces numbered `.sql` files
6. In app: `useMigrations(db, migrations)` hook

Upsides: `drizzle-zod` gives automatic Zod schemas from table definitions. `useLiveQuery` + `enableChangeListener` gives reactive queries for free. Good for teams.

Downsides: `.sql` files must be bundled into the JS bundle as strings. If a migration fails in production, the only trace is the `useMigrations` hook error state — no way to safely rollback or skip.

**Verdict:** not worth it for ShiftPay v1. Revisit if we add >10 tables or multiple engineers.

### Recommended: hand-rolled runner

```ts
// lib/migrations.ts
type Migration = { version: number; name: string; up: (db: SQLiteDatabase) => Promise<void> };

const migrations: Migration[] = [
  { version: 1, name: "initial_schema", up: async (db) => { await db.execAsync(INITIAL_SQL); } },
  { version: 2, name: "add_overtime_supplement", up: async (db) => {
    await db.execAsync("ALTER TABLE tariff_rates ADD COLUMN overtime_supplement REAL NOT NULL DEFAULT 40");
  }},
  { version: 3, name: "add_pay_type", up: async (db) => { /* ... */ }},
  // ...
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))!;
  for (const m of migrations.filter((m) => m.version > user_version)) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await m.up(txn);
      await txn.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}
```

This collapses the four current ad-hoc `migrateXxx` functions into a single ordered list with atomic version bumps.

---

## 3. Type-safe queries without a full ORM

The current `db.ts` uses generic parameter `<TariffRatesRow>` on `getAllAsync`. This is *casting*, not validation — a schema drift between code and DB silently returns wrong-shaped data.

### Layered approach (recommended)

**Layer 1: Kysely for compile-time query safety**

Kysely is a pure TypeScript query builder — no runtime overhead beyond a few KB of glue. You declare your DB schema as a TS interface once, and every query gets autocomplete, join-type-checking, and column existence checks:

```ts
// lib/db-types.ts
interface Database {
  tariff_rates: { id: number; base_rate: number; /* ... */ };
  schedules: { id: string; period_start: string; /* ... */ };
  shifts: ShiftRow;
}

// usage
const shifts = await kdb
  .selectFrom("shifts")
  .selectAll()
  .where("schedule_id", "=", scheduleId)  // ← TS errors if column name wrong
  .execute();
```

Two Expo-compatible dialects exist: `kysely-expo-sqlite-dialect` (thin wrapper, 43 stars, actively maintained) and `kysely-expo` (component-based `KyselyProvider`, similar scale). Both are community packages — neither has reached v1.0 or Drizzle-level adoption. Use the thin dialect, not the provider.

**Layer 2: Zod at boundary for runtime safety**

Kysely can't protect you from a DB where someone hand-ran an `ALTER TABLE` that broke the schema. For boundary reads (initial fetch from DB, OCR response, CSV import), validate with Zod:

```ts
const ShiftRowZ = z.object({
  id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
  start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
  status: z.enum(["planned", "completed", "missed", "overtime"]),
  // ...
});
```

This is exactly the pattern ShiftPay already uses in `lib/api.ts` for OCR responses — extend it to DB reads. Cheap on hot paths (sub-ms per row), skip for bulk analytics queries.

**Do not use `drizzle-zod` unless you adopt Drizzle.** Standalone Zod schemas are fine.

---

## 4. Connection management — the root cause of `withDb()`

The current `isDbGoneError()` check and retry-once pattern is a symptom of three things:

1. **Android native module lifecycle:** when the app is backgrounded on low-memory Android devices, the JS runtime can be preserved while native modules are torn down. A `SQLiteDatabase` reference held in JS can still dispatch calls, but the native pointer is null → `NullPointerException: prepareAsync has been rejected`.
2. **Connection pool close-through:** `closeAsync` on a pooled connection kills it for all holders. Any component that calls `closeAsync` breaks the singleton.
3. **Race on first init:** if two screens mount and both call `initDb()` before the first resolves, the old pre-next API would double-open. The current `dbInitPromise` lock handles this, which is correct.

### Proper fix

The retry-once approach is reasonable — but bury it in a proper lifecycle, not scattered across every query function:

```ts
// lib/db-connection.ts
import { AppState, type AppStateStatus } from "react-native";

let conn: SQLiteDatabase | null = null;
let openPromise: Promise<SQLiteDatabase> | null = null;

async function reopen(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  return db;
}

export async function getConnection(): Promise<SQLiteDatabase> {
  if (conn) return conn;
  if (openPromise) return openPromise;
  openPromise = reopen().then((db) => { conn = db; return db; }).finally(() => { openPromise = null; });
  return openPromise;
}

export async function query<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getConnection());
  } catch (e) {
    if (isConnectionDead(e)) {
      conn = null;  // force reopen on next call
      return fn(await getConnection());
    }
    throw e;
  }
}

// On app foreground, probe the connection
AppState.addEventListener("change", async (state: AppStateStatus) => {
  if (state === "active" && conn) {
    try { await conn.getFirstAsync("SELECT 1"); }
    catch { conn = null; }  // pre-emptively invalidate
  }
});
```

Key additions over current code:
- **AppState listener** catches the stale-connection case *before* the user hits it.
- **WAL + foreign_keys pragmas** enabled at every open (not just schema creation).
- **Single retry point** instead of `withDb()` wrapping every query.

### Why not `useNewConnection: true`?

You lose the pool (fine for a 3-table app) but also the automatic WAL reader/writer coordination. On Android, opening many connections in quick succession also increases the surface for `SQLITE_BUSY` errors. Stick with pooled + single reopen strategy.

---

## 5. Schema versioning — production-safe migrations

### Principles

1. **Up-only migrations.** SQLite doesn't support `DROP COLUMN` until 3.35 (2021, mostly available on Android 13+). For older Android, column-removing migrations need the 12-step table-rebuild dance. Don't. Just leave dead columns.
2. **Each migration in its own transaction.** `withExclusiveTransactionAsync` + bump `PRAGMA user_version` at the end of the same transaction. If the migration fails mid-flight, version stays, migration re-runs on next boot.
3. **No computed migrations.** Don't put loops that do `SELECT ... DO stuff in JS ... UPDATE`. Race-prone. Put the whole transform in pure SQL (`UPDATE shifts SET x = CASE WHEN ... END`).
4. **Test each migration against a copy of production data** before shipping. The existing `migrateTimesheetsToSchedules` iterates rows and parses JSON in JS — this is the pattern to avoid.

### `PRAGMA user_version` — historical quirk

Old issue (2018) noted reading `user_version` on Android returned an error while setting it worked. **Resolved** — works in SDK 54 on both platforms. The GitHub issue #1489 is closed.

### Rollback reality check

For a local-only app, there is no rollback. If a user upgrades from v1.3 → v1.4 and v1.4 migrates the schema, downgrading to v1.3 *will* break. Android's Play Store allows no app downgrades by default. iOS allows it via TestFlight. Treat schema migrations as one-way.

**Strategy:** if a migration is risky, write the pre-migration DB to `{dbPath}.backup-v${oldVersion}` before running. Users who hit bugs can manually restore via a hidden "rollback" setting.

---

## 6. Testing the data layer

### The problem

`expo-sqlite` is a native module. It does not load in Node/Jest. The community solution is `expo-sqlite-mock` — a pure JS shim on top of `better-sqlite3` that implements the expo-sqlite API surface.

### Recommended test setup

```js
// jest.config.js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["<rootDir>/test/db-setup.ts"],
};
```

```ts
// test/db-setup.ts
import { openDatabaseAsync } from "expo-sqlite";
import { runMigrations } from "../lib/migrations";

// Each test file gets a fresh :memory: DB
beforeEach(async () => {
  resetDbSingleton();  // expose a reset fn from lib/db-connection
  const db = await openDatabaseAsync(":memory:");
  await runMigrations(db);
});
```

### Patterns that work

- **Per-test isolation via `:memory:`** — opens in ~1ms, fresh schema every time.
- **Seed via migrations, not fixtures.** Run `runMigrations()` to create tables; insert minimal fixture rows via the same API the app uses. This catches migration bugs as a side effect.
- **Transaction-rollback trick** (optional): wrap each test in a transaction that's rolled back at the end. Faster than re-seeding, but doesn't work for tests that test migrations themselves.
- **Avoid mocking `initDb`.** Mocked calls verify plumbing, not correctness. The `better-sqlite3`-backed mock is realistic enough to catch 90% of bugs.

### `better-sqlite3` caveats

- Synchronous API under the hood — your async tests are pseudo-async. Timing-sensitive code may behave differently in prod.
- No `withTransactionAsync` semantics — the mock's transaction handling differs slightly.
- `PRAGMA journal_mode = WAL` is a no-op in memory mode. Test with and without.

---

## 7. Offline-first hooks to set up *now* (for v2 cloud sync)

Even though cloud sync is out of scope for v1, three cheap schema decisions prevent painting into a corner:

### Add `updated_at` + `deleted_at` to every user-data table

```sql
ALTER TABLE shifts ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE shifts ADD COLUMN deleted_at TEXT;  -- NULL = live, ISO timestamp = tombstoned
-- Same for schedules, tariff_rates (single row is easier), monthly_pay
```

**Rule:** never `DELETE` user data. Update `deleted_at`. Queries filter `WHERE deleted_at IS NULL`. This lets a v2 sync engine replay the last N changes without losing deletes, and gives users an "undo delete" within the same session for free.

### Add a `sync_state` column (or a sidecar table)

Three values only: `local` (unsynced change), `synced` (server has it), `syncing` (in flight). Even without a sync engine, this column gives you a "number of unsynced changes" badge for v2 and forces the data layer to think about sync boundaries now.

Alternative: sidecar `sync_queue (id, table, record_id, op, payload, attempts, last_error, created_at)`. Better if most data is usually synced — avoids polluting every read query with sync-state checks. Worse if you need sync state *in* the record (e.g., showing a dotted border on unsynced shifts).

### Lamport-clock-lite: monotonic `updated_at`

Instead of `new Date().toISOString()`, use `HLC` (hybrid logical clock): `max(now, last_seen) + 1`. Protects against clock skew and two changes at the same millisecond from different devices. The `sqlite-sync` project (sqliteai/sqlite-sync) uses full CRDTs; for ShiftPay a monotonic counter is plenty.

**Don't** add these now as working features. **Do** add `updated_at` and `deleted_at` columns in the next migration, populate from `created_at`/NULL, and update them on every write. Cost: 2 hours. Value: enables v2 sync without a schema migration under pressure.

### What to avoid

- Adopting `sqlite-sync`, `PowerSync`, or `ElectricSQL` now. All three pin you to their sync engines and require a specific backend (SQLite Cloud, PowerSync server, Electric + Postgres). ShiftPay's current plan uses Supabase — stay compatible with plain Postgres.
- Writing your own CRDT. Look at this again in 12 months if cloud sync is still on the roadmap. Right now, "last write wins with timestamps" is enough (conflicts are rare — one user, maybe 2 devices).

---

## 8. Backup / export — v1 must-have

Users will ask for this within days of launch. Getting it right is cheap.

### Recommended: JSON export → SAF picker → shareable file

```ts
export async function exportAllData(): Promise<{ uri: string }> {
  const snapshot = {
    version: 1,
    exported_at: new Date().toISOString(),
    tariff_rates: await query((db) => db.getAllAsync("SELECT * FROM tariff_rates")),
    schedules: await query((db) => db.getAllAsync("SELECT * FROM schedules")),
    shifts: await query((db) => db.getAllAsync("SELECT * FROM shifts")),
    monthly_pay: await query((db) => db.getAllAsync("SELECT * FROM monthly_pay")),
  };
  const json = JSON.stringify(snapshot, null, 2);
  const filename = `shiftpay-backup-${snapshot.exported_at.slice(0, 10)}.json`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: "utf8" });
  return { uri };  // hand to Sharing.shareAsync() — user picks destination via SAF
}
```

Android's Storage Access Framework is invoked automatically by `expo-sharing` — no need for `react-native-scoped-storage`. Users pick Drive/Downloads/email/whatever.

### Import

The inverse: `FileSystem.readAsStringAsync`, Zod-validate the JSON against a schema, offer "merge" (upsert by id) vs "replace" (wipe + insert) strategies. Present as a modal with diff count: *"This will add 42 shifts and overwrite 3 tariff rates."*

### Encryption of exports

Optional. Offer a password field → derive key with PBKDF2 (Expo has `expo-crypto.digestStringAsync`) → encrypt with AES-GCM using `react-native-quick-crypto` or Web Crypto. For ShiftPay, probably overkill for v1 unless users ask. A plaintext JSON is consistent with the "local-only, no cloud" stance.

### Direct SQLite export (alternative)

`db.serializeAsync()` returns a `Uint8Array` of the DB file. Ship that. Pros: byte-exact, includes indexes. Cons: opaque to users, can't re-import into a different app version if schema changed. **Use JSON.**

---

## 9. Encryption at rest — SQLCipher

### When it's worth it

- App stores medical/financial/legal data that triggers statutory protection.
- Device has no full-disk encryption (rare in 2026 — iOS always, Android 10+ always).
- Threat model includes "attacker with rooted device, physical access, app data readable".

### When it's not

- App data is also on the user's payslip, bank, and employer HR system in plaintext.
- User already trusts the device enough to unlock it with their biometric.

### ShiftPay analysis

Pay rates and shift times are sensitive but not catastrophic. A rooted/stolen Android phone is a bigger threat to the user's email, banking app, and password manager than to ShiftPay. Modern Android encrypts app-private storage by default — `${documentDirectory}SQLite/` is inside that. Adding SQLCipher is defence-in-depth, but the cost is real:

- **Setup:** `useSQLCipher: true` in `app.json` config plugin, `npx expo prebuild`, deal with `android/` regen (already gitignored per memory).
- **Key management:** where do you store the encryption key? `expo-secure-store` (Keystore/Keychain) is the right answer, but the first call generates the key, and **key-loss = data-loss**. Users who wipe their app data lose everything.
- **Performance:** Zetetic quotes 5–15% overhead. Negligible for ShiftPay's query volume.
- **Expo Go incompatibility:** forces EAS builds only. Already ShiftPay's reality (APK via `expo run:android`), so this isn't an added constraint.

**Verdict:** defer. Revisit if (a) users request it, (b) a sensitive field like social-security number is added, or (c) the app targets enterprise buyers who demand it.

---

## 10. Query logging & dev-mode debugging

Not built in. Three options:

### Option A: Thin wrapper

```ts
async function runLogged<T>(sql: string, params: unknown[], fn: () => Promise<T>): Promise<T> {
  if (!__DEV__) return fn();
  const start = performance.now();
  try {
    const result = await fn();
    console.log(`[DB ${(performance.now() - start).toFixed(1)}ms]`, sql, params);
    return result;
  } catch (e) {
    console.error(`[DB ERR ${(performance.now() - start).toFixed(1)}ms]`, sql, params, e);
    throw e;
  }
}
```

Drop-in for every `runAsync` / `getAllAsync` call. Zero prod cost (DCE via `__DEV__`).

### Option B: Drizzle Studio plugin

`npx drizzle-kit studio` + Expo Drizzle Studio (on-device DB inspector). Only works if you adopt Drizzle. Nice UX.

### Option C: `addDatabaseChangeListener` for write-tracking

```ts
if (__DEV__) {
  addDatabaseChangeListener(({ tableName, rowId }) => {
    console.log(`[DB change] ${tableName} row ${rowId}`);
  });
}
```

Requires `enableChangeListener: true` at open. Doesn't show SELECT, only modifications. Useful for catching "what wrote this?" bugs.

**Recommendation:** Option A now, Option C when you hit a mystery-write bug.

---

## 11. Repository pattern — when it earns its keep

### Current state

`db.ts` is already a de facto repository: exported functions (`getShiftsBySchedule`, `insertScheduleWithShifts`, `confirmShift`) hide SQL behind intent-named calls. It's just not *organized* as one.

### Options

| Pattern | Verdict for ShiftPay |
|---------|----------------------|
| **Function-per-operation (current)** | ✅ Fine at 3 tables. Becomes hard to find things past ~30 functions. |
| **Class-based repository (`ShiftRepo.getBySchedule`)** | ⚠️ Ceremony without much benefit for a one-person app. |
| **Split by domain (`shifts-repo.ts`, `schedule-repo.ts`, `tariff-repo.ts`)** | ✅ Recommended. Same code, three files. Eases discoverability. |
| **Repository + interface for mocking** | ❌ Overkill — `:memory:` DB in tests is more realistic than a mocked interface. |

### Actual recommendation

When `db.ts` crosses ~500 lines (it's already at 738), split into:

- `lib/db/connection.ts` — open, migrations, withDb equivalent
- `lib/db/tariff-repo.ts` — `getTariffRates`, `setTariffRates`
- `lib/db/schedule-repo.ts` — `getAllSchedules`, `getScheduleById`, `deleteSchedule`, `insertScheduleWithShifts`
- `lib/db/shift-repo.ts` — everything else
- `lib/db/migrations.ts` — the versioned migration list
- `lib/db/export.ts` — JSON export/import
- `lib/db/index.ts` — barrel re-exports

Keep the flat function API (`insertScheduleWithShifts()` not `ScheduleRepo.insertWithShifts()`) — it's what every caller already uses. This is refactoring the *file layout*, not the *abstraction layer*. Small diff, big readability win.

---

## Gotchas & considerations

- **Connection pooling + `closeAsync`:** never call `closeAsync` on a pooled connection unless you're shutting down. Use `useNewConnection: true` if you need true isolation (tests, workers).
- **`withTransactionAsync` isolation leak:** documented Expo footgun. Migrate to `withExclusiveTransactionAsync`.
- **UUID v4 regex validation:** already present in code for deep-link safety. Keep it. Don't drop to looser regex when adding new ID-accepting fns.
- **`DD.MM.YYYY` everywhere:** already a source of bugs (the existing code compares via `dateToComparable` correctly, but any new query that does `WHERE date > '2026-01-01'` will silently fail because DD.MM.YYYY sorts lexically wrong). **Consider migrating to ISO dates in DB.** ISO is sortable, comparable, and standard. Display format stays DD.MM.YYYY. A migration that does `UPDATE shifts SET date = substr(date,7,4)||'-'||substr(date,4,2)||'-'||substr(date,1,2)` is three lines and prevents 10 future bugs. **Raise this with the user before Pass 3.**
- **Filter-in-JS anti-pattern:** `getUpcomingShifts`, `getShiftsDueForConfirmation`, `getShiftsInDateRange`, `getMonthSummary` all `SELECT *` then filter in JS. At 100 shifts this is fine; at 10 000 it's a noticeable hang. Fixing this requires ISO dates (see above) so indices work. These two refactors go together.
- **`getDistinctMonthsWithShifts` parses DD.MM.YYYY in JS instead of using SQLite `substr`:** same root cause.
- **Test before shipping migrations:** even the hand-rolled migrations in the current `db.ts` have a subtle bug — `migrateAddPayType` adds two separate `ALTER TABLE` statements outside a transaction. If the app is killed between them, the DB is in a partial state and the next boot only catches the second one (which succeeds as a no-op). Always wrap migrations in `withExclusiveTransactionAsync`.

---

## Recommendations — prioritized checklist

**Do in Pass 2 (this pass):**

1. ✅ Introduce `lib/db/migrations.ts` with `user_version`-based runner. Fold existing four `migrateXxx` fns into ordered list.
2. ✅ Replace `withDb()` retry shim with AppState-aware `getConnection()` that pre-validates on foreground.
3. ✅ Switch `withTransactionAsync` → `withExclusiveTransactionAsync` for both current call sites.
4. ✅ Add `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;` on every open (currently missing).
5. ✅ Add `updated_at` + `deleted_at` columns to shifts/schedules/monthly_pay. Populate. Tombstone instead of hard delete.
6. ✅ Split `db.ts` into file-per-table repos; keep flat function API.
7. ✅ Add JSON export + import with Zod validation.
8. ✅ Add `expo-sqlite-mock` + `:memory:` test harness. Cover migrations + core CRUD paths.

**Do in a later pass (or surface as decision now):**

- Migrate `date` storage to ISO format. High-value, one-way, touches every filter. Needs explicit user approval.
- Adopt Kysely for new query code; leave existing repo functions alone.
- Index `shifts(date, status)` for the common "upcoming shifts" query once ISO dates land.

**Defer:**

- Full ORM (Drizzle). Reconsider at 10+ tables or when a second engineer joins.
- SQLCipher. Reconsider when a sensitive field is added or enterprise ask lands.
- Local-first CRDT sync engine (PowerSync, sqlite-sync, Electric). Schema hooks above are sufficient insurance.

---

## Sources

1. [Expo SQLite SDK docs](https://docs.expo.dev/versions/latest/sdk/sqlite/) — current API surface, transaction semantics, SQLCipher config
2. [PowerSync RN database performance comparison](https://www.powersync.com/blog/react-native-database-performance-comparison) — benchmark methodology, WAL/batching importance
3. [Drizzle ORM Expo SQLite setup](https://orm.drizzle.team/docs/connect-expo-sqlite) — metro/babel plugin requirements, useMigrations hook
4. [Kysely-expo GitHub](https://github.com/mphill/kysely-expo) — maturity, setup pattern
5. [expo issue #28176: prepareAsync NullPointerException](https://github.com/expo/expo/issues/28176) — stale connection bug root cause
6. [expo issue #33677: connection pool + closeAsync](https://github.com/expo/expo/issues/33677) — pooling semantics, useNewConnection
7. [expo issue #36821: closing DB with active prepared statement](https://github.com/expo/expo/issues/36821) — finalization best practice
8. [Gennady's expo-sqlite wrapper](https://blog.gennady.pp.ua/wrapper-for-expo-sqlite-with-async-await-migrations-and-transactions-support/) — production patterns for migrations + transactions
9. [expo-sqlite-mock](https://github.com/zfben/expo-sqlite-mock) — Jest testing solution
10. [Modern SQLite for React Native (Expo blog)](https://expo.dev/blog/modern-sqlite-for-react-native-apps) — SDK 52+ API rationale
11. [SQLite Sync / CRDT offline patterns](https://github.com/sqliteai/sqlite-sync) — tombstones, Lamport clocks, outbox pattern
12. [DEV: React Native offline-first SQLite sync](https://dev.to/sathish_daggula/react-native-offline-first-conflict-safe-sqlite-sync-549a) — outbox + last_modified patterns
13. [SQLCipher for React Native (Zetetic)](https://www.zetetic.net/sqlcipher/react-native/) — encryption integration
14. [Scoped Storage in React Native (Notesnook)](https://blog.notesnook.com/scoped-storage-in-react-native/) — SAF integration for exports
15. [Building local-first apps with Expo SQLite + Drizzle (Taha)](https://israataha.com/blog/build-local-first-app-with-expo-sqlite-and-drizzle/) — migration-bundling strategy
16. [SQLite PRAGMA reference](https://sqlite.org/pragma.html) — user_version, journal_mode, foreign_keys
17. [How to Make Expo SQLite Reactive with React Query (DEV)](https://dev.to/ramsayromero/how-to-make-expo-sqlite-reactive-with-react-query-26fo) — reactive query alternative to Drizzle live queries
18. [react-native-expo-raw-sql-migrations](https://github.com/snamiki1212/react-native-expo-raw-sql-migrations) — raw-SQL migration runner pattern
19. [Handling migrations in RN with SQLite and fp-ts](https://www.dgopsq.space/blog/handling-migrations-rn-sqlite-fp-ts) — migration list + version bump pattern
20. [kysely-zod-sqlite](https://github.com/windwp/kysely-zod-sqlite) — Kysely + Zod integration for boundary validation
