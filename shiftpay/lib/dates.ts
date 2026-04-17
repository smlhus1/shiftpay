/**
 * Safe parsing of DD.MM.YYYY and HH:MM. Returns null for invalid input.
 *
 * Naming convention used in this module:
 *   - "display" = `DD.MM.YYYY` — what users see and the app's public API
 *   - "iso"     = `YYYY-MM-DD` — what SQLite stores (since Pass 2 v7
 *                 migration). Sortable lexically; SQL `WHERE date >= ?`
 *                 finally works.
 *
 * Conversion happens at the DB boundary in lib/db.ts (write: display→iso,
 * read: iso→display). Callers outside lib/db.ts continue to see DD.MM.YYYY
 * everywhere.
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

/**
 * DD.MM.YYYY → YYYY-MM-DD. Used at the DB write boundary (lib/db.ts).
 * Returns the input unchanged if it is already in ISO form, so the
 * boundary is idempotent (defensive, in case ISO leaks in).
 */
export function displayToIso(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(".");
  if (parts.length !== 3) return trimmed; // garbage in, garbage out
  const [d, m, y] = parts;
  return `${y}-${(m ?? "").padStart(2, "0")}-${(d ?? "").padStart(2, "0")}`;
}

/**
 * YYYY-MM-DD → DD.MM.YYYY. Used at the DB read boundary so callers
 * outside lib/db.ts still see the display format. Idempotent.
 */
export function isoToDisplay(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split("-");
  if (parts.length !== 3) return trimmed;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
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
