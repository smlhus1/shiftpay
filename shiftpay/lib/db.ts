import * as SQLite from "expo-sqlite";

const DB_NAME = "shiftpay.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tariff_rates (
  id INTEGER PRIMARY KEY,
  base_rate REAL NOT NULL DEFAULT 0,
  evening_supplement REAL NOT NULL DEFAULT 0,
  night_supplement REAL NOT NULL DEFAULT 0,
  weekend_supplement REAL NOT NULL DEFAULT 0,
  holiday_supplement REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  shifts TEXT NOT NULL,
  expected_pay REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);
`;

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(SCHEMA);
  if (__DEV__) {
    console.log("[ShiftPay] SQLite initialized, tables ready");
  }
  return db;
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
  updated_at: string;
}

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
  const database = await initDb();
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
    updated_at: now,
  };
  await database.runAsync(
    "INSERT INTO tariff_rates (id, base_rate, evening_supplement, night_supplement, weekend_supplement, holiday_supplement, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      defaultRates.id,
      defaultRates.base_rate,
      defaultRates.evening_supplement,
      defaultRates.night_supplement,
      defaultRates.weekend_supplement,
      defaultRates.holiday_supplement,
      defaultRates.updated_at,
    ]
  );
  return defaultRates;
}

export async function setTariffRates(rates: TariffRatesInput): Promise<void> {
  const database = await initDb();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO tariff_rates (id, base_rate, evening_supplement, night_supplement, weekend_supplement, holiday_supplement, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       base_rate = excluded.base_rate,
       evening_supplement = excluded.evening_supplement,
       night_supplement = excluded.night_supplement,
       weekend_supplement = excluded.weekend_supplement,
       holiday_supplement = excluded.holiday_supplement,
       updated_at = excluded.updated_at`,
    [
      TARIFF_ID,
      rates.base_rate,
      rates.evening_supplement,
      rates.night_supplement,
      rates.weekend_supplement,
      rates.holiday_supplement,
      now,
    ]
  );
}

export async function insertTimesheet(
  periodStart: string,
  periodEnd: string,
  shifts: string,
  expectedPay: number,
  source: string
): Promise<string> {
  const database = await initDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await database.runAsync(
    "INSERT INTO timesheets (id, period_start, period_end, shifts, expected_pay, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, periodStart, periodEnd, shifts, expectedPay, source, createdAt]
  );
  return id;
}
