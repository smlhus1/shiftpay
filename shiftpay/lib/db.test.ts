/**
 * Baseline tests for lib/db.ts — proves the expo-sqlite-mock harness is wired
 * end-to-end and freezes a few happy-path behaviours.
 *
 * Per-test isolation: reset module cache so the `db` singleton re-initialises
 * against a fresh mock connection for every test. Uses require() (not dynamic
 * import) because Jest doesn't support ESM dynamic import without
 * --experimental-vm-modules.
 */

import type * as DbModule from "./db";

describe("db (via expo-sqlite-mock)", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("initialises and returns a non-null database", async () => {
    const { initDb, getDb } = require("./db");
    const db = await initDb();
    expect(db).not.toBeNull();
    expect(getDb()).not.toBeNull();
  });

  it("runs all migrations and bumps PRAGMA user_version to the latest", async () => {
    const { initDb } = require("./db") as typeof DbModule;
    const db = await initDb();
    const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    // Migrations 1-5 have landed. Keep this assertion loose so appending a
    // new migration does not require updating the test — just assert forward
    // progress: version > 0.
    expect(row?.user_version).toBeGreaterThanOrEqual(5);
  });

  it("migration runner is idempotent — second initDb is a no-op", async () => {
    const { initDb } = require("./db") as typeof DbModule;
    const db = await initDb();
    const first = (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
      ?.user_version;
    // No reset — same singleton — calling initDb again should return immediately.
    await initDb();
    const second = (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
      ?.user_version;
    expect(second).toBe(first);
  });

  it("seeds tariff_rates with id=1 and zero base rate on first init", async () => {
    const { initDb, getTariffRates } = require("./db");
    await initDb();
    const rates = await getTariffRates();
    expect(rates.id).toBe(1);
    expect(rates.base_rate).toBe(0);
  });

  const fullRates = {
    base_rate: 275,
    evening_supplement: 22,
    night_supplement: 45,
    weekend_supplement: 35,
    holiday_supplement: 100,
    overtime_supplement: 50,
    regular_period_start_day: 1,
    extra_period_start_day: 15,
  };

  it("persists tariff rate updates via setTariffRates", async () => {
    const { initDb, setTariffRates, getTariffRates } = require("./db");
    await initDb();
    await setTariffRates(fullRates);
    const rates = await getTariffRates();
    expect(rates.base_rate).toBe(275);
    expect(rates.overtime_supplement).toBe(50);
  });

  it("clamps negative rate inputs to zero at the DB boundary", async () => {
    const { initDb, setTariffRates, getTariffRates } = require("./db");
    await initDb();
    await setTariffRates({
      ...fullRates,
      base_rate: -50,
      evening_supplement: -22,
    });
    const rates = await getTariffRates();
    expect(rates.base_rate).toBe(0);
    expect(rates.evening_supplement).toBe(0);
  });

  it("inserts a schedule with its shifts in one call", async () => {
    const { initDb, insertScheduleWithShifts, getShiftsBySchedule } = require("./db");
    await initDb();
    const { scheduleId, shifts } = await insertScheduleWithShifts(
      "01.03.2026",
      "31.03.2026",
      "manual",
      [
        {
          date: "02.03.2026",
          start_time: "08:00",
          end_time: "16:00",
          shift_type: "tidlig",
        },
        {
          date: "03.03.2026",
          start_time: "16:00",
          end_time: "22:00",
          shift_type: "kveld",
        },
      ]
    );
    expect(scheduleId).toBeDefined();
    expect(shifts).toHaveLength(2);

    const fetched = await getShiftsBySchedule(scheduleId);
    expect(fetched).toHaveLength(2);
    expect(fetched[0].status).toBe("planned");
  });

  it("populates updated_at on insert", async () => {
    const { initDb, insertScheduleWithShifts, getShiftsBySchedule } = require("./db");
    await initDb();
    const { scheduleId, shifts } = await insertScheduleWithShifts(
      "01.03.2026",
      "31.03.2026",
      "manual",
      [{ date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" }]
    );
    const fetched = await getShiftsBySchedule(scheduleId);
    expect(fetched[0].updated_at).toBe(shifts[0].updated_at);
    expect(fetched[0].updated_at.length).toBeGreaterThan(0);
    expect(fetched[0].deleted_at).toBeNull();
  });

  it("deleteSchedule tombstones rather than removing rows", async () => {
    const {
      initDb,
      insertScheduleWithShifts,
      deleteSchedule,
      getShiftsBySchedule,
      getScheduleById,
    } = require("./db") as typeof DbModule;
    const db = await initDb();
    const { scheduleId } = await insertScheduleWithShifts("01.03.2026", "31.03.2026", "manual", [
      { date: "02.03.2026", start_time: "08:00", end_time: "16:00", shift_type: "tidlig" },
    ]);

    await deleteSchedule(scheduleId);

    // Live API hides them
    expect(await getScheduleById(scheduleId)).toBeNull();
    expect(await getShiftsBySchedule(scheduleId)).toHaveLength(0);

    // But the rows still exist with deleted_at set — direct read confirms.
    const ghostSchedule = await db.getFirstAsync<{ id: string; deleted_at: string | null }>(
      "SELECT id, deleted_at FROM schedules WHERE id = ?",
      [scheduleId]
    );
    expect(ghostSchedule?.deleted_at).not.toBeNull();
    const ghostShifts = await db.getAllAsync<{ deleted_at: string | null }>(
      "SELECT deleted_at FROM shifts WHERE schedule_id = ?",
      [scheduleId]
    );
    expect(ghostShifts).toHaveLength(1);
    expect(ghostShifts[0]?.deleted_at).not.toBeNull();
  });
});
