/**
 * Tests for lib/backup.ts — JSON snapshot export/import.
 *
 * Same per-test isolation pattern as db.test.ts: jest.resetModules in
 * the describe-level beforeEach, and the global jest-setup.ts beforeEach
 * closes the SQLite handle and unlinks the per-worker file.
 */

import type * as BackupModule from "./backup";
import type * as DbModule from "./db";

describe("backup (snapshot export/import)", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("buildSnapshot captures tariff rates, schedules, and shifts", async () => {
    const { initDb, setTariffRates, insertScheduleWithShifts } = require("./db") as typeof DbModule;
    const { buildSnapshot, SNAPSHOT_VERSION } = require("./backup") as typeof BackupModule;

    await initDb();
    await setTariffRates({
      base_rate: 250,
      evening_supplement: 22,
      night_supplement: 45,
      weekend_supplement: 35,
      holiday_supplement: 100,
      overtime_supplement: 50,
      regular_period_start_day: 1,
      extra_period_start_day: 15,
      stacking_policy: "additive",
    });
    await insertScheduleWithShifts("01.03.2026", "31.03.2026", "manual", [
      { date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
      { date: "03.03.2026", start_time: "16:00", end_time: "22:00", shift_type: "kveld" },
    ]);

    const snap = await buildSnapshot();
    expect(snap.version).toBe(SNAPSHOT_VERSION);
    expect(snap.tariff_rates.base_rate).toBe(250);
    expect(snap.schedules).toHaveLength(1);
    expect(snap.shifts).toHaveLength(2);
    // Snapshot dates are the public DD.MM.YYYY shape, not raw ISO storage.
    expect(snap.shifts[0]?.date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("parseSnapshot accepts a freshly built snapshot", async () => {
    const { initDb, setTariffRates, insertScheduleWithShifts } = require("./db") as typeof DbModule;
    const { exportSnapshotJson, parseSnapshot } = require("./backup") as typeof BackupModule;

    await initDb();
    await setTariffRates({
      base_rate: 250,
      evening_supplement: 0,
      night_supplement: 0,
      weekend_supplement: 0,
      holiday_supplement: 0,
      overtime_supplement: 0,
      regular_period_start_day: 1,
      extra_period_start_day: 15,
      stacking_policy: "additive",
    });
    await insertScheduleWithShifts("01.03.2026", "31.03.2026", "manual", [
      { date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ]);

    const json = await exportSnapshotJson();
    const reparsed = parseSnapshot(json);
    expect(reparsed.shifts).toHaveLength(1);
    expect(reparsed.tariff_rates.base_rate).toBe(250);
  });

  it("parseSnapshot rejects malformed JSON with a descriptive error", async () => {
    const { parseSnapshot } = require("./backup") as typeof BackupModule;
    expect(() => parseSnapshot("not valid json {{")).toThrow(/Invalid JSON/);
  });

  it("parseSnapshot rejects valid JSON that misses required fields", async () => {
    const { parseSnapshot } = require("./backup") as typeof BackupModule;
    // Missing tariff_rates is a Valibot validation failure (not a JSON parse failure)
    expect(() => parseSnapshot('{"version":1,"exported_at":"x"}')).toThrow();
  });

  it("applyImport(merge) inserts new schedules but skips IDs that already exist", async () => {
    const { initDb, insertScheduleWithShifts, getAllSchedules } =
      require("./db") as typeof DbModule;
    const { buildSnapshot, applyImport } = require("./backup") as typeof BackupModule;

    await initDb();
    // Seed two schedules
    await insertScheduleWithShifts("01.02.2026", "28.02.2026", "manual", [
      { date: "10.02.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ]);
    await insertScheduleWithShifts("01.03.2026", "31.03.2026", "manual", [
      { date: "10.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ]);
    const snap = await buildSnapshot();

    // Re-apply on the SAME DB — merge should skip both since IDs are present
    const r = await applyImport(snap, "merge");
    expect(r.schedulesInserted).toBe(0);
    expect(r.shiftsInserted).toBe(0);

    // Schedules count is unchanged
    const after = await getAllSchedules();
    expect(after).toHaveLength(2);
  });

  it("applyImport(merge) into an empty DB inserts every schedule", async () => {
    // Build a snapshot from a DB with one schedule + 2 shifts, then wipe
    // and import — should restore everything.
    const dbModulePath = require.resolve("./db");
    const backupModulePath = require.resolve("./backup");

    let snap: BackupModule.Snapshot;
    {
      const { initDb, setTariffRates, insertScheduleWithShifts, _closeDbForTests } =
        require("./db") as typeof DbModule;
      const { buildSnapshot } = require("./backup") as typeof BackupModule;
      await initDb();
      await setTariffRates({
        base_rate: 300,
        evening_supplement: 0,
        night_supplement: 0,
        weekend_supplement: 0,
        holiday_supplement: 0,
        overtime_supplement: 0,
        regular_period_start_day: 1,
        extra_period_start_day: 15,
        stacking_policy: "additive",
      });
      await insertScheduleWithShifts("01.04.2026", "30.04.2026", "manual", [
        { date: "10.04.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
        { date: "11.04.2026", start_time: "08:00", end_time: "16:00", shift_type: "kveld" },
      ]);
      snap = await buildSnapshot();
      await _closeDbForTests();
    }

    // Wipe + re-import (jest.resetModules + cached unlink leaves a fresh file)
    jest.resetModules();
    delete require.cache[dbModulePath];
    delete require.cache[backupModulePath];
    // Force-rerun the global beforeEach behaviour by closing+unlinking again
    require("fs").unlinkSync(process.env.EXPO_SQLITE_MOCK!);

    {
      const { initDb, getTariffRates, getAllSchedules } = require("./db") as typeof DbModule;
      const { applyImport } = require("./backup") as typeof BackupModule;
      await initDb();
      const r = await applyImport(snap, "merge");
      expect(r.schedulesInserted).toBe(1);
      expect(r.shiftsInserted).toBe(2);

      const restoredSchedules = await getAllSchedules();
      expect(restoredSchedules).toHaveLength(1);
      const restoredRates = await getTariffRates();
      expect(restoredRates.base_rate).toBe(300);
    }
  });
});
