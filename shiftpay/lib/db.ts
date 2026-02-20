import * as SQLite from "expo-sqlite";
import { shiftDurationHours } from "./calculations";
import { dateToComparable } from "./dates";

const DB_NAME = "shiftpay.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tariff_rates (
  id INTEGER PRIMARY KEY,
  base_rate REAL NOT NULL DEFAULT 0,
  evening_supplement REAL NOT NULL DEFAULT 0,
  night_supplement REAL NOT NULL DEFAULT 0,
  weekend_supplement REAL NOT NULL DEFAULT 0,
  holiday_supplement REAL NOT NULL DEFAULT 0,
  overtime_supplement REAL NOT NULL DEFAULT 40,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'tidlig',
  status TEXT NOT NULL DEFAULT 'planned',
  actual_start TEXT,
  actual_end TEXT,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shifts_schedule_id ON shifts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
`;

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function isDbGoneError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("prepareAsync") ||
    msg.includes("execAsync") ||
    msg.includes("NullPointerException") ||
    msg.includes("has been rejected")
  );
}

async function migrateAddOvertimeSupplement(database: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await database.getAllAsync<{ name: string }>("PRAGMA table_info(tariff_rates)");
  const hasCol = cols.some((c) => c.name === "overtime_supplement");
  if (!hasCol) {
    await database.execAsync(
      "ALTER TABLE tariff_rates ADD COLUMN overtime_supplement REAL NOT NULL DEFAULT 40"
    );
    if (__DEV__) {
      console.log("[ShiftPay] Migrated: added overtime_supplement to tariff_rates");
    }
  }
}

async function migrateTimesheetsToSchedules(database: SQLite.SQLiteDatabase): Promise<void> {
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='timesheets'"
  );
  if (tables.length === 0) return;
  const rows = await database.getAllAsync<{ id: string; period_start: string; period_end: string; shifts: string; source: string; created_at: string }>(
    "SELECT id, period_start, period_end, shifts, source, created_at FROM timesheets"
  );
  for (const row of rows) {
    await database.runAsync(
      "INSERT OR IGNORE INTO schedules (id, period_start, period_end, source, created_at) VALUES (?, ?, ?, ?, ?)",
      [row.id, row.period_start, row.period_end, row.source, row.created_at]
    );
    let shifts: Array<{ date: string; start_time: string; end_time: string; shift_type: string }>;
    try {
      shifts = JSON.parse(row.shifts) as Array<{ date: string; start_time: string; end_time: string; shift_type: string }>;
    } catch {
      continue;
    }
    for (const s of shifts) {
      const shiftId = generateId();
      await database.runAsync(
        "INSERT INTO shifts (id, schedule_id, date, start_time, end_time, shift_type, status, overtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', 0, ?)",
        [shiftId, row.id, s.date, s.start_time, s.end_time, s.shift_type ?? "tidlig", row.created_at]
      );
    }
  }
  await database.execAsync("DROP TABLE IF EXISTS timesheets");
  if (__DEV__) {
    console.log("[ShiftPay] Migrated timesheets to schedules + shifts");
  }
}

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;
  const openAndPrepare = async (): Promise<SQLite.SQLiteDatabase> => {
    const database = await SQLite.openDatabaseAsync(DB_NAME);
    await database.execAsync(SCHEMA);
    await migrateAddOvertimeSupplement(database);
    await migrateTimesheetsToSchedules(database);
    return database;
  };
  dbInitPromise = openAndPrepare()
    .then((database) => {
      db = database;
      if (__DEV__) {
        console.log("[ShiftPay] SQLite initialized, tables ready");
      }
      return database;
    })
    .catch((e) => {
      dbInitPromise = null;
      throw e;
    });
  try {
    return await dbInitPromise;
  } catch (e) {
    if (isDbGoneError(e)) {
      db = null;
      dbInitPromise = null;
      return openAndPrepare().then((database) => {
        db = database;
        dbInitPromise = null;
        if (__DEV__) {
          console.log("[ShiftPay] SQLite initialized, tables ready");
        }
        return database;
      });
    }
    throw e;
  }
}

/** Run a DB operation; if native connection is stale (NullPointerException), re-open and retry once. */
async function withDb<T>(
  fn: (database: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  let database = await initDb();
  try {
    return await fn(database);
  } catch (e) {
    if (!isDbGoneError(e)) throw e;
    db = null;
    dbInitPromise = null;
    database = await initDb();
    return await fn(database);
  }
}

export function getDb(): SQLite.SQLiteDatabase | null {
  return db;
}

export interface TariffRatesRow {
  id: number;
  base_rate: number;
  evening_supplement: number;
  night_supplement: number;
  weekend_supplement: number;
  holiday_supplement: number;
  overtime_supplement: number;
  updated_at: string;
}

export interface ScheduleRow {
  id: string;
  period_start: string;
  period_end: string;
  source: string;
  created_at: string;
}

export type ShiftStatus = "planned" | "completed" | "missed" | "overtime";

export interface ShiftRow {
  id: string;
  schedule_id: string;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: ShiftStatus;
  actual_start: string | null;
  actual_end: string | null;
  overtime_minutes: number;
  confirmed_at: string | null;
  created_at: string;
}

/** Legacy: kept for migration only. Prefer ScheduleRow + getShiftsBySchedule. */
export interface TimesheetRow {
  id: string;
  period_start: string;
  period_end: string;
  shifts: string;
  expected_pay: number;
  source: string;
  created_at: string;
}

const TARIFF_ID = 1;

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type TariffRatesInput = Omit<TariffRatesRow, "id" | "updated_at">;

export async function getTariffRates(): Promise<TariffRatesRow> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<TariffRatesRow>(
      "SELECT * FROM tariff_rates WHERE id = ?",
      [TARIFF_ID]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    const now = new Date().toISOString();
    const defaultRates: TariffRatesRow = {
      id: TARIFF_ID,
      base_rate: 0,
      evening_supplement: 0,
      night_supplement: 0,
      weekend_supplement: 0,
      holiday_supplement: 0,
      overtime_supplement: 40,
      updated_at: now,
    };
    await database.runAsync(
      "INSERT INTO tariff_rates (id, base_rate, evening_supplement, night_supplement, weekend_supplement, holiday_supplement, overtime_supplement, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        defaultRates.id,
        defaultRates.base_rate,
        defaultRates.evening_supplement,
        defaultRates.night_supplement,
        defaultRates.weekend_supplement,
        defaultRates.holiday_supplement,
        defaultRates.overtime_supplement,
        defaultRates.updated_at,
      ]
    );
    return defaultRates;
  });
}

export async function setTariffRates(rates: TariffRatesInput): Promise<void> {
  await withDb(async (database) => {
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO tariff_rates (id, base_rate, evening_supplement, night_supplement, weekend_supplement, holiday_supplement, overtime_supplement, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         base_rate = excluded.base_rate,
         evening_supplement = excluded.evening_supplement,
         night_supplement = excluded.night_supplement,
         weekend_supplement = excluded.weekend_supplement,
         holiday_supplement = excluded.holiday_supplement,
         overtime_supplement = excluded.overtime_supplement,
         updated_at = excluded.updated_at`,
      [
        TARIFF_ID,
        rates.base_rate,
        rates.evening_supplement,
        rates.night_supplement,
        rates.weekend_supplement,
        rates.holiday_supplement,
        rates.overtime_supplement,
        now,
      ]
    );
  });
}

export async function insertSchedule(
  periodStart: string,
  periodEnd: string,
  source: string
): Promise<string> {
  const id = generateId();
  const createdAt = new Date().toISOString();
  await withDb(async (database) => {
    await database.runAsync(
      "INSERT INTO schedules (id, period_start, period_end, source, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, periodStart, periodEnd, source, createdAt]
    );
  });
  return id;
}

export interface ShiftInsert {
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

export async function insertShift(scheduleId: string, shift: ShiftInsert): Promise<string> {
  const id = generateId();
  const createdAt = new Date().toISOString();
  await withDb(async (database) => {
    await database.runAsync(
      "INSERT INTO shifts (id, schedule_id, date, start_time, end_time, shift_type, status, overtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', 0, ?)",
      [id, scheduleId, shift.date, shift.start_time, shift.end_time, shift.shift_type, createdAt]
    );
  });
  return id;
}

/** Insert schedule and all shifts in one transaction. Returns schedule id and inserted shifts (e.g. for notifications). */
export async function insertScheduleWithShifts(
  periodStart: string,
  periodEnd: string,
  source: string,
  shifts: ShiftInsert[]
): Promise<{ scheduleId: string; shifts: ShiftRow[] }> {
  return withDb(async (database) => {
    const scheduleId = generateId();
    const createdAt = new Date().toISOString();
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        "INSERT INTO schedules (id, period_start, period_end, source, created_at) VALUES (?, ?, ?, ?, ?)",
        [scheduleId, periodStart, periodEnd, source, createdAt]
      );
      for (const s of shifts) {
        const id = generateId();
        await database.runAsync(
          "INSERT INTO shifts (id, schedule_id, date, start_time, end_time, shift_type, status, overtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', 0, ?)",
          [id, scheduleId, s.date, s.start_time, s.end_time, s.shift_type, createdAt]
        );
      }
    });
    const rows = await database.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE schedule_id = ? ORDER BY date ASC, start_time ASC",
      [scheduleId]
    );
    if (__DEV__) {
      console.log("[ShiftPay] insertScheduleWithShifts: scheduleId=", scheduleId, "shifts=", rows.length);
    }
    return { scheduleId, shifts: rows };
  });
}

export async function getShiftsBySchedule(scheduleId: string): Promise<ShiftRow[]> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE schedule_id = ? ORDER BY date ASC, start_time ASC",
      [scheduleId]
    );
    return rows;
  });
}

/** Neste N planlagte vakter (status = planned, dato/tid >= nå). */
export async function getUpcomingShifts(limit = 10): Promise<ShiftRow[]> {
  return withDb(async (database) => {
    const now = new Date();
    const today = formatDateForCompare(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const rows = await database.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE status = 'planned' ORDER BY date ASC, start_time ASC LIMIT ?",
      [limit * 2]
    );
    const filtered = rows.filter((r) => {
      const d = dateToComparable(r.date);
      const [h, m] = r.start_time.split(":").map(Number);
      const shiftMinutes = (h ?? 0) * 60 + (m ?? 0);
      return d > today || (d === today && shiftMinutes >= nowMinutes);
    });
    return filtered.slice(0, limit);
  });
}

function formatDateForCompare(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Vakter der end_time har passert og status fortsatt er planned. Sortert eldst→nyest. */
export async function getShiftsDueForConfirmation(): Promise<ShiftRow[]> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE status = 'planned'"
    );
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const filtered = rows.filter((r) => {
      const c = dateToComparable(r.date);
      const today = formatDateForCompare(now);
      const [eh, em] = r.end_time.split(":").map(Number);
      const endMinutes = (eh ?? 0) * 60 + (em ?? 0);
      return c < today || (c === today && endMinutes + 15 <= nowMinutes);
    });
    return filtered.sort((a, b) => {
      const ca = dateToComparable(a.date);
      const cb = dateToComparable(b.date);
      if (ca !== cb) return ca < cb ? -1 : 1;
      return a.end_time < b.end_time ? -1 : a.end_time > b.end_time ? 1 : 0;
    });
  });
}

export async function confirmShift(
  shiftId: string,
  status: ShiftStatus,
  overtimeMinutes?: number,
  actualStart?: string,
  actualEnd?: string
): Promise<void> {
  const confirmedAt = new Date().toISOString();
  await withDb(async (database) => {
    await database.runAsync(
      "UPDATE shifts SET status = ?, overtime_minutes = ?, actual_start = ?, actual_end = ?, confirmed_at = ? WHERE id = ?",
      [
        status,
        overtimeMinutes ?? 0,
        actualStart ?? null,
        actualEnd ?? null,
        confirmedAt,
        shiftId,
      ]
    );
  });
}

export interface MonthSummary {
  year: number;
  month: number;
  plannedShifts: number;
  completedShifts: number;
  missedShifts: number;
  overtimeShifts: number;
  plannedHours: number;
  actualHours: number;
  overtimeHours: number;
  expectedPay: number;
  shifts: ShiftRow[];
}

export async function getDistinctMonthsWithShifts(): Promise<Array<{ year: number; month: number }>> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<{ date: string }>(
      "SELECT DISTINCT date FROM shifts"
    );
    const seen = new Set<string>();
    for (const r of rows) {
      const parts = r.date.split(".");
      const m = parts[1];
      const y = parts[2];
      if (m && y) seen.add(`${y}-${m.padStart(2, "0")}`);
    }
    return Array.from(seen)
      .map((k) => {
        const [y, m] = k.split("-").map(Number);
        return { year: y ?? 0, month: m ?? 0 };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  });
}

export async function getMonthSummary(year: number, month: number): Promise<MonthSummary> {
  const monthStr = String(month).padStart(2, "0");
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts ORDER BY date ASC, start_time ASC"
    );
    const shifts = rows.filter((r) => {
      const parts = r.date.split(".");
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      return y === year && m === month;
    });
    let plannedHours = 0;
    let actualHours = 0;
    let overtimeHours = 0;
    for (const s of shifts) {
      const planned = shiftDurationHours(s.start_time, s.end_time);
      plannedHours += planned;
      if (s.status === "completed" || s.status === "overtime") {
        actualHours += s.actual_start && s.actual_end ? shiftDurationHours(s.actual_start, s.actual_end) : planned;
        overtimeHours += (s.overtime_minutes ?? 0) / 60;
      }
    }
    // Do not add overtimeHours to actualHours — actual duration already includes overtime when actual_end is set
    const completedShifts = shifts.filter((s) => s.status === "completed").length;
    const missedShifts = shifts.filter((s) => s.status === "missed").length;
    const overtimeShifts = shifts.filter((s) => s.status === "overtime").length;
    return {
      year,
      month,
      plannedShifts: shifts.length,
      completedShifts,
      missedShifts,
      overtimeShifts,
      plannedHours,
      actualHours,
      overtimeHours,
      expectedPay: 0,
      shifts,
    };
  });
}

export async function getAllSchedules(): Promise<ScheduleRow[]> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ScheduleRow>(
      "SELECT * FROM schedules ORDER BY created_at DESC"
    );
    return rows;
  });
}

export async function getScheduleById(id: string): Promise<ScheduleRow | null> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ScheduleRow>("SELECT * FROM schedules WHERE id = ?", [id]);
    return rows.length > 0 ? rows[0] : null;
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await withDb(async (database) => {
    await database.runAsync("DELETE FROM shifts WHERE schedule_id = ?", [id]);
    await database.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
  });
}

export async function getShiftById(id: string): Promise<ShiftRow | null> {
  return withDb(async (database) => {
    const rows = await database.getAllAsync<ShiftRow>("SELECT * FROM shifts WHERE id = ?", [id]);
    return rows.length > 0 ? rows[0] : null;
  });
}

/** All shifts in date range (inclusive). date format DD.MM.YYYY. */
export async function getShiftsInDateRange(fromDate: string, toDate: string): Promise<ShiftRow[]> {
  const rows = await withDb((database) =>
    database.getAllAsync<ShiftRow>("SELECT * FROM shifts ORDER BY date ASC, start_time ASC")
  );
  return rows.filter((r) => {
    const c = dateToComparable(r.date);
    const from = dateToComparable(fromDate);
    const to = dateToComparable(toDate);
    return c >= from && c <= to;
  });
}