/**
 * Database table types for Kysely query builder.
 *
 * Kysely uses these as compile-time only — column-name typos and join
 * mismatches become TS errors at the call site. Runtime is unchanged:
 * we compile Kysely's AST to SQL strings and hand them to expo-sqlite's
 * runAsync/getAllAsync directly. No custom dialect, no extra dependency
 * surface beyond `kysely` itself.
 *
 * Naming:
 *   - Date columns are stored as ISO YYYY-MM-DD (since migration v7) and
 *     typed as plain `string` here. The DB-boundary mappers in lib/db.ts
 *     translate to/from DD.MM.YYYY for the public API.
 *
 * Adding a column:
 *   1. Add an idempotent migration in lib/db.ts (see migrations[])
 *   2. Add the field here so Kysely picks it up
 *   3. Re-run typecheck — broken queries now show up as compile errors
 */

import type { ShiftStatus, PayType } from "./db";

export interface TariffRatesTable {
  id: number;
  base_rate: number;
  evening_supplement: number;
  night_supplement: number;
  weekend_supplement: number;
  holiday_supplement: number;
  overtime_supplement: number;
  regular_period_start_day: number;
  extra_period_start_day: number;
  updated_at: string;
}

export interface SchedulesTable {
  id: string;
  /** ISO YYYY-MM-DD on disk; mappers convert to DD.MM.YYYY for callers. */
  period_start: string;
  /** ISO YYYY-MM-DD on disk; mappers convert to DD.MM.YYYY for callers. */
  period_end: string;
  source: string;
  created_at: string;
  updated_at: string;
  /** ISO timestamp tombstone; NULL = live row. */
  deleted_at: string | null;
}

export interface ShiftsTable {
  id: string;
  schedule_id: string;
  /** ISO YYYY-MM-DD on disk. */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  shift_type: string;
  status: ShiftStatus;
  pay_type: PayType;
  actual_start: string | null;
  actual_end: string | null;
  overtime_minutes: number;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MonthlyPayTable {
  year: number;
  month: number;
  actual_pay: number;
  updated_at: string;
}

/** The full schema Kysely sees. Add new tables here. */
export interface Database {
  tariff_rates: TariffRatesTable;
  schedules: SchedulesTable;
  shifts: ShiftsTable;
  monthly_pay: MonthlyPayTable;
}
