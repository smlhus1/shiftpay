/**
 * Verifies dstAdjustmentMinutes against Norway's known DST schedule
 * 2020–2030. Spring-forward is the LAST Sunday of March at 02:00 local;
 * fall-back is the LAST Sunday of October at 03:00 local. The dates below
 * are from timeanddate.com and the IANA Europe/Oslo zone.
 */

import { dstAdjustmentMinutes, lastSundayOf } from "./dst";

describe("lastSundayOf", () => {
  // Norway's published spring-forward dates 2020-2030
  const SPRING: readonly [number, number][] = [
    [2020, 29],
    [2021, 28],
    [2022, 27],
    [2023, 26],
    [2024, 31],
    [2025, 30],
    [2026, 29],
    [2027, 28],
    [2028, 26],
    [2029, 25],
    [2030, 31],
  ];
  it.each(SPRING)("last Sunday of March %i is %i", (year, day) => {
    expect(lastSundayOf(year, 3)).toBe(day);
  });

  const FALL: readonly [number, number][] = [
    [2020, 25],
    [2021, 31],
    [2022, 30],
    [2023, 29],
    [2024, 27],
    [2025, 26],
    [2026, 25],
    [2027, 31],
    [2028, 29],
    [2029, 28],
    [2030, 27],
  ];
  it.each(FALL)("last Sunday of October %i is %i", (year, day) => {
    expect(lastSundayOf(year, 10)).toBe(day);
  });
});

describe("dstAdjustmentMinutes — spring forward (lose 60 min)", () => {
  it("overnight shift over the Saturday before spring-forward 2026 returns -60", () => {
    // 28.03.2026 (Saturday) 22:00 → 29.03.2026 06:00 — covers 02:00 local of 29.03
    expect(dstAdjustmentMinutes("28.03.2026", "22:00", "06:00")).toBe(-60);
  });

  it("morning shift on the Sunday of spring-forward 2026 returns -60", () => {
    // 29.03.2026 00:00 → 08:00 — covers 02:00 local
    expect(dstAdjustmentMinutes("29.03.2026", "00:00", "08:00")).toBe(-60);
  });

  it("afternoon shift on the Sunday of spring-forward (after the boundary) returns 0", () => {
    expect(dstAdjustmentMinutes("29.03.2026", "08:00", "16:00")).toBe(0);
  });

  it("Saturday shift that ends BEFORE 02:00 of spring-forward returns 0", () => {
    // Ends 01:30 local on Sunday — boundary not yet crossed
    expect(dstAdjustmentMinutes("28.03.2026", "20:00", "01:30")).toBe(0);
  });

  it("works on every spring-forward year 2024-2028 with a Sat→Sun overnight shift", () => {
    expect(dstAdjustmentMinutes("30.03.2024", "22:00", "06:00")).toBe(-60);
    expect(dstAdjustmentMinutes("29.03.2025", "22:00", "06:00")).toBe(-60);
    expect(dstAdjustmentMinutes("28.03.2026", "22:00", "06:00")).toBe(-60);
    expect(dstAdjustmentMinutes("27.03.2027", "22:00", "06:00")).toBe(-60);
    expect(dstAdjustmentMinutes("25.03.2028", "22:00", "06:00")).toBe(-60);
  });
});

describe("dstAdjustmentMinutes — fall back (gain 60 min)", () => {
  it("overnight shift over the Saturday before fall-back 2026 returns +60", () => {
    // 24.10.2026 (Saturday) 22:00 → 25.10.2026 06:00 — covers 03:00 local of 25.10
    expect(dstAdjustmentMinutes("24.10.2026", "22:00", "06:00")).toBe(60);
  });

  it("morning shift on the Sunday of fall-back 2026 returns +60", () => {
    // 25.10.2026 00:00 → 08:00 — covers 03:00 local
    expect(dstAdjustmentMinutes("25.10.2026", "00:00", "08:00")).toBe(60);
  });

  it("afternoon shift on the Sunday of fall-back (after the boundary) returns 0", () => {
    expect(dstAdjustmentMinutes("25.10.2026", "12:00", "20:00")).toBe(0);
  });

  it("Saturday shift that ends BEFORE 03:00 of fall-back returns 0", () => {
    expect(dstAdjustmentMinutes("24.10.2026", "20:00", "02:30")).toBe(0);
  });
});

describe("dstAdjustmentMinutes — non-transition days", () => {
  it.each([
    ["midweek shift (Wednesday)", "01.04.2026", "08:00", "16:00"],
    ["Saturday shift not before either transition", "16.05.2026", "22:00", "06:00"],
    ["Sunday shift in midsummer", "21.06.2026", "06:00", "14:00"],
  ])("%s returns 0", (_label, date, start, end) => {
    expect(dstAdjustmentMinutes(date, start, end)).toBe(0);
  });
});

describe("dstAdjustmentMinutes — invalid input is ignored, not thrown", () => {
  it.each([
    ["empty date", "", "08:00", "16:00"],
    ["malformed date", "ab.cd.ef", "08:00", "16:00"],
    ["bad time", "01.04.2026", "ab:cd", "16:00"],
    ["year out of range", "01.04.1850", "08:00", "16:00"],
  ])("%s → 0", (_label, date, start, end) => {
    expect(dstAdjustmentMinutes(date, start, end)).toBe(0);
  });
});
