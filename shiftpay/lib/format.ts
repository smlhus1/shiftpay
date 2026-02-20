/**
 * Shared display helpers — status labels, colors, source labels, and row conversion.
 */

import type { ShiftStatus, ShiftRow } from "./db";
import type { Shift } from "./calculations";

export function statusLabel(s: ShiftStatus, t: (key: string) => string): string {
  return t(`format.status.${s}`);
}

export function statusColor(s: ShiftStatus): string {
  if (s === "planned") return "bg-amber-100 text-amber-800";
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "missed") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
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
