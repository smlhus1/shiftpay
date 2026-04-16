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
// Pass 4 lands the full validating makeShiftDate/makeShiftTime/makeOre
// helpers. Keeping scaffolding here so the types are importable from
// passes 2/3 without bike-shedding the validator API before Pass 4.

// Example (implemented in Pass 4):
//   export function makeShiftDate(raw: string): ShiftDate {
//     if (!/^\d{2}\.\d{2}\.\d{4}$/.test(raw.trim())) {
//       throw new Error(`Invalid ShiftDate: ${raw}`);
//     }
//     return raw.trim() as ShiftDate;
//   }
