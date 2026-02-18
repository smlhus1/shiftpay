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
