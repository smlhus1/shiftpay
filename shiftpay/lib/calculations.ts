/**
 * Pay calculation logic — used in Phase 2.
 */

import { parseDateSafe } from "./dates";

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

/** Hourly rate for this shift (base + supplement by type, + weekend if applicable). */
function hourlyRateForShift(shift: Shift, rates: TariffRates): number {
  let rate = rates.base_rate;
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
  if (isWeekend(shift.date)) {
    rate += rates.weekend_supplement;
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

export function calculateExpectedPay(shifts: Shift[], rates: TariffRates): number {
  let total = 0;
  for (const shift of shifts) {
    const hours = shiftDurationHours(shift.start_time, shift.end_time);
    const hourlyRate = hourlyRateForShift(shift, rates);
    total += hours * hourlyRate;
  }
  return Math.round(total * 100) / 100;
}
