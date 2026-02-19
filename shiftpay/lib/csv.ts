/**
 * CSV import — parses CSV rows into CsvRowResult[].
 * Every row is returned: either parsed (ok + shift) or needs correction (raw + reason).
 * Expected format: header row with date, start_time, end_time, shift_type.
 * Date: DD.MM.YYYY, time: HH:MM, shift_type: tidlig | mellom | kveld | natt.
 */

import * as FileSystem from "expo-file-system";
import type { Shift, ShiftType } from "./calculations";

export type CsvRowResult =
  | { ok: true; shift: Shift }
  | {
      ok: false;
      raw: string[];
      reason: string;
      /** Pre-filled from raw for UI (date, start, end, type columns). */
      date: string;
      start_time: string;
      end_time: string;
      shift_type: string;
    };

export interface ParseResult {
  rows: CsvRowResult[];
  errors: string[];
}

const SHIFT_TYPES: ShiftType[] = ["tidlig", "mellom", "kveld", "natt"];

export function normalizeShiftType(s: string): ShiftType {
  const lower = s.trim().toLowerCase();
  const match = SHIFT_TYPES.find((t) => t === lower || t.startsWith(lower.slice(0, 2)));
  return match ?? "tidlig";
}

/** DD.MM.YYYY — format and realistic bounds (day 1–31, month 1–12, year 2000–2100). */
export function isValidDate(s: string): boolean {
  if (!/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s.trim())) return false;
  const [day, month, year] = s.trim().split(".").map(Number);
  return (
    day >= 1 &&
    day <= 31 &&
    month >= 1 &&
    month <= 12 &&
    year >= 2000 &&
    year <= 2100
  );
}

/** HH:MM or H:MM — format and realistic bounds (hour 0–23, minute 0–59). */
export function isValidTime(s: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(s.trim())) return false;
  const [hour, min] = s.trim().split(":").map(Number);
  return hour >= 0 && hour <= 23 && min >= 0 && min <= 59;
}


/** User-friendly reason for a failed row. */
function rowReason(
  missing: { date?: boolean; start?: boolean; end?: boolean },
  invalid: { date?: string; start?: string; end?: string }
): string {
  if (missing.date || missing.start || missing.end) {
    const parts: string[] = [];
    if (missing.date) parts.push("manglende dato");
    if (missing.start) parts.push("manglende starttid");
    if (missing.end) parts.push("manglende sluttid");
    return parts.join(", ") + ".";
  }
  if (invalid.date) return `Ugyldig dato (bruk DD.MM.YYYY).`;
  if (invalid.start) return `Ugyldig starttid (bruk HH:MM).`;
  if (invalid.end) return `Ugyldig sluttid (bruk HH:MM).`;
  return "Kunne ikke tolke raden.";
}

/**
 * Parse CSV file at uri. First row is treated as header.
 * Columns (case-insensitive): date, start_time, end_time, shift_type.
 */
export async function parseCSVFile(uri: string): Promise<ParseResult> {
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return parseCSVContent(content);
}

/**
 * Parse CSV string (e.g. from readAsStringAsync). First line = header.
 * Every data row is returned in rows[] — either ok+shift or raw+reason. No row is dropped.
 */
export function parseCSVContent(content: string): ParseResult {
  const errors: string[] = [];
  const rows: CsvRowResult[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV må ha en headerrad og minst én datarad."] };
  }

  const header = lines[0].toLowerCase();
  const cols = header.split(/[,;\t]/).map((c) => c.trim().toLowerCase());
  const dateIdx = cols.findIndex((c) => c === "date" || c === "dato");
  const startIdx = cols.findIndex((c) => c === "start_time" || c === "start" || c === "fra");
  const endIdx = cols.findIndex((c) => c === "end_time" || c === "end" || c === "til");
  const typeIdx = cols.findIndex(
    (c) => c === "shift_type" || c === "type" || c === "skift" || c === "shift"
  );

  if (dateIdx === -1 || startIdx === -1 || endIdx === -1) {
    return {
      rows: [],
      errors: ["CSV må ha kolonner: date, start_time, end_time (og valgfritt shift_type)."],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const cells = row.split(/[,;\t]/).map((c) => c.trim());
    const date = (cells[dateIdx] ?? "").trim();
    const start_time = (cells[startIdx] ?? "").trim();
    const end_time = (cells[endIdx] ?? "").trim();
    const shiftTypeRaw = typeIdx >= 0 ? (cells[typeIdx] ?? "").trim() : "tidlig";

    const missing = {
      date: !date,
      start: !start_time,
      end: !end_time,
    };
    const invalid = {
      date: date && !isValidDate(date) ? date : undefined,
      start: start_time && !isValidTime(start_time) ? start_time : undefined,
      end: end_time && !isValidTime(end_time) ? end_time : undefined,
    };

    const prefill = {
      date: date || "",
      start_time: start_time || "",
      end_time: end_time || "",
      shift_type: shiftTypeRaw || "tidlig",
    };
    if (missing.date || missing.start || missing.end) {
      rows.push({
        ok: false,
        raw: cells,
        reason: rowReason(missing, {}),
        ...prefill,
      });
      continue;
    }
    if (invalid.date) {
      rows.push({ ok: false, raw: cells, reason: rowReason({}, invalid), ...prefill });
      continue;
    }
    if (invalid.start) {
      rows.push({ ok: false, raw: cells, reason: rowReason({}, invalid), ...prefill });
      continue;
    }
    if (invalid.end) {
      rows.push({ ok: false, raw: cells, reason: rowReason({}, invalid), ...prefill });
      continue;
    }

    rows.push({
      ok: true,
      shift: {
        date,
        start_time,
        end_time,
        shift_type: normalizeShiftType(shiftTypeRaw),
      },
    });
  }

  return { rows, errors };
}
