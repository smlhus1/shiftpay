/**
 * Shared display helpers — status labels, colors, source labels, and row conversion.
 */

export const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;
export type MonthKey = typeof MONTH_KEYS[number];

/** "YYYY-MM" key from year + month number (1-based). */
export function toYearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

import type { ShiftStatus, ShiftRow } from "./db";
import type { Shift } from "./calculations";

export function statusLabel(s: ShiftStatus, t: (key: string) => string): string {
  return t(`format.status.${s}`);
}

export function statusColor(s: ShiftStatus): string {
  if (s === "planned") return "bg-stone-100 text-slate-600";
  if (s === "completed") return "bg-emerald-100 text-emerald-800";
  if (s === "missed") return "bg-red-100 text-red-700";
  return "bg-violet-100 text-violet-700";
}

export function sourceLabel(source: string, t: (key: string) => string): string {
  const key = `format.source.${source}`;
  const validSources = ["ocr", "gallery", "csv", "manual"];
  return t(validSources.includes(source) ? key : "format.source.manual");
}

export function shiftRowToShift(s: ShiftRow): Shift {
  const start = s.actual_start ?? s.start_time;
  const end = s.actual_end ?? s.end_time;
  return {
    date: s.date,
    start_time: start,
    end_time: end,
    shift_type: s.shift_type as Shift["shift_type"],
  };
}
