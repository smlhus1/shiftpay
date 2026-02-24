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

const CURRENCY_LOCALE: Record<string, string> = {
  NOK: "nb-NO",
  GBP: "en-GB",
  SEK: "sv-SE",
  DKK: "da-DK",
  EUR: "de-DE",
};

export function formatCurrency(amount: number, currency: string): string {
  const numberLocale = CURRENCY_LOCALE[currency] ?? "nb-NO";
  try {
    return new Intl.NumberFormat(numberLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export function statusLabel(s: ShiftStatus, t: (key: string) => string): string {
  return t(`format.status.${s}`);
}

export function statusColor(s: ShiftStatus): string {
  if (s === "planned") return "bg-stone-100 dark:bg-stone-400/15 text-stone-600 dark:text-stone-400";
  if (s === "completed") return "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "missed") return "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400";
}

export function sourceLabel(source: string, t: (key: string) => string): string {
  const key = `format.source.${source}`;
  const validSources = ["ocr", "gallery", "csv", "manual"];
  return t(validSources.includes(source) ? key : "format.source.manual");
}

export function shiftTypeLabel(type: string, t: (key: string) => string): string {
  const key = `shiftTypes.${type}`;
  return t(key);
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
