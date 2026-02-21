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

/** Parse "HH:MM" to minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Duration in hours; handles overnight (e.g. 22:00–06:00 = 8h). */
export function shiftDurationHours(startTime: string, endTime: string): number {
  let start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) {
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
