/**
 * Daylight-saving correction for Europe/Oslo (sommertid / vintertid).
 *
 * A naive `endMin - startMin` overstates the duration of a shift that
 * brackets a DST transition by 60 min one way or the other. This module
 * returns the signed adjustment so callers can fold it into the duration
 * computation:
 *
 *     adjustedMinutes = naiveMinutes + dstAdjustmentMinutes(date, start, end)
 *
 * Sign convention:
 *   - Spring forward (last Sunday of March, 02:00 → 03:00 local): -60.
 *     The clock skips an hour, so a 22:00→06:00 shift covers 7 real hours.
 *   - Fall back   (last Sunday of October, 03:00 → 02:00 local): +60.
 *     The clock repeats an hour, so a 22:00→06:00 shift covers 9 real hours.
 *   - Otherwise 0.
 *
 * Computation is pure integer math on the shift's local DD.MM.YYYY +
 * HH:MM. No JS Date timezone shenanigans, no Intl, no host-TZ assumptions.
 * Verified against Norway's official DST schedule via lib/dst.test.ts.
 */

const SPRING_FORWARD_BOUNDARY_MIN = 2 * 60; // 02:00 local
const FALL_BACK_BOUNDARY_MIN = 3 * 60; // 03:00 local
const DAY_MIN = 24 * 60;

/**
 * Day-of-month for the last Sunday in `month` (1-12) of `year`. Gregorian
 * only; works for the entire 1900-2199 range relevant to this app.
 */
export function lastSundayOf(year: number, month: number): number {
  // Last day of the month: day 0 of (month + 1) goes back one day.
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  const lastDay = lastDayDate.getUTCDate();
  const weekday = lastDayDate.getUTCDay(); // 0 = Sunday
  return lastDay - weekday;
}

/** Days between two YMD tuples (positive if `b > a`). */
function daysBetween(
  ay: number,
  am: number,
  ad: number,
  by: number,
  bm: number,
  bd: number
): number {
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / (DAY_MIN * 60 * 1000));
}

/** "HH:MM" → minutes since midnight, or null on garbage input. */
function hhmmToMin(time: string): number | null {
  const parts = time.trim().split(":");
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h! < 0 || h! > 23 || m! < 0 || m! > 59) return null;
  return h! * 60 + m!;
}

/**
 * Returns the DST adjustment in minutes for a shift that may bracket a
 * Europe/Oslo transition. Returns 0 if the shift is not on a transition
 * day (or the day before, for an overnight shift).
 *
 * `dateStr` is `DD.MM.YYYY` (the public app format).
 * `startTime` and `endTime` are `HH:MM`. End ≤ start indicates an
 * overnight shift that wraps to the next day.
 */
export function dstAdjustmentMinutes(dateStr: string, startTime: string, endTime: string): number {
  const dateParts = dateStr.trim().split(".");
  if (dateParts.length !== 3) return 0;
  const [dd, mm, yyyy] = dateParts.map(Number);
  if (
    !Number.isFinite(dd) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(yyyy) ||
    yyyy! < 1900 ||
    yyyy! > 2199
  ) {
    return 0;
  }

  const startMin = hhmmToMin(startTime);
  const endMinRaw = hhmmToMin(endTime);
  if (startMin === null || endMinRaw === null) return 0;
  // Overnight: end ≤ start means the shift wraps to the next day.
  const endMin = endMinRaw <= startMin ? endMinRaw + DAY_MIN : endMinRaw;

  // A shift can only sit on top of one transition — they're 7 months apart.
  const springDay = lastSundayOf(yyyy!, 3);
  const springOffset = daysBetween(yyyy!, mm!, dd!, yyyy!, 3, springDay) * DAY_MIN;
  const springBoundary = springOffset + SPRING_FORWARD_BOUNDARY_MIN;
  if (springBoundary >= startMin && springBoundary < endMin) {
    return -60;
  }

  const fallDay = lastSundayOf(yyyy!, 10);
  const fallOffset = daysBetween(yyyy!, mm!, dd!, yyyy!, 10, fallDay) * DAY_MIN;
  const fallBoundary = fallOffset + FALL_BACK_BOUNDARY_MIN;
  if (fallBoundary >= startMin && fallBoundary < endMin) {
    return 60;
  }

  return 0;
}
