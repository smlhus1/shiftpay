/**
 * Branded types — make invalid states unrepresentable at compile time.
 *
 * TypeScript is structural. Without branding, `string` flows freely across
 * ShiftDate, ShiftTime, UUID, and currency code boundaries. The brand
 * attaches a unique marker that erases at runtime but is enforced at
 * compile time, so `calculateExpectedPay(date, tariff)` can never
 * accidentally accept a UUID.
 *
 * Constructors (make*) are the ONLY path in. They validate + brand.
 * Pass 4 (business logic) leans heavily on these — the property-based
 * tests assert invariants on branded inputs, which gives free coverage
 * of the validator itself.
 *
 * Pattern: `type Foo = string & { readonly __brand: "Foo" }`.
 * Runtime cost: zero (the __brand key is never assigned).
 */

// ─── Dates and times ────────────────────────────────────────────────

/** DD.MM.YYYY, 2000–2100, with round-trip validation against JS Date. */
export type ShiftDate = string & { readonly __brand: "ShiftDate" };

/** HH:MM, 00:00–23:59. */
export type ShiftTime = string & { readonly __brand: "ShiftTime" };

/** Signed integer minutes. Positive forward from midnight, negative only
 * in internal arithmetic (e.g. DST corrections). */
export type Minutes = number & { readonly __brand: "Minutes" };

// ─── Money ──────────────────────────────────────────────────────────

/**
 * Integer øre (1/100 NOK). All pay arithmetic should operate on this type
 * and round once at output. Hand-rolled integer approach is preferred over
 * dinero.js/big.js — see research/refactor/pass-4-business-logic.md §4.
 */
export type Ore = number & { readonly __brand: "Ore" };

// ─── Identifiers ────────────────────────────────────────────────────

/** UUID v4 string. Enforced by constructor regex. */
export type Uuid = string & { readonly __brand: "Uuid" };

// ─── Currency & locale ──────────────────────────────────────────────

/** Closed set — extending this requires coordinated i18n and config updates. */
export type CurrencyCode = "NOK" | "SEK" | "DKK" | "EUR" | "GBP";

/** Closed set — matches lib/i18n/ locale files. */
export type LocaleCode = "nb" | "en" | "sv" | "da";

// ─── Constructors ────────────────────────────────────────────────────
// Each constructor validates its input and brands the value. They throw
// on invalid input — callers that want a non-throwing variant wrap the
// call in try/catch or use the matching `try*` helper.
//
// Round-trip philosophy: if the JS `Date` constructor would silently
// fix up the input (e.g. 31.02.2026 → 03.03.2026), the constructor
// rejects it. Mirrors lib/dates.ts parseDateSafe.

const SHIFT_DATE_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;
const SHIFT_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `DD.MM.YYYY` → `ShiftDate`. Round-trip validates against `new Date(...)`
 * so 31.02.2026 / 30.02.2026 / 29.02.2025 are rejected, not silently
 * rolled forward into the next month.
 */
export function makeShiftDate(raw: string): ShiftDate {
  const trimmed = raw.trim();
  if (!SHIFT_DATE_REGEX.test(trimmed)) {
    throw new Error(`Invalid ShiftDate: ${raw}`);
  }
  const [d, m, y] = trimmed.split(".").map(Number);
  if (d === undefined || m === undefined || y === undefined) {
    throw new Error(`Invalid ShiftDate: ${raw}`);
  }
  if (y < 2000 || y > 2100) {
    throw new Error(`ShiftDate year out of range: ${raw}`);
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new Error(`ShiftDate is not a real date: ${raw}`);
  }
  return trimmed as ShiftDate;
}

/** `HH:MM` (24h) → `ShiftTime`. Rejects 24:00, 25:00, 12:60, etc. */
export function makeShiftTime(raw: string): ShiftTime {
  const trimmed = raw.trim();
  if (!SHIFT_TIME_REGEX.test(trimmed)) {
    throw new Error(`Invalid ShiftTime: ${raw}`);
  }
  return trimmed as ShiftTime;
}

/**
 * Integer minutes — finite and free of fractional parts. Both signs are
 * permitted because internal arithmetic (DST corrections, overnight
 * adjustments) can legitimately produce a negative offset.
 */
export function makeMinutes(value: number): Minutes {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`Minutes must be a finite integer: ${value}`);
  }
  return value as Minutes;
}

/**
 * Integer øre. Must be a finite integer; negative values are rejected
 * because pay arithmetic should never produce a negative amount under
 * the current rules. If we ever need signed money (refunds, deductions),
 * relax this constructor or introduce a `SignedOre` brand.
 */
export function makeOre(value: number): Ore {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`Ore must be a finite integer: ${value}`);
  }
  if (value < 0) {
    throw new Error(`Ore must be non-negative: ${value}`);
  }
  return value as Ore;
}

/** UUID v4 → `Uuid`. Strict regex; case-insensitive. */
export function makeUuid(raw: string): Uuid {
  const trimmed = raw.trim();
  if (!UUID_V4_REGEX.test(trimmed)) {
    throw new Error(`Invalid Uuid (v4 expected): ${raw}`);
  }
  return trimmed as Uuid;
}
