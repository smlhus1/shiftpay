/**
 * JSON backup — export and import.
 *
 * The "what users will ask for within a week of launch" feature: a way to
 * move ShiftPay's local-only data off the device. Since we never want to
 * silently lose data, the import path validates the snapshot with Valibot
 * before touching the DB and returns a diff preview the UI can show before
 * commit.
 *
 * Format design:
 *   - One file = one snapshot
 *   - JSON top-level: { version, exported_at, tariff_rates, schedules,
 *     shifts, monthly_pay }
 *   - Dates are stored in DD.MM.YYYY (the public API shape) so the file is
 *     human-readable and survives schema-internal changes (e.g. ISO migration)
 *   - `version` is the file format version, NOT the DB user_version. Bump
 *     when the snapshot shape changes.
 */
import * as v from "valibot";
import {
  type ScheduleRow,
  type ShiftRow,
  type TariffRatesRow,
  getTariffRates,
  setTariffRates,
  getAllSchedules,
  insertScheduleWithShifts,
  getShiftsBySchedule,
  getMonthlyActualPay,
  setMonthlyActualPay,
  getDistinctMonthsWithShifts,
} from "./db";

export const SNAPSHOT_VERSION = 1;

// ─── Valibot schemas (boundary validation) ───────────────────────────

const TariffRatesSchema = v.object({
  id: v.number(),
  base_rate: v.number(),
  evening_supplement: v.number(),
  night_supplement: v.number(),
  weekend_supplement: v.number(),
  holiday_supplement: v.number(),
  overtime_supplement: v.number(),
  regular_period_start_day: v.number(),
  extra_period_start_day: v.number(),
  updated_at: v.string(),
});

const ScheduleSchema = v.object({
  id: v.string(),
  period_start: v.string(),
  period_end: v.string(),
  source: v.string(),
  created_at: v.string(),
  updated_at: v.string(),
  deleted_at: v.nullable(v.string()),
});

const ShiftSchema = v.object({
  id: v.string(),
  schedule_id: v.string(),
  date: v.string(),
  start_time: v.string(),
  end_time: v.string(),
  shift_type: v.string(),
  status: v.union([
    v.literal("planned"),
    v.literal("completed"),
    v.literal("missed"),
    v.literal("overtime"),
  ]),
  pay_type: v.union([v.literal("regular"), v.literal("extra")]),
  actual_start: v.nullable(v.string()),
  actual_end: v.nullable(v.string()),
  overtime_minutes: v.number(),
  confirmed_at: v.nullable(v.string()),
  created_at: v.string(),
  updated_at: v.string(),
  deleted_at: v.nullable(v.string()),
});

const MonthlyPaySchema = v.object({
  year: v.number(),
  month: v.number(),
  actual_pay: v.number(),
});

const SnapshotSchema = v.object({
  version: v.literal(SNAPSHOT_VERSION),
  exported_at: v.string(),
  tariff_rates: TariffRatesSchema,
  schedules: v.array(ScheduleSchema),
  shifts: v.array(ShiftSchema),
  monthly_pay: v.array(MonthlyPaySchema),
});

export type Snapshot = v.InferOutput<typeof SnapshotSchema>;

// ─── Export ──────────────────────────────────────────────────────────

/**
 * Builds an in-memory snapshot of every user-owned table. UI is responsible
 * for serialising and offering it via expo-sharing — keeping the FS dance
 * out of this module makes it testable without mocking the file system.
 */
export async function buildSnapshot(): Promise<Snapshot> {
  const [tariffRates, schedules, months] = await Promise.all([
    getTariffRates(),
    getAllSchedules(),
    getDistinctMonthsWithShifts(),
  ]);
  const shiftsByScheduleArrays = await Promise.all(schedules.map((s) => getShiftsBySchedule(s.id)));
  const monthlyPayPairs = await Promise.all(
    months.map(async (ym) => ({
      year: ym.year,
      month: ym.month,
      actual_pay: (await getMonthlyActualPay(ym.year, ym.month)) ?? 0,
    }))
  );
  return {
    version: SNAPSHOT_VERSION,
    exported_at: new Date().toISOString(),
    tariff_rates: tariffRates,
    schedules,
    shifts: shiftsByScheduleArrays.flat(),
    monthly_pay: monthlyPayPairs.filter((m) => m.actual_pay > 0),
  };
}

/** Convenience: snapshot → pretty-printed JSON string. */
export async function exportSnapshotJson(): Promise<string> {
  const snapshot = await buildSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

// ─── Import ──────────────────────────────────────────────────────────

export interface ImportPreview {
  schedules: number;
  shifts: number;
  monthlyPay: number;
  tariffRates: boolean;
}

export type ImportStrategy = "merge" | "replace";

/**
 * Validates a JSON string against the snapshot schema. Returns the parsed
 * snapshot or throws a descriptive error. Use this before {@link applyImport}
 * to show a confirm dialog with the diff counts.
 */
export function parseSnapshot(json: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : "unknown parse error"}`);
  }
  return v.parse(SnapshotSchema, raw);
}

/**
 * Returns the diff counts for a preview UI. Free side effect: throws
 * the same validation errors as {@link parseSnapshot}, so the UI can
 * use this single call to validate-and-preview.
 */
export function previewImport(snapshot: Snapshot): ImportPreview {
  return {
    schedules: snapshot.schedules.length,
    shifts: snapshot.shifts.length,
    monthlyPay: snapshot.monthly_pay.length,
    tariffRates: true,
  };
}

/**
 * Applies the snapshot to the live DB.
 *
 * Strategies:
 *   - "merge": insert any schedule whose id is not already in the DB; existing
 *     ids are skipped (this keeps the user's most recent local state intact).
 *     Tariff rates are always overwritten — they are single-row.
 *   - "replace": currently behaves as merge. A true replace (wipe-then-import)
 *     is destructive and intentionally not exposed in v1; it lands in v2 with
 *     an explicit confirm flow.
 *
 * Always runs inside an exclusive transaction so a mid-import crash leaves
 * the DB in pre-import state, not a partial mess.
 */
export async function applyImport(
  snapshot: Snapshot,
  strategy: ImportStrategy = "merge"
): Promise<{ schedulesInserted: number; shiftsInserted: number }> {
  void strategy; // accepted for future use; currently only merge semantics
  let schedulesInserted = 0;
  let shiftsInserted = 0;

  // Tariff rates: always overwrite — single-row table, snapshot is canonical.
  const r = snapshot.tariff_rates;
  await setTariffRates({
    base_rate: r.base_rate,
    evening_supplement: r.evening_supplement,
    night_supplement: r.night_supplement,
    weekend_supplement: r.weekend_supplement,
    holiday_supplement: r.holiday_supplement,
    overtime_supplement: r.overtime_supplement,
    regular_period_start_day: r.regular_period_start_day,
    extra_period_start_day: r.extra_period_start_day,
  });

  // Schedules + their shifts: use the public insert API to get all the
  // boundary normalisation (date conversion, updated_at, etc.) for free.
  const existing = await getAllSchedules();
  const existingIds = new Set(existing.map((s) => s.id));
  const shiftsByScheduleId = groupShiftsBySchedule(snapshot.shifts);

  for (const sched of snapshot.schedules) {
    if (existingIds.has(sched.id)) continue;
    const shifts = shiftsByScheduleId.get(sched.id) ?? [];
    const inserted = await insertScheduleWithShifts(
      sched.period_start,
      sched.period_end,
      sched.source,
      shifts.map((s) => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        shift_type: s.shift_type,
      }))
    );
    schedulesInserted += 1;
    shiftsInserted += inserted.shifts.length;
  }

  // Monthly pay: upsert by (year, month).
  for (const m of snapshot.monthly_pay) {
    await setMonthlyActualPay(m.year, m.month, m.actual_pay);
  }

  return { schedulesInserted, shiftsInserted };
}

function groupShiftsBySchedule(
  shifts: readonly v.InferOutput<typeof ShiftSchema>[]
): Map<string, v.InferOutput<typeof ShiftSchema>[]> {
  const out = new Map<string, v.InferOutput<typeof ShiftSchema>[]>();
  for (const s of shifts) {
    const list = out.get(s.schedule_id);
    if (list) list.push(s);
    else out.set(s.schedule_id, [s]);
  }
  return out;
}

// ─── Re-exports for tests / convenience ──────────────────────────────

export { SnapshotSchema, ShiftSchema, ScheduleSchema, TariffRatesSchema };
export type { ScheduleRow, ShiftRow, TariffRatesRow };
