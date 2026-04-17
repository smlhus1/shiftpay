/**
 * Type-safe query builder on top of expo-sqlite.
 *
 * Strategy: use Kysely as a *compile-only* SQL builder. We never let it
 * own the connection — instead, `compile()` produces `{ sql, parameters }`
 * which we hand to `database.runAsync` / `getAllAsync` directly.
 *
 * Why this shape:
 *   - No custom Kysely dialect to maintain (the community ones target
 *     `op-sqlite` or wrap `expo-sqlite/legacy` and have small maintainer
 *     populations)
 *   - Expo's connection lifecycle, AppState invalidation, and exclusive
 *     transactions stay in lib/db.ts where they already work
 *   - Kysely contributes pure compile-time safety: column-name typos and
 *     join mismatches become TypeScript errors at the call site
 *
 * Usage:
 *   const q = kdb
 *     .selectFrom("shifts")
 *     .selectAll()
 *     .where("schedule_id", "=", scheduleId)
 *     .where("deleted_at", "is", null);
 *   const { sql, parameters } = q.compile();
 *   const rows = await database.getAllAsync<ShiftRow>(sql, parameters);
 *
 * Or via the {@link runQuery} helper for the common case.
 */

import {
  Kysely,
  DummyDriver,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
} from "kysely";
import type * as SQLite from "expo-sqlite";
import type { Database } from "./db-schema";

/**
 * Compile-only Kysely instance. The DummyDriver guarantees calling
 * `.execute()` throws — every query MUST go through `.compile()` and
 * be handed to expo-sqlite manually. That keeps us from forgetting
 * to route through withDb / the AppState-aware connection lifecycle.
 */
export const kdb = new Kysely<Database>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
});

// expo-sqlite's SQLiteBindValue accepts string | number | null | Uint8Array.
// Kysely's CompiledQuery.parameters is `readonly unknown[]` because it
// depends on the dialect's serialiser. SqliteQueryCompiler only emits
// values our schema produces (string, number, null), so the cast at the
// boundary is safe.
type SqliteParam = string | number | null | Uint8Array;

/** Generic helper: compile a Kysely query and run it as a SELECT. */
export async function runQuery<T>(
  database: SQLite.SQLiteDatabase,
  query: { compile: () => CompiledQuery }
): Promise<T[]> {
  const c = query.compile();
  return database.getAllAsync<T>(c.sql, c.parameters as SqliteParam[]);
}

/** Generic helper: compile a Kysely query and run it as a write (insert/update/delete). */
export async function runWrite(
  database: SQLite.SQLiteDatabase,
  query: { compile: () => CompiledQuery }
): Promise<void> {
  const c = query.compile();
  await database.runAsync(c.sql, c.parameters as SqliteParam[]);
}
