/**
 * Pay calculation logic.
 *
 * Supplements as of Pass 4:
 *   - shift_type supplement (kveld / natt) from tariff rates
 *   - weekend supplement (lørdag + søndag)
 *   - holiday supplement (red days per lib/holidays.ts)
 *
 * Stacking rule (default): additive. Research Pass 4 §7 documents that
 * NSF/KS/Spekter tariffs are ambiguous on stacking — most real-world
 * interpretations add them together, so that is our default. A settings
 * toggle lets the user pick `replace` (holiday replaces weekend) if
 * their tariff is one of the conservative ones. The third policy `max`
 * applies only the largest of {holiday, weekend} supplements.
 *
 * All math runs in float with a single rounding at output (øre precision).
 * That keeps the property tests (permutation invariance, additivity) green
 * without an integer-øre rewrite — the compound-rounding anti-pattern is
 * avoided by the single round-at-end pattern.
 */

import { parseDateSafe } from "./dates";
import { isHoliday } from "./holidays";

export type ShiftType = "tidlig" | "mellom" | "kveld" | "natt";

export interface Shift {
  date: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  confidence?: number;
}

export interface TariffRates {
  base_rate: number;
  evening_supplement: number;
  night_supplement: number;
  weekend_supplement: number;
  holiday_supplement: number;
  overtime_supplement: number;
}

/**
 * Parse "HH:MM" to minutes since midnight.
 *
 * `??` only catches null/undefined — `Number("abc")` is NaN, not
 * undefined, so malformed input used to leak NaN downstream. Guard with
 * Number.isFinite so callers get 0 for garbage (logged upstream) rather
 * than silently propagating NaN into pay calculations.
 */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const hours = Number.isFinite(h) ? (h as number) : 0;
  const minutes = Number.isFinite(m) ? (m as number) : 0;
  return hours * 60 + minutes;
}

/**
 * Duration in hours. Handles overnight (22:00→06:00 = 8h). Equal start
 * and end collapse to 0 — a 24-hour shift is not a real use case and
 * was an artefact of the old `end <= start` overnight-wrap rule.
 */
export function shiftDurationHours(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end === start) return 0;
  if (end < start) {
    end += 24 * 60;
  }
  return (end - start) / 60;
}

/** DD.MM.YYYY → day of week 0–6 (0 = Sunday). Returns -1 if invalid. */
function dayOfWeek(dateStr: string): number {
  const date = parseDateSafe(dateStr);
  return date ? date.getDay() : -1;
}

function isWeekend(dateStr: string): boolean {
  const day = dayOfWeek(dateStr);
  return day === 0 || day === 6;
}

/**
 * How holiday and weekend supplements combine when a shift lands on a
 * red day that is also a Saturday/Sunday. See calculations module
 * header for the tariff context.
 *
 *  - "additive" (default): weekend + holiday + shift_type all stack.
 *    Treats each supplement as independent — most NSF/KS defaults.
 *  - "replace": holiday replaces weekend; shift_type still stacks.
 *    Used in conservative interpretations (Virke, some Spekter).
 *  - "max": only the largest of {holiday, weekend} applies; shift_type
 *    still stacks. Cheapest-employer interpretation.
 */
export type StackingPolicy = "additive" | "replace" | "max";

/** Hourly rate for this shift (base + shift_type + weekend/holiday per policy). */
function hourlyRateForShift(
  shift: Shift,
  rates: TariffRates,
  policy: StackingPolicy = "additive"
): number {
  let rate = rates.base_rate;

  // shift_type supplement is independent of the day (weekday classification)
  switch (shift.shift_type) {
    case "kveld":
      rate += rates.evening_supplement;
      break;
    case "natt":
      rate += rates.night_supplement;
      break;
    case "tidlig":
    case "mellom":
      break;
  }

  const weekend = isWeekend(shift.date);
  const holiday = isHoliday(shift.date);

  switch (policy) {
    case "additive":
      if (weekend) rate += rates.weekend_supplement;
      if (holiday) rate += rates.holiday_supplement;
      break;
    case "replace":
      // Holiday wins over weekend.
      if (holiday) rate += rates.holiday_supplement;
      else if (weekend) rate += rates.weekend_supplement;
      break;
    case "max":
      // Apply only the largest of the two day-supplements.
      if (holiday || weekend) {
        const candidates: number[] = [];
        if (holiday) candidates.push(rates.holiday_supplement);
        if (weekend) candidates.push(rates.weekend_supplement);
        rate += Math.max(...candidates);
      }
      break;
  }

  return rate;
}

/** Calculate extra pay from overtime minutes: base_rate × (1 + overtime_supplement/100). */
export function calculateOvertimePay(
  shifts: { overtime_minutes: number }[],
  rates: Pick<TariffRates, "base_rate" | "overtime_supplement">
): number {
  const hourlyRate = rates.base_rate * (1 + rates.overtime_supplement / 100);
  return shifts.reduce((sum, s) => sum + (s.overtime_minutes / 60) * hourlyRate, 0);
}

export function calculateExpectedPay(
  shifts: Shift[],
  rates: TariffRates,
  policy: StackingPolicy = "additive"
): number {
  let total = 0;
  for (const shift of shifts) {
    const hours = shiftDurationHours(shift.start_time, shift.end_time);
    const hourlyRate = hourlyRateForShift(shift, rates, policy);
    total += hours * hourlyRate;
  }
  return Math.round(total * 100) / 100;
}
