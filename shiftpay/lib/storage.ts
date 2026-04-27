/**
 * Typed key-value storage for ShiftPay preferences (theme, locale,
 * currency, onboarding flag, scheduled-notification map).
 *
 * Backed by react-native-mmkv. Reads are SYNCHRONOUS, which is the
 * whole point: ThemeProvider and LocaleProvider can read their state
 * at module scope before the first render and never flash the wrong
 * theme. AsyncStorage's promise-based read forced a `loaded` flag and
 * a null first render — that goes away here.
 *
 * Boundary validation: every read goes through Valibot, so a
 * downgraded-then-upgraded app can't crash on a value that's no longer
 * shaped correctly. Invalid values fall back to the supplied default
 * and the bad blob is dropped (not preserved as garbage).
 */

import { createMMKV, type MMKV } from "react-native-mmkv";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as v from "valibot";

const mmkv: MMKV = createMMKV({ id: "shiftpay" });

/**
 * Read a JSON-encoded value, validate it against `schema`, return
 * `defaultValue` on miss / parse failure / validation failure. The bad
 * blob is dropped from storage on validation failure so we don't keep
 * re-validating it on every boot.
 */
export function getJSON<T>(key: string, schema: v.GenericSchema<unknown, T>, defaultValue: T): T {
  const raw = mmkv.getString(key);
  if (raw === undefined) return defaultValue;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    mmkv.remove(key);
    return defaultValue;
  }
  const result = v.safeParse(schema, parsed);
  if (!result.success) {
    if (__DEV__) {
      console.warn(`[storage] schema rejected value at ${key}, dropping`, result.issues);
    }
    mmkv.remove(key);
    return defaultValue;
  }
  return result.output;
}

/** Write a value as JSON. No schema check on write — caller's job. */
export function setJSON<T>(key: string, value: T): void {
  mmkv.set(key, JSON.stringify(value));
}

/** Read a string directly (for short-text keys that don't need JSON). */
export function getString(key: string): string | undefined {
  return mmkv.getString(key);
}

export function setString(key: string, value: string): void {
  mmkv.set(key, value);
}

export function removeKey(key: string): void {
  mmkv.remove(key);
}

export function hasKey(key: string): boolean {
  return mmkv.contains(key);
}

/**
 * Test-only: wipe the entire storage so suite-level setup can start
 * from a clean slate without leaking state across tests.
 */
export function _clearAllForTests(): void {
  mmkv.clearAll();
}

/** Underlying instance for one-shot scripts (migrations, debug tools). */
export function _rawMmkv(): MMKV {
  return mmkv;
}

// ─── One-shot AsyncStorage → MMKV migration ──────────────────────────
//
// Runs idempotently from each provider's mount effect. If MMKV already
// has the key, the migration short-circuits. Otherwise it pulls the
// value out of AsyncStorage, optionally parses it via the caller's
// `parse` function, writes it to MMKV, and deletes the AsyncStorage
// entry. The AsyncStorage dep stays in the project until enough release
// cycles have passed that we're confident no user is upgrading from
// pre-MMKV — then this helper and the dep get removed in a future pass.

/**
 * Pull `key` from AsyncStorage into MMKV exactly once.
 *
 * @param key  Storage key shared between AsyncStorage and MMKV.
 * @param parse  Validator + transformer. Returning `null` means "ignore
 *   this value, fall back to the default in MMKV" — used to filter out
 *   garbage left over from a downgrade.
 * @returns the migrated value if a migration happened, `null` if the key
 *   was already in MMKV (no-op), or `null` if AsyncStorage had no value.
 */
export async function migrateAsyncStorageKey<T>(
  key: string,
  parse: (raw: string) => T | null,
  serialize: (value: T) => string = (v) => (typeof v === "string" ? v : JSON.stringify(v))
): Promise<T | null> {
  if (mmkv.contains(key)) return null;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (e) {
    if (__DEV__) console.warn(`[storage] AsyncStorage read failed for ${key}`, e);
    return null;
  }
  if (raw === null) return null;
  const parsed = parse(raw);
  if (parsed === null) {
    // Bad value — drop it from AsyncStorage so it can't keep getting
    // re-read on every boot.
    void AsyncStorage.removeItem(key).catch(() => {});
    return null;
  }
  mmkv.set(key, serialize(parsed));
  void AsyncStorage.removeItem(key).catch(() => {});
  return parsed;
}
