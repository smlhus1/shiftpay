/**
 * Safe parsing of DD.MM.YYYY and HH:MM. Returns null for invalid input.
 */

/** DD.MM.YYYY → Date or null if invalid. */
export function parseDateSafe(dateStr: string): Date | null {
  const parts = dateStr.trim().split(".");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100)) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** DD.MM.YYYY → "YYYY-MM-DD" for string comparison. */
export function dateToComparable(dateStr: string): string {
  const [d, m, y] = dateStr.split(".").map(Number);
  return `${y ?? 0}-${String(m ?? 1).padStart(2, "0")}-${String(d ?? 1).padStart(2, "0")}`;
}

/** DD.MM.YYYY + HH:MM → Date with time, or null. */
export function parseDateTimeSafe(dateStr: string, timeStr: string): Date | null {
  const date = parseDateSafe(dateStr);
  if (!date) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const [h, min] = parts.map(Number);
  if (h == null || min == null || h < 0 || h > 23 || min < 0 || min > 59) return null;
  date.setHours(h, min, 0, 0);
  return date;
}
